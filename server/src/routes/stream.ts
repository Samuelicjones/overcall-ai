import type { FastifyInstance } from 'fastify';
import { talkingPointsFor } from '../services/talkingPoints.js';
import { factCheckClaim } from '../services/webIntel.js';

// WS /ws/stream — overlay pushes transcript chunks, server pushes talking points + fact-checks
// Message in:  { type:'transcript', meetingId, payload:{ speaker, text, isFinal } }
// Message out: { type:'talking-points'|'fact-check', payload }
export async function streamRoutes(app: FastifyInstance) {
  app.get('/ws/stream', { websocket: true }, (socket) => {
    let buffer = '';
    // @ts-ignore fastify-websocket types
    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          // @ts-ignore
          socket.send(JSON.stringify({ type: 'pong', payload: {} }));
          return;
        }
        if (msg.type === 'transcript' && msg.payload?.isFinal) {
          buffer += ` ${msg.payload.speaker}: ${msg.payload.text}`;
          // keep a rolling window
          buffer = buffer.slice(-3000);

          // Heuristic: every ~2 sentences, emit talking points + fact-check the last claim-like sentence
          const sentences = msg.payload.text.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
          const lastSentence = sentences[sentences.length - 1] ?? msg.payload.text;

          const points = await talkingPointsFor(buffer, []);
          // @ts-ignore
          socket.send(JSON.stringify({ type: 'talking-points', payload: points }));

          if (lastSentence.split(' ').length > 8) {
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
