import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import TierList from './components/TierList';
import CurrentItemSpotlight from './components/CurrentItemSpotlight';
import VoteBar from './components/VoteBar';
import ChatFeed from './components/ChatFeed';
import SetupModal from './components/SetupModal';
import PackSelector from './components/PackSelector';
import { useKickChat } from './hooks/useKickChat';
import { useDemoSimulator } from './hooks/useDemoSimulator';
import useStore from './store/useStore';

// ─── Spin keyframe injection ──────────────────────────────────────────────────
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

export default function App() {
  const [showSetup, setShowSetup] = useState(false);
  const [showPacks, setShowPacks] = useState(false);
  const { chatroomId, currentPack, connectionStatus } = useStore();

  // Connect to Kick chat (or no-op if no chatroomId)
  useKickChat();

  // Demo mode auto-votes
  useDemoSimulator();

  const isConnected = connectionStatus === 'subscribed' || connectionStatus === 'connected';
  const isDemoMode = chatroomId === 'DEMO';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--kick-black)',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <Header onSetupClick={() => setShowSetup(true)} />

      {/* ── Main Content ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        gap: '12px',
        padding: '12px',
        minHeight: 0,
      }}>

        {/* ── LEFT: Tier List ── */}
        <div style={{
          flex: '1 1 0',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflow: 'hidden',
        }}>
          {/* Tier list header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--kick-text-muted)',
            }}>
              Tier List
            </span>
            <button
              id="select-pack-btn"
              className="btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setShowPacks(true)}
            >
              {currentPack ? `📦 ${currentPack.name}` : '+ Select Pack'}
            </button>
          </div>

          <TierList />
        </div>

        {/* ── CENTER: Current Item Spotlight ── */}
        <div style={{
          width: '280px',
          minWidth: '280px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--kick-surface)',
          border: '1px solid var(--kick-border)',
          borderRadius: '12px',
        }}>
          {/* No pack selected overlay */}
          {!currentPack ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '2.5rem' }}>🎯</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '700', marginBottom: '6px', fontFamily: 'Space Grotesk, sans-serif' }}>
                  No Pack Selected
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--kick-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Choose a pack of items for your chat to rate
                </div>
                <button
                  id="get-started-pack-btn"
                  className="btn-primary"
                  onClick={() => setShowPacks(true)}
                >
                  Select a Pack
                </button>
              </div>
            </div>
          ) : !chatroomId ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '700', marginBottom: '6px', fontFamily: 'Space Grotesk, sans-serif' }}>
                  Connect Chat
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--kick-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Enter your Kick username to sync chat votes
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowSetup(true)}
                >
                  Connect Chat
                </button>
              </div>
            </div>
          ) : (
            <CurrentItemSpotlight />
          )}
        </div>

        {/* ── RIGHT: Vote Bar + Chat Feed ── */}
        <div style={{
          width: '220px',
          minWidth: '220px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          overflow: 'hidden',
        }}>
          <VoteBar />
          <ChatFeed />
        </div>
      </div>

      {/* ── No connection warning banner ── */}
      {!chatroomId && !showSetup && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26,26,26,0.95)',
          border: '1px solid var(--kick-border)',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          zIndex: 50,
        }}>
          <span style={{ color: 'var(--kick-text-muted)' }}>
            👋 Welcome to <strong style={{ color: 'var(--kick-text)' }}>KickRank</strong>
          </span>
          <button
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.78rem' }}
            onClick={() => setShowSetup(true)}
          >
            Get Started
          </button>
        </div>
      )}

      {/* ── Demo mode indicator ── */}
      {isDemoMode && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '12px',
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.4)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.72rem',
          color: '#ffd700',
          fontWeight: '600',
          zIndex: 50,
        }}>
          🎮 Demo Mode — Simulated votes
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showSetup && (
          <SetupModal onClose={() => setShowSetup(false)} />
        )}
        {showPacks && (
          <PackSelector onClose={() => setShowPacks(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
