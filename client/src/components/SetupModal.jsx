import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchChatroomId } from '../lib/kickApi';
import useStore from '../store/useStore';

export default function SetupModal({ onClose }) {
  const { username: savedUsername, setUsername, setChatroomId, setConnectionStatus } = useStore();
  const [inputVal, setInputVal] = useState(savedUsername || '');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async (e) => {
    e.preventDefault();
    const u = inputVal.trim().replace(/^@/, '');
    if (!u) return;

    setLoading(true);
    setError(null);
    try {
      // Pass manualId if the user provided it, otherwise it attempts auto-lookup
      const { chatroomId } = await fetchChatroomId(u, manualId);
      
      setUsername(u);
      setChatroomId(chatroomId);
      setConnectionStatus('connecting');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to connect. Check the username and try again.');
      // If we get a 403 or generic failure, suggest the manual mode
      if (err.message?.includes('403') || err.message?.includes('blocking')) {
        setShowManual(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    setUsername('demo_streamer');
    setChatroomId('DEMO');
    setConnectionStatus('subscribed');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          id="setup-modal"
          className="glass-card"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '440px', padding: '32px' }}
        >
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px', background: 'var(--kick-green)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', fontSize: '16px', color: '#000',
              }}>K</div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700', fontSize: '1.4rem', margin: 0 }}>
                Connect Your Chat
              </h2>
            </div>
            <p style={{ color: 'var(--kick-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Sync your live chat with KickRank.
            </p>
          </div>

          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--kick-text-muted)', marginBottom: '6px' }}>
                Kick Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--kick-green)', fontWeight: '600' }}>@</span>
                <input
                  type="text" className="kick-input" style={{ paddingLeft: '28px' }}
                  placeholder="your_username" value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)} disabled={loading}
                />
              </div>
            </div>

            {/* Manual ID Section (shown if error or user toggles it) */}
            <AnimatePresence>
              {showManual && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '4px 0 12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--kick-green)', marginBottom: '8px' }}>
                      ⚡ Fallback: Manual Chatroom ID
                    </label>
                    <input
                      type="text" className="kick-input"
                      placeholder="e.g. 1234567" value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      style={{ borderColor: 'var(--kick-green)' }}
                    />
                    <p style={{ fontSize: '0.65rem', color: 'var(--kick-text-dim)', marginTop: '8px', lineHeight: '1.4' }}>
                      <strong>How to find it:</strong> Open your Kick channel page → Press <strong>F12</strong> → <strong>Network</strong> tab → Refresh → Search for "chatroom" → Look for <code>id: 1234567</code> in the Response.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#ff7777' }}
                >
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" disabled={loading || !inputVal.trim()} style={{ flex: 1 }}>
                {loading ? 'Connecting…' : (showManual && manualId ? 'Connect with ID' : 'Connect Chat')}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>

          {!showManual && (
            <button 
              onClick={() => setShowManual(true)}
              style={{ background: 'none', border: 'none', color: 'var(--kick-text-dim)', fontSize: '0.7rem', cursor: 'pointer', marginTop: '12px', textDecoration: 'underline' }}
            >
              Can't connect? Enter ID manually
            </button>
          )}

          <div style={{ margin: '20px 0 12px', textAlign: 'center', position: 'relative' }}>
            <div style={{ height: '1px', background: 'var(--kick-border)', position: 'absolute', top: '50%', left: 0, right: 0 }} />
            <span style={{ position: 'relative', background: 'var(--kick-surface)', padding: '0 12px', fontSize: '0.75rem', color: 'var(--kick-text-dim)' }}>or</span>
          </div>

          <button className="btn-secondary" style={{ width: '100%', textAlign: 'center' }} onClick={handleDemoMode}>
            🎮 Try Demo Mode
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
