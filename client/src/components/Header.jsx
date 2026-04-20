import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

const STATUS_LABELS = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  subscribed: 'Live',
  error: 'Error',
};

export default function Header({ onSetupClick }) {
  const { username, connectionStatus, currentPack } = useStore();

  return (
    <header
      id="kickrank-header"
      style={{
        background: 'var(--kick-surface)',
        borderBottom: '1px solid var(--kick-border)',
        padding: '0 20px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {/* Kick-style logo mark */}
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--kick-green)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '14px', color: '#000',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>K</div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: '700',
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: 'var(--kick-text)',
          }}>
            Kick<span style={{ color: 'var(--kick-green)' }}>Rank</span>
          </span>
        </motion.div>

        {currentPack && (
          <div style={{
            marginLeft: '12px',
            padding: '2px 10px',
            background: 'var(--kick-surface-2)',
            border: '1px solid var(--kick-border)',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: 'var(--kick-text-muted)',
          }}>
            {currentPack.name}
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className={`status-dot ${connectionStatus === 'subscribed' ? 'connected' : connectionStatus}`}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--kick-text-muted)' }}>
            {username
              ? `@${username} · ${STATUS_LABELS[connectionStatus] || connectionStatus}`
              : 'Not connected'}
          </span>
        </div>

        {/* Setup button */}
        <button
          id="header-setup-btn"
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          onClick={onSetupClick}
        >
          {username ? '⚙ Settings' : 'Connect Chat'}
        </button>
      </div>
    </header>
  );
}
