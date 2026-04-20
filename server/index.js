require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. ABSOLUTE CORS & LOGGER MIDDLEWARE
// This replaces the 'cors' package with manual headers to ensure they are 
// injected into every single response, even 404s and Errors.
app.use((req, res, next) => {
  // Log incoming request to Railway console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'none'})`);

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Respond immediately to preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// 2. ROOT ROUTE: Verification helper
app.get('/', (req, res) => {
  res.send('🚀 KickRank Server Online - CORS Headers Hardened');
});

// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));

// ─── REST: Get chatroom ID for a Kick username ────────────────────────────────
app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  try {
    // 3. GLOBAL FETCH: Use globalThis.fetch for absolute compatibility with Node 18+
    const response = await globalThis.fetch(`https://kick.com/api/v2/channels/${username}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
      },
    });

    if (response.status === 404) return res.status(404).json({ error: `Channel "@${username}" not found on Kick.` });
    if (!response.ok) {
      console.error(`[Kick API Error] ${response.status} for ${username}`);
      return res.status(response.status).json({ error: "Kick API blocked the request. Try again later." });
    }

    const data = await response.json();
    const chatroomId = data?.chatroom?.id;
    if (!chatroomId) return res.status(404).json({ error: 'Could not find chatroom ID for this user.' });

    res.json({ chatroomId: String(chatroomId), channelId: String(data.id), username: data.slug });
  } catch (err) {
    console.error('[Internal Fetch Error]', err.message);
    res.status(500).json({ error: 'Server internal error: ' + err.message });
  }
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
  console.log(`[WS Connection] from ${req.headers.origin}`);
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
      console.error('[WS Msg Error]', e.message);
    }
  });

  clientWs.on('close', () => {
    console.log('[WS Disconnected]');
    if (bridge) bridge.disconnect();
  });

  clientWs.on('error', (err) => {
    console.error('[WS Error]', err.message);
    if (bridge) bridge.disconnect();
  });
});

wss.on('close', () => clearInterval(interval));

// Bind to 0.0.0.0 for Railway
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 KickRank Server listening on 0.0.0.0:${PORT}`);
});
