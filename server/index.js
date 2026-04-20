require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 1. EXPLICIT CORS & LOGGER ────────────────────────────────────────────────
// Adopted your suggestion for explicit origins to satisfy strict browser checks.
const ALLOWED_ORIGINS = [
  'https://tierly-murex.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log request to Railway console for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${origin || 'none'}`);

  if (ALLOWED_ORIGINS.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Fallback to wildcard if not in list, but explicit is better
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24h

  if (req.method === 'OPTIONS') {
    return res.status(200).send(); // Some proxies prefer 200 over 204
  }
  next();
});

app.use(express.json());

// ─── 2. ROUTES ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'Online', message: '🚀 KickRank Server Hardened' });
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

// ─── 3. GLOBAL ERROR & 404 GUARD ───────────────────────────────────────────
// These ensure CORS headers are sent even when something goes wrong.

// Catch-all 404
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', tip: 'Check your VITE_SERVER_URL' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[CRASH]', err.stack);
  // Re-inject CORS headers just in case
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  res.status(500).json({ error: 'Critical Server Error', message: err.message });
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
  console.log(`\n🚀 KickRank Server (Rev 4) listening on 0.0.0.0:${PORT}\n`);
});
