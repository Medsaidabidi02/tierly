const WebSocket = require('ws');

// ─── Kick's Pusher configuration ──────────────────────────────────────────────
// If messages stop coming, check the current key by opening kick.com DevTools →
// Network → WS tab, and look for a connection to pusher.com.
const PUSHER_KEY = process.env.KICK_PUSHER_KEY || '32cbd69e4b950bf97679';
const PUSHER_WS_URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;

const VALID_TIERS = new Set(['S', 'A', 'B', 'C', 'D', 'E', 'F']);

// Set to true for verbose per-message logging
const DEBUG = true;

function createKickChatBridge(chatroomId, onMessage) {
  let ws = null;
  let pingInterval = null;
  let reconnectTimeout = null;
  let shouldReconnect = true;

  function connect() {
    if (ws) ws.terminate();

    console.log(`\n[Bridge] ── Connecting ─────────────────────────────────`);
    console.log(`[Bridge] Pusher URL: ${PUSHER_WS_URL}`);
    console.log(`[Bridge] Chatroom  : ${chatroomId}`);
    console.log(`[Bridge] Channel   : chatrooms.${chatroomId}.v2`);

    ws = new WebSocket(PUSHER_WS_URL, {
      headers: {
        'Origin': 'https://kick.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    ws.on('open', () => {
      console.log('[Bridge] ✅ WebSocket OPEN — waiting for pusher:connection_established');
      pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
          if (DEBUG) console.log('[Bridge] → ping');
        }
      }, 25000);
    });

    ws.on('message', (raw) => {
      const rawStr = raw.toString();

      // ── Parse outer envelope ────────────────────────────────────────────────
      let msg;
      try {
        msg = JSON.parse(rawStr);
      } catch (e) {
        console.error('[Bridge] ❌ Failed to parse Pusher frame:', rawStr.slice(0, 200));
        return;
      }

      const event = msg.event;

      // ── Parse inner data field (Pusher double-encodes it as a JSON string) ──
      let data = msg.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (_) {
          // data is a plain string (e.g. for error messages), leave it as-is
        }
      }

      if (DEBUG) {
        console.log(`[Bridge] ← EVENT: "${event}"`);
      }

      // ── Handle events ───────────────────────────────────────────────────────

      if (event === 'pusher:connection_established') {
        const socketId = data?.socket_id;
        console.log(`[Bridge] ✅ Connected — socket_id: ${socketId}`);
        subscribe();
        onMessage({ type: 'status', status: 'connected', chatroomId });
        return;
      }

      if (event === 'pusher_internal:subscription_succeeded') {
        console.log(`[Bridge] ✅ Subscribed to chatrooms.${chatroomId}.v2`);
        onMessage({ type: 'status', status: 'subscribed', chatroomId });
        return;
      }

      if (event === 'pusher:error') {
        console.error('[Bridge] ❌ Pusher error:', JSON.stringify(data));
        onMessage({ type: 'status', status: 'error', error: `Pusher: ${JSON.stringify(data)}` });
        return;
      }

      if (event === 'pusher:pong') {
        if (DEBUG) console.log('[Bridge] ← pong');
        return;
      }

      // ── Chat message events — log the exact event name so we know what Kick sends ──
      const isChatEvent =
        event === 'App\\Events\\ChatMessageEvent' ||        // ← current Kick event name
        event === 'App\\Events\\ChatMessageSent' ||         // ← older name (kept for safety)
        event === 'App\\Events\\Chatroom\\MessageSent' ||   // ← another older variant
        event.toLowerCase().includes('chat') ||
        event.toLowerCase().includes('message');

      if (isChatEvent) {
        console.log(`[Bridge] 💬 Chat event: "${event}"`);
        if (DEBUG) console.log('[Bridge] 💬 Data:', JSON.stringify(data).slice(0, 300));
        handleChatMessage(data);
        return;
      }

      // ── Unknown events — log them so we can identify new event names ──────────
      console.log(`[Bridge] ℹ️  Unknown event: "${event}" | data: ${JSON.stringify(data).slice(0, 150)}`);
    });

    ws.on('close', (code, reason) => {
      console.log(`[Bridge] 🔌 Connection CLOSED — code: ${code}, reason: ${reason?.toString() || 'none'}`);
      clearInterval(pingInterval);
      if (shouldReconnect) {
        console.log('[Bridge] ♻️  Reconnecting in 5s…');
        reconnectTimeout = setTimeout(connect, 5000);
      }
      onMessage({ type: 'status', status: 'disconnected', chatroomId });
    });

    ws.on('error', (err) => {
      console.error('[Bridge] ❌ WebSocket ERROR:', err.message);
      onMessage({ type: 'status', status: 'error', error: err.message });
    });
  }

  function subscribe() {
    const channel = `chatrooms.${chatroomId}.v2`;
    console.log(`[Bridge] → Subscribing to channel: ${channel}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: { auth: '', channel },
      }));
    }
  }

  function handleChatMessage(data) {
    try {
      // Try different field paths Kick has used in different API versions
      const username =
        data?.sender?.username ||
        data?.sender?.slug ||
        data?.user?.username ||
        data?.chatter?.username ||
        'unknown';

      const content = (
        data?.content ||
        data?.message ||
        data?.text ||
        ''
      ).trim();

      const upperContent = content.toUpperCase().trim();
      const isTierVote = VALID_TIERS.has(upperContent);

      if (isTierVote) {
        console.log(`[Bridge] 🗳  VOTE: ${username} → ${upperContent}`);
      }

      onMessage({
        type: 'chat',
        username,
        content,
        tier: isTierVote ? upperContent : null,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('[Bridge] Error parsing chat message:', e.message);
      console.error('[Bridge] Raw data was:', JSON.stringify(data).slice(0, 300));
    }
  }

  function disconnect() {
    shouldReconnect = false;
    clearInterval(pingInterval);
    clearTimeout(reconnectTimeout);
    if (ws) {
      ws.terminate();
      ws = null;
    }
    console.log(`[Bridge] Disconnected from chatroom ${chatroomId}`);
  }

  return { connect, disconnect };
}

module.exports = { createKickChatBridge };
