import type { FastifyInstance } from 'fastify';
import { talkingPointsFor } from '../services/talkingPoints.js';
import { factCheckClaim } from '../services/webIntel.js';

// WS /ws/stream — overlay pushes transcript chunks, server pushes talking points + fact-checks.
// In:  { type:'transcript'|'roster'|'ping', meetingId, payload }
// Out: { type:'talking-points'|'fact-check'|'people-update'|'status'|'pong', payload }
export async function streamRoutes(app: FastifyInstance) {
  app.get('/ws/stream', { websocket: true }, (socket) => {
    let buffer = '';
    let peopleCtx: { displayName: string; title?: string; company?: string; summary?: string }[] = [];
    let lastInference = 0;
    let factChecksThisMinute = 0;
    let minuteStart = Date.now();

    // @ts-ignore fastify-websocket types
    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'ping') {
          // @ts-ignore
          socket.send(JSON.stringify({ type: 'pong', payload: {} }));
          return;
        }

        if (msg.type === 'roster' && Array.isArray(msg.payload?.people)) {
          peopleCtx = msg.payload.people;
          // @ts-ignore
          socket.send(JSON.stringify({ type: 'status', payload: { ok: true, people: peopleCtx.length } }));
          return;
        }

        if (msg.type === 'transcript' && msg.payload?.text) {
          const { speaker = 'Them', text = '', isFinal = true } = msg.payload;
          if (isFinal) {
            buffer += ` ${speaker}: ${text}`;
            buffer = buffer.slice(-4000);
          } else {
            return; // ignore interim to save LLM calls
          }

          // Throttle: at most 1 inference / 4s
          const now = Date.now();
          if (now - lastInference < 4000) return;
          lastInference = now;

          // Reset per-minute fact-check budget
          if (now - minuteStart > 60_000) {
            minuteStart = now;
            factChecksThisMinute = 0;
          }

          const points = await talkingPointsFor(buffer, peopleCtx);
          // @ts-ignore
          socket.send(JSON.stringify({ type: 'talking-points', payload: points }));

          const sentences = text.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
          const lastSentence = sentences[sentences.length - 1] ?? text;
          // Only fact-check substantive claims, max 3/min
          if (lastSentence.split(' ').length >= 8 && factChecksThisMinute < 3) {
            factChecksThisMinute++;
            const fc = await factCheckClaim(lastSentence);
            // @ts-ignore
            socket.send(JSON.stringify({ type: 'fact-check', payload: fc }));
          }
        }
      } catch (err) {
        app.log.error(err);
      }
    });
  });
}
