import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { networkInterfaces } from 'os';
import { config } from './config.js';
import { registerHandlers } from './handlers/index.js';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const corsOrigin = config.clientUrl || true; // true = allow all origins in production
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Serve static client build in production
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

registerHandlers(io);

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${config.port}`);
  const nets = Object.values(networkInterfaces()).flat();
  const localIp = nets.find(n => n && n.family === 'IPv4' && !n.internal);
  if (localIp) {
    console.log(`Local network: http://${localIp.address}:${config.port}`);
  }
});
