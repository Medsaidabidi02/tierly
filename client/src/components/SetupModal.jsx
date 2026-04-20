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
      const { chatroomId } = await fetchChatroomId(u, manualId);
      setUsername(u);
      setChatroomId(chatroomId);
      setConnectionStatus('connecting');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to connect. Kick might be blocking the server.');
      if (err.message?.includes('403') || err.message?.includes('Blocking')) {
        setShowManual(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const bookmarkletCode = `javascript:(function(){const m=document.body.innerHTML.match(/"chatroom_id":(\\d+)/);if(m){const u=window.location.pathname.replace("/","");window.location.href="https://tierly-murex.vercel.app/?chatroomId="+m[1]+"&u="+u;}else{alert("Go to your Kick Channel Page first!")}})();`;

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
          className="glass-card"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
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
                Connect Chat
              </h2>
            </div>
            <p style={{ color: 'var(--kick-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Enter your username or use the Magic Sync.
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

            {/* Error + Magic Sync UI */}
            <AnimatePresence>
              {(error || showManual) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
                   <div style={{ 
                     background: 'rgba(5, 255, 116, 0.05)', 
                     border: '1px solid var(--kick-green-30)', 
                     borderRadius: '12px', 
                     padding: '16px',
                     marginTop: '4px'
                   }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--kick-green)' }}>✨ Magic Sync (100% Stable)</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--kick-text-muted)', margin: '0 0 12px', lineHeight: '1.4' }}>
                        Drag this button to your bookmarks bar. Then go to your Kick page and click it!
                      </p>
                      
                      <a 
                        href={bookmarkletCode}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', bookmarkletCode)}
                        style={{
                          display: 'inline-block',
                          padding: '10px 20px',
                          background: 'var(--kick-green)',
                          color: '#000',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          cursor: 'move',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        🖱️ DRAG ME TO BOOKMARKS
                      </a>

                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px', color: 'var(--kick-text-muted)' }}>Or enter Chatroom ID manually:</label>
                        <input 
                          className="kick-input" 
                          style={{ fontSize: '0.8rem' }}
                          placeholder="e.g. 1234567" 
                          value={manualId} 
                          onChange={e => setManualId(e.target.value)}
                        />
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" disabled={loading || !inputVal.trim()} style={{ flex: 1 }}>
                {loading ? 'Connecting…' : (manualId ? 'Connect with ID' : 'Connect Chat')}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>

          {!showManual && !error && (
            <button 
              onClick={() => setShowManual(true)}
              style={{ background: 'none', border: 'none', color: 'var(--kick-text-dim)', fontSize: '0.7rem', cursor: 'pointer', marginTop: '12px', textDecoration: 'underline' }}
            >
              Can't connect? Use Magic Sync
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
