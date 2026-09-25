import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { peopleRoutes } from './routes/people.js';
import { intelRoutes } from './routes/intel.js';
import { streamRoutes } from './routes/stream.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

app.get('/health', async () => ({
  ok: true,
  service: 'overcall-ai-server',
  mockMode: process.env.MOCK_MODE !== 'false',
  time: new Date().toISOString()
}));

await app.register(peopleRoutes);
await app.register(intelRoutes);
await app.register(streamRoutes);

const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`🚀 overcall-ai server on http://localhost:${port}`);
});
