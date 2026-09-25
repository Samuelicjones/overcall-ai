import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { peopleRoutes } from './routes/people.js';
import { intelRoutes } from './routes/intel.js';
import { streamRoutes } from './routes/stream.js';
import { providerStatus } from './services/llm.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

app.setErrorHandler((err: Error, _req, reply) => {
  app.log.error(err);
  reply.status(500).send({ error: 'internal error', message: err.message });
});

app.get('/health', async () => ({
  ok: true,
  service: 'overcall-ai-server',
  version: '0.2.0',
  ...providerStatus(),
  time: new Date().toISOString()
}));

await app.register(peopleRoutes);
await app.register(intelRoutes);
await app.register(streamRoutes);

const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  const s = providerStatus();
  console.log(`🚀 overcall-ai server on http://localhost:${port}`);
  console.log(`   LLM: ${s.provider} (${s.model})${s.mockMode ? ' — add GEMINI_API_KEY for AI' : ''}`);
});
