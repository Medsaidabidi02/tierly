require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. ADVANCED REQUEST SNIFFER & CORS HARDENING
app.use((req, res, next) => {
  const origin = req.headers.origin || 'none';
  const method = req.method;
  const url = req.originalUrl || req.url;
  const host = req.headers.host;
  
  // VERBOSE LOGGING for Railway Console
  console.log(`[INCOMING REQUEST] ${method} ${url} | Host: ${host} | Origin: ${origin}`);

  // Brute-force CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

app.use(express.json());

// 2. ROOT ROUTE: Verification helper
app.get('/', (req, res) => {
  res.json({ message: '🚀 KickRank Server Online', debug: { port: PORT, node: process.version } });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => res.send('OK'));

// ─── REST: Get chatroom ID for a Kick username ────────────────────────────────
app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const fetchUrl = `https://kick.com/api/v2/channels/${username}`;
    console.log(`[Kick API Fetch] Starting for: ${username} -> ${fetchUrl}`);

    const response = await globalThis.fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
      },
    });

    if (response.status === 404) {
      console.warn(`[Kick API] Channel @${username} not found (404)`);
      return res.status(404).json({ error: `Channel "@${username}" not found on Kick.` });
    }

    if (!response.ok) {
      console.error(`[Kick API] Blocked: Status ${response.status}`);
      return res.status(response.status).json({ error: "Kick API blocked the server request. Try again later." });
    }

    const data = await response.json();
    const chatroomId = data?.chatroom?.id;
    if (!chatroomId) {
      console.error(`[Kick API] No chatroomId in payload for ${username}`);
      return res.status(404).json({ error: 'Could not find chatroom ID for this user.' });
    }

    console.log(`[Kick API Success] chatroomId: ${chatroomId} for ${username}`);
    res.json({ chatroomId: String(chatroomId), channelId: String(data.id), username: data.slug });
  } catch (err) {
    console.error(`[Internal Server Error] ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// ─── CATCH-ALL 404 HANDLER (with CORS) ───────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404 NOT FOUND] ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    path: req.url,
    method: req.method,
    tip: 'Ensure your VITE_SERVER_URL in Vercel is set to your base Railway URL without a trailing slash.'
  });
});

// ─── HTTP server + WebSocket server (Manual Upgrade) ─────────────────────────
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

// Manual upgrade handling
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  console.log(`[HTTP Upgrade] ${pathname} from ${request.headers.origin}`);

  if (pathname === '/' || pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, req) => {
  console.log(`[WS Connection Open] Origin: ${req.headers.origin}`);
  clientWs.isAlive = true;
  clientWs.on('pong', heartbeat);

  let bridge = null;

  clientWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'connect' && msg.chatroomId) {
        if (bridge) bridge.disconnect();
        bridge = createKickChatBridge(msg.chatroomId, (chatMessage) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify(chatMessage));
          }
        });
        bridge.connect();
        clientWs.send(JSON.stringify({ type: 'status', status: 'connecting', chatroomId: msg.chatroomId }));
      } else if (msg.type === 'disconnect') {
        if (bridge) { bridge.disconnect(); bridge = null; }
      }
    } catch (e) {
      console.error('[WS Message Error]', e.message);
    }
  });

  clientWs.on('close', () => {
    console.log('[WS Connection Closed]');
    if (bridge) bridge.disconnect();
  });

  clientWs.on('error', (err) => {
    console.error('[WS Error]', err.message);
    if (bridge) bridge.disconnect();
  });
});

wss.on('close', () => clearInterval(interval));

// Listen on 0.0.0.0 for Railway
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 KickRank Server (Rev 3) listening on 0.0.0.0:${PORT}\n`);
});
