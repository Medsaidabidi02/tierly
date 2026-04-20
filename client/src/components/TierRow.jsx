import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TierItem from './TierItem';
import { TIER_COLORS } from '../store/useStore';

const TIER_BG = {
  S: 'rgba(255, 107, 53, 0.06)',
  A: 'rgba(255, 215, 0, 0.06)',
  B: 'rgba(123, 198, 126, 0.06)',
  C: 'rgba(79, 195, 247, 0.06)',
  D: 'rgba(149, 117, 205, 0.06)',
  E: 'rgba(244, 143, 177, 0.06)',
  F: 'rgba(84, 110, 122, 0.06)',
};

const LABEL_TEXT_COLOR = {
  S: '#000', A: '#000', B: '#000', C: '#000', D: '#000', E: '#000', F: '#000',
};

export default function TierRow({ tier, items, isHighlighted }) {
  const scrollRef = useRef(null);

  return (
    <motion.div
      layout
      animate={{
        borderColor: isHighlighted ? `${TIER_COLORS[tier]}88` : 'var(--kick-border)',
        boxShadow: isHighlighted ? `0 0 16px ${TIER_COLORS[tier]}22` : 'none',
      }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid',
        borderColor: 'var(--kick-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: '72px',
        background: isHighlighted ? TIER_BG[tier] : 'var(--kick-surface)',
      }}
    >
      {/* Tier label */}
      <div
        className={`tier-label-${tier.toLowerCase()}`}
        style={{
          width: '48px',
          minWidth: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: '800',
          fontSize: '1.3rem',
          color: LABEL_TEXT_COLOR[tier],
          letterSpacing: '-0.03em',
          flexShrink: 0,
        }}
      >
        {tier}
      </div>

      {/* Items area */}
      <div
        ref={scrollRef}
        className="tier-items-scroll"
        style={{
          flex: 1,
          padding: '6px 8px',
          minHeight: '72px',
          alignContent: 'center',
        }}
      >
        <AnimatePresence>
          {items.length === 0 ? (
            <span style={{
              color: ['S','A','B','C','D','E','F'].includes(tier) ? '#000' : '#fff',
              fontSize: '0.72rem',
              fontStyle: 'italic',
              padding: '0 4px',
              alignSelf: 'center',
            }}>
              empty
            </span>
          ) : (
            items.map((item, i) => (
              <TierItem
                key={item.id}
                item={item}
                tierLetter={tier}
                isNew={i === items.length - 1}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Item count badge */}
      {items.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: '10px',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: '700',
            color: TIER_COLORS[tier],
            background: `${TIER_COLORS[tier]}18`,
            padding: '2px 7px',
            borderRadius: '20px',
          }}>
            {items.length}
          </span>
        </div>
      )}
    </motion.div>
  );
}
