import React from 'react';
import { motion } from 'framer-motion';
import useStore, { TIERS, TIER_COLORS, TIER_TO_SCORE } from '../store/useStore';

export default function VoteBar() {
  const { votes, totalVotes, averageScore, leadingTier, votingOpen } = useStore();

  const scoreToTier = (avg) => {
    const rounded = Math.round(avg);
    const tiers = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
    return tiers[Math.max(0, Math.min(6, rounded))];
  };

  const currentTier = scoreToTier(averageScore);

  return (
    <div
      id="vote-bar"
      style={{
        background: 'var(--kick-surface)',
        border: '1px solid var(--kick-border)',
        borderRadius: '12px',
        padding: '14px 16px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--kick-text-muted)',
        }}>
          Live Votes
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalVotes > 0 && (
            <motion.div
              key={currentTier}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                padding: '2px 10px',
                borderRadius: '20px',
                background: TIER_COLORS[currentTier],
                color: ['S','A','B','C','D','E','F'].includes(currentTier) ? '#000' : '#fff',
                fontWeight: '800',
                fontSize: '0.8rem',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            >
              {currentTier}
            </motion.div>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--kick-text-muted)' }}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {TIERS.map((tier) => {
          const count = votes[tier] || 0;
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isLeading = tier === currentTier && totalVotes > 0;
          const color = TIER_COLORS[tier];

          return (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Tier label */}
              <div style={{
                width: '22px', height: '22px',
                borderRadius: '4px',
                background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '800',
                fontSize: '0.7rem',
                color: ['S','A','B','C','D','E','F'].includes(tier) ? '#000' : '#fff',
                flexShrink: 0,
                fontFamily: 'Space Grotesk, sans-serif',
              }}>
                {tier}
              </div>

              {/* Bar track */}
              <div style={{
                flex: 1,
                height: '8px',
                background: 'var(--kick-surface-2)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <motion.div
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  style={{
                    height: '100%',
                    background: color,
                    borderRadius: '4px',
                    boxShadow: isLeading ? `0 0 8px ${color}88` : 'none',
                    minWidth: count > 0 ? '4px' : '0',
                  }}
                />
              </div>

              {/* Count */}
              <div style={{
                width: '28px',
                textAlign: 'right',
                fontSize: '0.72rem',
                fontWeight: isLeading ? '700' : '400',
                color: isLeading ? color : 'var(--kick-text-dim)',
                flexShrink: 0,
              }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Average score indicator */}
      {totalVotes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--kick-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--kick-text-dim)' }}>
            Avg. score
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mini score bar */}
            <div style={{
              width: '80px', height: '4px',
              background: 'var(--kick-surface-3)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${(averageScore / 6) * 100}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
                style={{
                  height: '100%',
                  background: TIER_COLORS[currentTier],
                  borderRadius: '2px',
                }}
              />
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: TIER_COLORS[currentTier],
            }}>
              {averageScore.toFixed(2)} / 6
            </span>
          </div>
        </motion.div>
      )}

      {!votingOpen && totalVotes === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '8px 0 0',
          fontSize: '0.72rem',
          color: 'var(--kick-text-dim)',
        }}>
          Waiting for voting to open…
        </div>
      )}
    </div>
  );
}
