require('dotenv').config();
console.log('-------------------------------------------');
console.log('🚀 SYSTEM: KICKRANK BACKEND STARTING...');
console.log('-------------------------------------------');
const express = require('express');
const cors = require('cors'); // Re-introduced
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 1. STANDARD CORS CONFIG ───────────────────────────────────────────────
// Using the recommended 'cors' package for production-grade reliability.
app.use(cors({
  origin: 'https://tierly-murex.vercel.app', // Explicit production origin
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization', 'Accept', 'Origin']
}));

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Host: ${req.headers.host}`);
  next();
});

app.use(express.json());

// ─── 2. ROUTES ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'Online', message: '🚀 KickRank Server (Standard CORS)' });
});

app.get('/health', (req, res) => res.send('OK'));

app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const fetchUrl = `https://kick.com/api/v2/channels/${username}`;
    const response = await globalThis.fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
      },
    });

    if (response.status === 404) return res.status(404).json({ error: `Channel "@${username}" not found.` });
    if (!response.ok) return res.status(response.status).json({ error: "Kick API blocked the request." });

    const data = await response.json();
    const chatroomId = data?.chatroom?.id;
    if (!chatroomId) return res.status(404).json({ error: 'Chatroom not found.' });

    res.json({ chatroomId: String(chatroomId), channelId: String(data.id), username: data.slug });
  } catch (err) {
    console.error(`[Fetch Error] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. ERROR HANDLERS ──────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.url}`);
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER CRASH]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ─── 4. SERVER & WEBSOCKETS ────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

function heartbeat() { this.isAlive = true; }
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  if (pathname === '/' || pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, req) => {
  clientWs.isAlive = true;
  clientWs.on('pong', heartbeat);
  let bridge = null;

  clientWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'connect' && msg.chatroomId) {
        if (bridge) bridge.disconnect();
        bridge = createKickChatBridge(msg.chatroomId, (chatMsg) => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify(chatMsg));
        });
        bridge.connect();
        clientWs.send(JSON.stringify({ type: 'status', status: 'connecting' }));
      } else if (msg.type === 'disconnect') {
        if (bridge) { bridge.disconnect(); bridge = null; }
      }
    } catch (e) {
      console.error('[WS Error]', e.message);
    }
  });

  clientWs.on('close', () => { if (bridge) bridge.disconnect(); });
});

wss.on('close', () => clearInterval(interval));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 KickRank Server listening on 0.0.0.0:${PORT}\n`);
});
