import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { enrichPerson } from '../services/peopleResolver.js';

const EnrichSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  companyHint: z.string().optional()
});

export async function peopleRoutes(app: FastifyInstance) {
  // POST /api/people/enrich — resolve one participant to a PersonProfile
  app.post('/api/people/enrich', async (req, reply) => {
    const parsed = EnrichSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const profile = await enrichPerson(parsed.data);
    return profile;
  });

  // POST /api/people/batch — enrich a whole roster at meeting start
  app.post('/api/people/batch', async (req) => {
    const body = z.object({ participants: z.array(EnrichSchema) }).parse(req.body);
    return {
      people: await Promise.all(body.participants.map((p) => enrichPerson(p)))
    };
  });
}
