import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function PackSelector({ onClose }) {
  const { setPack, customPacks, officialPacks, fetchGlobalPacks } = useStore();
  const [tab, setTab] = useState('global'); // 'global' | 'custom'

  useEffect(() => {
    fetchGlobalPacks();
  }, [fetchGlobalPacks]);

  const handleSelect = (pack) => {
    setPack(pack);
    onClose();
  };

  const renderPacks = (packs) => {
    if (packs.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--kick-text-dim)', fontSize: '0.875rem' }}>
          No packs found in this gallery yet.
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {packs.map((pack) => (
          <motion.button
            key={pack.id}
            whileHover={{ scale: 1.02, borderColor: 'var(--kick-green)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(pack)}
            style={{
              background: 'var(--kick-surface-2)',
              border: '1px solid var(--kick-border)',
              borderRadius: '10px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s ease',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
               {pack.is_official ? '⭐' : '📦'} {pack.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--kick-text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
              {pack.description || 'Global tier list pack.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.72rem', color: 'var(--kick-green)', fontWeight: '600' }}>
                 {pack.items?.length || 0} items
               </span>
               <span style={{ fontSize: '0.6rem', color: 'var(--kick-text-dim)' }}>
                 {pack.is_official ? 'Official' : 'Community'}
               </span>
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 999 }}>
      <motion.div
        id="pack-selector-modal"
        className="glass-card"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid var(--kick-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>
              Shared Gallery
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--kick-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
            {[
              ['global', '⭐ Official Packs'],
              ['custom', '🌍 Community Packs']
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: tab === key ? '2px solid var(--kick-green)' : '2px solid transparent',
                  color: tab === key ? 'var(--kick-green)' : 'var(--kick-text-muted)',
                  fontWeight: tab === key ? '600' : '400',
                  padding: '8px 16px', cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'global' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'global' ? 10 : -10 }}
            >
              {tab === 'global' ? renderPacks(officialPacks) : renderPacks(customPacks)}
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--kick-border)', background: 'var(--kick-surface-2)', textAlign: 'center' }}>
           <p style={{ fontSize: '0.7rem', color: 'var(--kick-text-dim)', margin: 0 }}>
             Want to create your own? Press <kbd style={{ background: '#333', padding: '2px 4px', borderRadius: '4px' }}>Shift + A</kbd> for Creator Mode.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
