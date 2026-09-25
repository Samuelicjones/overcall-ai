import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { factCheckClaim, webSearch } from '../services/webIntel.js';
import { talkingPointsFor } from '../services/talkingPoints.js';
import { meetingBrief } from '../services/brief.js';
import { providerStatus } from '../services/llm.js';

const PersonSchema = z.object({
  displayName: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  summary: z.string().optional()
});

export async function intelRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => providerStatus());

  app.post('/api/search', async (req, reply) => {
    const parsed = z.object({ query: z.string().min(2) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'query must be 2+ chars' });
    return { results: await webSearch(parsed.data.query) };
  });

  app.post('/api/fact-check', async (req, reply) => {
    const parsed = z.object({ claim: z.string().min(4) }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'claim must be 4+ chars' });
    return factCheckClaim(parsed.data.claim);
  });

  app.post('/api/talking-points', async (req, reply) => {
    const parsed = z
      .object({ transcript: z.string().min(1), people: z.array(PersonSchema).default([]) })
      .safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'transcript required' });
    return { points: await talkingPointsFor(parsed.data.transcript, parsed.data.people) };
  });

  app.post('/api/brief', async (req, reply) => {
    const parsed = z
      .object({ transcript: z.string().min(1), people: z.array(PersonSchema).default([]) })
      .safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'transcript required' });
    return meetingBrief(parsed.data.transcript, parsed.data.people);
  });
}
