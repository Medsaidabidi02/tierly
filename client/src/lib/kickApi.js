const RAW_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
// Sanitize URL: Remove any trailing slashes to prevent double-slash 404 errors
const SERVER_URL = RAW_SERVER_URL.replace(/\/$/, '');

/**
 * Fetches the Kick chatroom ID for a given username.
 *
 * Strategy (in order):
 *  1. Direct browser fetch to kick.com — real browser passes Cloudflare naturally.
 *  2. Backend proxy — fallback if Kick adds CORS restrictions in future.
 *
 * @param {string} username
 * @returns {Promise<{ chatroomId: string, channelId: string, username: string }>}
 */
export async function fetchChatroomId(username) {
  console.log(`[kickApi] Attempting fetch for ${username}. SERVER_URL: "${SERVER_URL}"`);
  const slug = encodeURIComponent(username.trim().toLowerCase());

  // ── Strategy 1: Direct browser fetch (ONLY for localhost) ──
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocal) {
    try {
    const res = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      // Include credentials so existing Kick session cookies are sent
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      const chatroomId = data?.chatroom?.id;
      if (!chatroomId) throw new Error('Chatroom ID not found in response.');
      return {
        chatroomId: String(chatroomId),
        channelId: String(data.id),
        username: data.slug,
      };
    }

    // 404 = channel doesn't exist — surface this immediately, no need to retry
    if (res.status === 404) {
      throw new Error(`Channel "@${username}" not found on Kick. Check the username and try again.`);
    }

    // For other errors (403, 429 etc.) fall through to backend proxy
    console.warn(`[kickApi] Direct fetch returned ${res.status}, trying backend proxy…`);
  } catch (err) {
    // Re-throw clean 404 errors
    if (err.message.includes('not found')) throw err;
    // CORS error or network failure — fall through to backend
    console.warn('[kickApi] Direct fetch failed (likely CORS), trying backend proxy…', err.message);
  }
}

  // ── Strategy 2: Backend proxy ──────────────────────────────────────────────
  const proxyRes = await fetch(`${SERVER_URL}/api/chatroom/${slug}`);
  if (!proxyRes.ok) {
    const body = await proxyRes.json().catch(() => ({}));
    throw new Error(
      body.error ||
      `Both direct and proxy fetches failed (status ${proxyRes.status}). ` +
      `Kick's API may be temporarily blocking requests. Try again in a moment.`
    );
  }
  return proxyRes.json();
}
