import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore, { TIER_COLORS } from '../store/useStore';

export default function ChatFeed() {
  const { chatMessages, votingOpen } = useStore();
  const listRef = useRef(null);

  // Auto-scroll to top (newest messages are at top)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [chatMessages.length]);

  return (
    <div
      id="chat-feed"
      style={{
        background: 'var(--kick-surface)',
        border: '1px solid var(--kick-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--kick-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--kick-text-muted)',
        }}>
          Live Chat
        </span>
        {votingOpen && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.68rem',
              color: 'var(--kick-green)',
              fontWeight: '600',
            }}
          >
            <span className="status-dot connected" style={{ width: '6px', height: '6px' }} />
            VOTING
          </motion.div>
        )}
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {chatMessages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'var(--kick-text-dim)',
            fontSize: '0.78rem',
          }}>
            Chat messages will appear here
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {chatMessages.map((msg, i) => (
              <motion.div
                key={`${msg.timestamp}-${msg.username}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  background: msg.tier ? `${TIER_COLORS[msg.tier]}11` : 'transparent',
                  borderLeft: msg.tier ? `2px solid ${TIER_COLORS[msg.tier]}` : '2px solid transparent',
                  paddingLeft: '6px',
                }}
              >
                {/* Username */}
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: msg.tier ? TIER_COLORS[msg.tier] : 'var(--kick-green)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  maxWidth: '90px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {msg.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--kick-text-dim)', flexShrink: 0 }}>:</span>
                {/* Message */}
                <span style={{
                  fontSize: '0.72rem',
                  color: msg.tier ? '#fff' : 'var(--kick-text-muted)',
                  fontWeight: msg.tier ? '700' : '400',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {msg.content}
                </span>
                {/* Tier badge for votes */}
                {msg.tier && (
                  <span style={{
                    marginLeft: 'auto',
                    flexShrink: 0,
                    background: TIER_COLORS[msg.tier],
                    color: ['S','A','B','C'].includes(msg.tier) ? '#000' : '#fff',
                    borderRadius: '3px',
                    padding: '0 5px',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}>
                    {msg.tier}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
