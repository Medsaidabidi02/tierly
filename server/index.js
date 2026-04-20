require('dotenv').config();
console.log('-------------------------------------------');
console.log('🚀 SYSTEM: KICKRANK BACKEND STARTING...');
console.log('-------------------------------------------');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 1. DYNAMIC CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization', 'Accept', 'Origin']
}));

app.use((req, res, next) => {
  const origin = req.headers.origin || 'none';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${origin}`);
  next();
});

app.use(express.json());

// ─── 2. MULTI-STRATEGY CHATROOM LOOKUP ──────────────────────────────────────

async function fetchFromKick(url) {
  return globalThis.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/html, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'Referer': 'https://kick.com/',
      'Origin': 'https://kick.com',
    },
  });
}

app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  const slug = username.toLowerCase().trim();
  
  console.log(`[Lookup] Request for ${slug}...`);

  // STRATEGY A: API v2 (with Bot User-Agent)
  try {
    console.log(`[Strategy A] Trying API v2...`);
    const resKick = await fetchFromKick(`https://kick.com/api/v2/channels/${slug}`);
    if (resKick.ok) {
      const data = await resKick.json();
      const cid = data?.chatroom?.id;
      if (cid) {
        console.log(`[Strategy A] Success: ${cid}`);
        return res.json({ chatroomId: String(cid), username: data.slug });
      }
    }
  } catch (e) {
    console.warn(`[Lookup] Strategy A Error: ${e.message}`);
  }

  // STRATEGY B: HTML Scraping Fallback
  try {
    console.log(`[Strategy B] Trying HTML Scrape...`);
    const resHTML = await fetchFromKick(`https://kick.com/${slug}`);
    if (resHTML.ok) {
      const html = await resHTML.text();
      const match = html.match(/"chatroom_id":\s*(\d+)/) || html.match(/"chatroom":\{"id":(\d+)/);
      if (match && match[1]) {
        const cid = match[1];
        console.log(`[Strategy B] Success via HTML: ${cid}`);
        return res.json({ chatroomId: cid, username: slug });
      }
    }
  } catch (e) {
    console.warn(`[Lookup] Strategy B Error: ${e.message}`);
  }

  res.status(403).json({ 
    error: "Blocking in progress.",
    details: "Your server IP is being blocked. Use the 'Magic Sync' bookmarklet in the app to connect."
  });
});

// ─── 3. ROUTES ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Online', message: '🚀 KickRank Server (Stable)' }));
app.get('/health', (req, res) => res.send('OK'));

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

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
        clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
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
