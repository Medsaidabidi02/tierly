require('dotenv').config();
console.log('-------------------------------------------');
console.log('🚀 SYSTEM: TIERLY BACKEND STARTING...');
console.log('-------------------------------------------');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { createKickChatBridge } = require('./kickProxy');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── 1. SUPABASE CLIENT (DYNAMICS) ──────────────────────────────────────────
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

if (supabase) console.log('✅ Supabase connected (Collective Cache enabled)');
else console.log('⚠️ Supabase not configured (Running without cache)');

// ─── 2. DYNAMIC CORS ────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── 3. MULTI-STRATEGY CHATROOM LOOKUP ──────────────────────────────────────

async function fetchFromKick(url) {
  return globalThis.fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/html, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'Referer': 'https://kick.com/',
    },
  });
}

app.get('/api/chatroom/:username', async (req, res) => {
  const { username } = req.params;
  const slug = username.toLowerCase().trim();
  
  // STRATEGY 0: Supabase Cache
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('streamer_cache')
        .select('chatroom_id')
        .eq('username', slug)
        .single();
      
      if (data?.chatroom_id) {
        console.log(`[Cache] Success for ${slug}: ${data.chatroom_id}`);
        return res.json({ chatroomId: data.chatroom_id, username: slug });
      }
    } catch (e) { /* ignore cache miss */ }
  }

  // STRATEGY A: API v2
  try {
    const resKick = await fetchFromKick(`https://kick.com/api/v2/channels/${slug}`);
    if (resKick.ok) {
      const data = await resKick.json();
      const cid = data?.chatroom?.id;
      if (cid) {
        if (supabase) await supabase.from('streamer_cache').upsert({ username: slug, chatroom_id: String(cid) });
        return res.json({ chatroomId: String(cid), username: data.slug });
      }
    }
  } catch (e) {}

  // STRATEGY B: HTML Scraping
  try {
    const resHTML = await fetchFromKick(`https://kick.com/${slug}`);
    if (resHTML.ok) {
      const html = await resHTML.text();
      const match = html.match(/"chatroom_id":\s*(\d+)/);
      if (match && match[1]) {
        if (supabase) await supabase.from('streamer_cache').upsert({ username: slug, chatroom_id: match[1] });
        return res.json({ chatroomId: match[1], username: slug });
      }
    }
  } catch (e) {}

  res.status(403).json({ error: "Blocking in progress. Use Magic Sync." });
});

// ─── 4. ROUTES ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Online', message: '🚀 Tierly Server' }));
app.get('/health', (req, res) => res.send('OK'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (clientWs) => {
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
      }
    } catch (e) {}
  });
  clientWs.on('close', () => { if (bridge) bridge.disconnect(); });
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Tierly listening on ${PORT}`));
