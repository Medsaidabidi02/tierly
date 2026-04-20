import React from 'react';
import { motion } from 'framer-motion';
import { TIER_COLORS } from '../store/useStore';

const TIER_BG = {
  S: 'rgba(255, 107, 53, 0.08)',
  A: 'rgba(255, 215, 0, 0.08)',
  B: 'rgba(123, 198, 126, 0.08)',
  C: 'rgba(79, 195, 247, 0.08)',
  D: 'rgba(149, 117, 205, 0.08)',
  E: 'rgba(244, 143, 177, 0.08)',
  F: 'rgba(84, 110, 122, 0.08)',
};

export default function TierItem({ item, tierLetter, isNew = false }) {
  return (
    <motion.div
      layout
      layoutId={`item-${item.id}`}
      initial={isNew ? { scale: 0, opacity: 0, y: -20 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: isNew ? 0.1 : 0,
      }}
      title={item.name}
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${TIER_COLORS[tierLetter]}44`,
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      {/* Fallback */}
      <div style={{
        display: 'none',
        width: '100%',
        height: '100%',
        background: TIER_BG[tierLetter],
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.5rem',
        color: 'var(--kick-text-muted)',
        textAlign: 'center',
        padding: '4px',
        fontWeight: '600',
      }}>
        {item.name}
      </div>
      {/* Name tooltip on hover */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.75)',
        fontSize: '0.5rem',
        fontWeight: '600',
        color: '#fff',
        padding: '2px 3px',
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: 0,
        transition: 'opacity 0.15s ease',
      }}
        className="tier-item-name"
      >
        {item.name}
      </div>

      {/* CSS for hover name reveal */}
      <style>{`.tier-item-name { opacity: 0; } div:hover > .tier-item-name { opacity: 1; }`}</style>
    </motion.div>
  );
}
