require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. HARDENED CORS: Move to the very top and handle preflight explicitly
// This ensures that even if a route crashes, the CORS headers are sent.
app.use(cors({
  origin: '*', // For public voting, allow all. You can restrict to [origin1, origin2] later.
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS preflight requests specifically
app.options('*', cors());

app.use(express.json());

// 2. ROOT ROUTE: Verification helper
app.get('/', (req, res) => {
  res.send('🚀 KickRank Server Online');
});

// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));

// ─── REST: Get chatroom ID for a Kick username ────────────────────────────────
app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  try {
    // 3. NATIVE FETCH: Node 18+ has a built-in global fetch. Faster & more stable.
    const response = await fetch(`https://kick.com/api/v2/channels/${username}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
      },
    });

    if (response.status === 404) return res.status(404).json({ error: `Channel "@${username}" not found.` });
    if (!response.ok) return res.status(response.status).json({ error: "Kick API blocked the request." });

    const data = await response.json();
    const chatroomId = data?.chatroom?.id;
    if (!chatroomId) return res.status(404).json({ error: 'No chatroom found.' });

    res.json({ chatroomId: String(chatroomId), channelId: String(data.id), username: data.slug });
  } catch (err) {
    console.error('[chatroom error]', err.message);
    res.status(500).json({ error: err.message });
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
  console.log(`[HTTP] Upgrade request for ${pathname} from ${request.headers.origin}`);

  if (pathname === '/' || pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, req) => {
  console.log(`[WS] Client connected from ${req.headers.origin}`);
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
      console.error('[WS parse error]', e.message);
    }
  });

  clientWs.on('close', () => {
    console.log('[WS] Client disconnected');
    if (bridge) bridge.disconnect();
  });

  clientWs.on('error', (err) => {
    console.error('[WS client error]', err.message);
    if (bridge) bridge.disconnect();
  });
});

wss.on('close', () => clearInterval(interval));

// Bind to 0.0.0.0 for Railway
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 KickRank server listening on 0.0.0.0:${PORT}`);
});
