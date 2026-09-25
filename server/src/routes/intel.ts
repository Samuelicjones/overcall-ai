import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { factCheckClaim, webSearch } from '../services/webIntel.js';
import { talkingPointsFor } from '../services/talkingPoints.js';

export async function intelRoutes(app: FastifyInstance) {
  app.post('/api/search', async (req) => {
    const { query } = z.object({ query: z.string().min(2) }).parse(req.body);
    return { results: await webSearch(query) };
  });

  app.post('/api/fact-check', async (req) => {
    const { claim } = z.object({ claim: z.string().min(4) }).parse(req.body);
    return factCheckClaim(claim);
  });

  app.post('/api/talking-points', async (req) => {
    const body = z
      .object({
        transcript: z.string().min(1),
        people: z.array(z.object({ displayName: z.string(), title: z.string().optional(), company: z.string().optional(), summary: z.string().optional() }))
      })
      .parse(req.body);
    return { points: await talkingPointsFor(body.transcript, body.people) };
  });
}
