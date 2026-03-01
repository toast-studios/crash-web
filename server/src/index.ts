// === HeatWave PvP — Server Entry Point ===

import http from 'http';
import { URL } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { logger } from './utils/logger';
import { verifyToken } from './auth/supabase';
import { ConnectionManager } from './ws/ConnectionManager';
import { MessageHandler } from './ws/MessageHandler';
import { GameRoomManager } from './game/GameRoomManager';
import { MatchmakingService } from './matchmaking/MatchmakingService';
import { initRedis, closeRedis, getSupabaseAdmin } from './db/supabaseClient';

async function main() {
  // Initialize Redis
  const redis = initRedis();

  // Core services
  const connections = new ConnectionManager();
  const roomManager = new GameRoomManager(connections);
  const matchmaking = new MatchmakingService(connections, roomManager, redis);
  const messageHandler = new MessageHandler(connections, matchmaking, roomManager);

  // Handle full disconnects (grace period expired)
  connections.onPlayerDisconnect = (userId, roomId) => {
    matchmaking.removeFromQueue(userId).catch(err => {
      logger.error({ userId, err }, 'Failed to remove from queue on disconnect');
    });
    if (roomId) {
      roomManager.handlePlayerDisconnect(userId, roomId);
    }
  };

  // HTTP server with health check and signup endpoint
  const server = http.createServer((req, res) => {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        connections: connections.getOnlineCount(),
        rooms: roomManager.getActiveRoomCount(),
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // Signup endpoint — creates user with auto-confirmed email
    if (req.url === '/api/signup' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { email, password } = JSON.parse(body);
          if (!email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email and password required' }));
            return;
          }

          const supabase = getSupabaseAdmin();
          const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

          if (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
            return;
          }

          logger.info({ userId: data.user.id, email }, 'User signed up');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ user_id: data.user.id }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // Buffer messages that arrive during async auth verification
    const pendingMessages: string[] = [];
    let authenticated = false;
    let userId: string | null = null;

    // Register message listener immediately to avoid losing messages
    ws.on('message', (data) => {
      const raw = data.toString();
      if (!authenticated || !userId) {
        pendingMessages.push(raw);
        return;
      }
      messageHandler.handleMessage(userId, raw).catch(err => {
        logger.error({ userId, err }, 'Unhandled message error');
      });
    });

    // Handle errors early
    ws.on('error', (err) => {
      logger.error({ userId: userId ?? 'unknown', err }, 'WebSocket error');
    });

    // Async auth flow
    (async () => {
      // Extract token from query string
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Missing auth token');
        return;
      }

      // Verify JWT
      const user = await verifyToken(token);
      if (!user) {
        ws.close(4001, 'Invalid auth token');
        return;
      }

      userId = user.id;
      const displayName = user.email?.split('@')[0] ?? 'Player';

      // Register connection
      connections.register(ws, userId, displayName);

      // Handle pong for heartbeat
      ws.on('pong', () => {
        connections.markAlive(userId!);
      });

      // Handle close — pass `ws` so ConnectionManager can ignore stale sockets
      ws.on('close', () => {
        connections.handleDisconnect(userId!, ws);
      });

      // Mark as authenticated and flush buffered messages
      authenticated = true;
      for (const raw of pendingMessages) {
        messageHandler.handleMessage(userId, raw).catch(err => {
          logger.error({ userId, err }, 'Unhandled message error');
        });
      }
      pendingMessages.length = 0;
    })().catch(err => {
      logger.error({ err }, 'Connection setup error');
      ws.close(4002, 'Internal error');
    });
  });

  // Start services
  connections.start();
  matchmaking.start();

  // Start server
  server.listen(config.port, () => {
    logger.info({ port: config.port }, 'HeatWave PvP server started');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    matchmaking.stop();
    connections.stop();
    roomManager.destroyAll();
    wss.close();
    server.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
