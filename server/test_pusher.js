/**
 * Quick diagnostic: connects to maaatr1x's Pusher channel and logs every event
 * received for 20 seconds. Run: node test_pusher.js
 * 
 * INSTRUCTIONS: Have someone type in kick.com/maaatr1x chat while this runs.
 */
const WebSocket = require('ws');

const CHATROOM_ID = process.argv[2] || '11106526'; // default to maaatr1x
const PUSHER_KEY  = '32cbd69e4b950bf97679';
const URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;

console.log(`\n🔍 Diagnosing Pusher for chatroom ${CHATROOM_ID}`);
console.log(`🔗 ${URL}\n`);

const ws = new WebSocket(URL, {
  headers: { 'Origin': 'https://kick.com' },
});

let subscribed = false;

ws.on('open', () => console.log('✅ WebSocket open\n'));

ws.on('message', (raw) => {
  let msg;
  try { msg = JSON.parse(raw.toString()); }
  catch (e) { console.log('❌ Parse error:', raw.toString().slice(0,100)); return; }

  const event = msg.event;

  // Parse double-encoded data
  let data = msg.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) {}
  }

  if (event === 'pusher:pong') { process.stdout.write('.'); return; }

  console.log(`\n📨 EVENT: "${event}"`);

  if (event === 'pusher:connection_established') {
    console.log(`   socket_id: ${data?.socket_id}`);
    const channel = `chatrooms.${CHATROOM_ID}.v2`;
    console.log(`\n→ Subscribing to: ${channel}`);
    ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel } }));
    return;
  }

  if (event === 'pusher_internal:subscription_succeeded') {
    console.log(`✅ SUBSCRIBED — now send chat messages in the channel!`);
    subscribed = true;
    return;
  }

  if (event === 'pusher:error') {
    console.error('❌ PUSHER ERROR:', JSON.stringify(data));
    return;
  }

  // Print everything else in full so we can see the structure
  console.log(`   DATA: ${JSON.stringify(data, null, 2).slice(0, 600)}`);
});

ws.on('error', (e) => console.error('❌ WS Error:', e.message));
ws.on('close', (code) => console.log(`\n🔌 Closed (code ${code})`));

// Stop after 30 seconds
setTimeout(() => {
  console.log('\n\n⏱  30s elapsed — closing. Check output above for event names.');
  ws.close();
  process.exit(0);
}, 30000);
