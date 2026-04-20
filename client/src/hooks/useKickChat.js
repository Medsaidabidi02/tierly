import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

// Derive WebSocket URL from the server URL — auto-upgrades http→ws and https→wss.
// In production, set VITE_SERVER_URL=https://your-backend.railway.app in Vercel.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const WS_URL = SERVER_URL.replace(/^http/, 'ws');


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
    votingOpen,
  } = useStore();

  const connect = useCallback(() => {
    if (!chatroomId) return;
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      // Tell the backend which chatroom to subscribe to
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
          // Add to chat feed
          addChatMessage({
            username: msg.username,
            content: msg.content,
            tier: msg.tier,
            timestamp: msg.timestamp,
          });

          // Register as a vote if valid tier
          if (msg.tier) {
            registerVote(msg.username, msg.tier);
          }
        }
      } catch (e) {
        console.warn('[useKickChat] Parse error:', e);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('error', 'WebSocket connection failed. Is the server running?');
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      if (event.code !== 1000) {
        // Unexpected close — reconnect after 5s
        setConnectionStatus('disconnected');
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current && chatroomId) connect();
        }, 5000);
      }
    };
  }, [chatroomId, setConnectionStatus, registerVote, addChatMessage]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
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
  }, [chatroomId]);

  return { connect, disconnect, connectionStatus };
}
