import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

const DURATIONS = [
  { label: 'Manual', value: null },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
];

export default function CurrentItemSpotlight() {
  const { 
    currentItem, 
    votingOpen, 
    openVoting, 
    finalizeVoting, 
    totalVotes, 
    leadingTier, 
    packQueue, 
    currentItemIndex,
    votingTimer,
    timerActive,
    forceFinishPack
  } = useStore();

  const [selectedDuration, setSelectedDuration] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (typeof window.html2canvas === 'undefined') {
      alert('Export tool is still loading, please wait a second...');
      return;
    }
    
    setIsExporting(true);
    const element = document.getElementById('tier-list-container');
    if (!element) return;

    try {
      // Capture the element
      const canvas = await window.html2canvas(element, {
        backgroundColor: '#0a0a0a',
        scale: 2, // High quality
        logging: false,
        useCORS: true, 
        allowTaint: true,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `Tierly-List-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not generate image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentItem) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.4rem' }}>Pack Complete!</h2>
          <p style={{ color: 'var(--kick-text-dim)', fontSize: '0.85rem' }}>Your list is ready to share.</p>
        </div>
        
        <button 
          className="btn-primary"
          style={{ width: '100%', height: '50px', background: 'var(--kick-green)', color: '#000' }}
          onClick={handleDownload}
          disabled={isExporting}
        >
          {isExporting ? '📸 Capturing...' : '📥 Download List as Image'}
        </button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Step indicator */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--kick-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--kick-text-muted)', fontWeight: '600' }}>
        <span>ITEM {currentItemIndex + 1} OF {packQueue.length}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {timerActive && (
            <span style={{ color: 'var(--kick-green)', fontFamily: 'Space Grotesk', fontSize: '0.65rem' }}>
              ⏱️ {formatTime(votingTimer)}
            </span>
          )}
          <button 
            onClick={forceFinishPack}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--kick-border)', 
              color: 'var(--kick-text-muted)', 
              fontSize: '0.6rem', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            🏁 Finish List
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px', textAlign: 'center' }}>
        {/* Image Frame */}
        <div style={{ position: 'relative' }}>
          <motion.div
            key={currentItem.id}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            style={{
              width: '340px',
              height: '340px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '6px solid #fff',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
              background: '#222',
            }}
          >
            <img 
              src={currentItem.imageUrl} 
              alt={currentItem.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </motion.div>
          
          {/* Status Badge */}
          <AnimatePresence>
            {votingOpen && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  background: 'var(--kick-green)',
                  color: '#000',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '900',
                  boxShadow: '0 8px 20px rgba(83, 252, 24, 0.4)',
                }}
              >
                VOTING
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ height: '10px' }} />
      </div>

      {/* Control Footer */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--kick-border)', background: 'rgba(255,255,255,0.02)' }}>
        {!votingOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {DURATIONS.map(d => (
                  <button
                    key={d.label}
                    onClick={() => setSelectedDuration(d.value)}
                    style={{
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      background: selectedDuration === d.value ? 'var(--kick-green)' : 'var(--kick-surface-3)',
                      color: selectedDuration === d.value ? '#000' : 'var(--kick-text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    {d.label}
                  </button>
                ))}
             </div>
             <button 
               className="btn-primary" 
               style={{ width: '100%', height: '44px' }}
               onClick={() => openVoting(selectedDuration)}
             >
               🚀 Open Voting
             </button>
          </div>
        ) : (
          <button 
            className="btn-primary" 
            style={{ width: '100%', height: '44px', background: '#fff', color: '#000' }}
            onClick={finalizeVoting}
          >
            🏁 Finalize & Next
          </button>
        )}
      </div>
    </div>
  );
}
