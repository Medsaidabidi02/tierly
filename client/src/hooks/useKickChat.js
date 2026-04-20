import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

/**
 * Derives the WebSocket URL from the server URL.
 * Standardizes the URL to handle trailing slashes and secure protocols.
 */
function getWsUrl() {
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  // Remove trailing slash if present
  const cleanBase = SERVER_URL.replace(/\/$/, '');
  // Replace http with ws
  const wsBase = cleanBase.replace(/^http/, 'ws');
  // Connect to root / for maximum proxy compatibility
  return `${wsBase}/`;
}

/**
 * Manages the WebSocket connection to the KickRank backend,
 * which proxies Kick's Pusher chat stream.
 */
export function useKickChat() {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const mountedRef = useRef(true);

  const {
    chatroomId,
    connectionStatus,
    setConnectionStatus,
    registerVote,
    addChatMessage,
  } = useStore();

  const connect = useCallback(() => {
    if (!chatroomId) return;
    if (wsRef.current) {
      wsRef.current.close();
    }

    const WS_URL = getWsUrl();
    console.log(`[useKickChat] Connecting to ${WS_URL}...`);

    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[useKickChat] ✅ WebSocket Connected');
      ws.send(JSON.stringify({ type: 'connect', chatroomId }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'status') {
          if (msg.status === 'connected') setConnectionStatus('connected');
          else if (msg.status === 'subscribed') setConnectionStatus('subscribed');
          else if (msg.status === 'disconnected') setConnectionStatus('disconnected');
          else if (msg.status === 'error') setConnectionStatus('error', msg.error);
          return;
        }

        if (msg.type === 'chat') {
          addChatMessage({
            username: msg.username,
            content: msg.content,
            tier: msg.tier,
            timestamp: msg.timestamp,
          });

          if (msg.tier) {
            registerVote(msg.username, msg.tier);
          }
        }
      } catch (e) {
        console.warn('[useKickChat] Parse error:', e);
      }
    };

    ws.onerror = (err) => {
      if (!mountedRef.current) return;
      console.error('[useKickChat] ❌ WebSocket Error:', err);
      setConnectionStatus('error', 'WebSocket connection failed. Check console for details.');
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      console.log(`[useKickChat] 🔌 WebSocket Closed (code ${event.code})`);
      if (event.code !== 1000) {
        setConnectionStatus('disconnected');
        // Exponential backoff or simple 5s reconnect
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current && chatroomId) connect();
        }, 5000);
      }
    };
  }, [chatroomId, setConnectionStatus, registerVote, addChatMessage]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
      }
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  useEffect(() => {
    mountedRef.current = true;
    if (chatroomId) connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close(1000);
    };
  }, [chatroomId, connect]);

  return { connect, disconnect, connectionStatus };
}
