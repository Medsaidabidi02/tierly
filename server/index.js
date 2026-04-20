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
// Cloudflare often blocks API v2, so we try v1 or HTML scraping as fallbacks.

async function fetchFromKick(url) {
  return globalThis.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/html, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://kick.com/',
      'Origin': 'https://kick.com',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  });
}

app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  const slug = username.toLowerCase().trim();
  
  console.log(`[Lookup] Searching for chatroom ID for ${slug}...`);

  // Strategy A: API v2
  try {
    console.log(`[Strategy A] Trying API v2...`);
    const resV2 = await fetchFromKick(`https://kick.com/api/v2/channels/${slug}`);
    if (resV2.ok) {
      const data = await resV2.json();
      if (data?.chatroom?.id) {
        console.log(`[Strategy A] Success! Found ID: ${data.chatroom.id}`);
        return res.json({ chatroomId: String(data.chatroom.id), channelId: String(data.id), username: data.slug });
      }
    }
    console.warn(`[Strategy A] Failed with status: ${resV2.status}`);
  } catch (e) {
    console.warn(`[Strategy A] Error: ${e.message}`);
  }

  // Strategy B: API v1
  try {
    console.log(`[Strategy B] Trying API v1...`);
    const resV1 = await fetchFromKick(`https://kick.com/api/v1/channels/${slug}`);
    if (resV1.ok) {
      const data = await resV1.json();
      if (data?.chatroom?.id) {
        console.log(`[Strategy B] Success! Found ID: ${data.chatroom.id}`);
        return res.json({ chatroomId: String(data.chatroom.id), channelId: String(data.id), username: data.slug });
      }
    }
    console.warn(`[Strategy B] Failed with status: ${resV1.status}`);
  } catch (e) {
    console.warn(`[Strategy B] Error: ${e.message}`);
  }

  // Strategy C: HTML Scraping Fallback
  // Sometimes Cloudflare blocks APIs but allows raw HTML channel page
  try {
    console.log(`[Strategy C] Trying HTML Scrape...`);
    const resHTML = await fetchFromKick(`https://kick.com/${slug}`);
    if (resHTML.ok) {
      const html = await resHTML.text();
      // Look for chatroom_id in the window.app_state or __NEXT_DATA__
      const match = html.match(/"chatroom_id":\s*(\d+)/) || html.match(/"chatroom":\{"id":(\d+)/);
      if (match && match[1]) {
        console.log(`[Strategy C] Success! Found ID via Regex: ${match[1]}`);
        return res.json({ chatroomId: match[1], username: slug });
      }
    }
    console.warn(`[Strategy C] Failed with status: ${resHTML.status}`);
  } catch (e) {
    console.warn(`[Strategy C] Error: ${e.message}`);
  }

  // If all failed, return the 403 or 404
  res.status(403).json({ 
    error: "Kick is blocking the server request (Cloudflare 403).",
    details: "Your server IP on Railway is likely flagged. Use the 'Enter ID Manually' fallback in the setup box."
  });
});

// ─── 3. ROUTES & WEBHOOKS ───────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Online', message: '🚀 KickRank Server (Multi-Strategy)' }));
app.get('/health', (req, res) => res.send('OK'));

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

app.use((err, req, res, next) => {
  console.error('[CRASH]', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
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
  console.log(`[WS] Open | Origin: ${req.headers.origin || 'none'}`);
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
  console.log(`\n🚀 KickRank Server (Multi-Strategy) listening on 0.0.0.0:${PORT}\n`);
});
