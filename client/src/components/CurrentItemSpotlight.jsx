import React, { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import useStore, { TIER_COLORS, TIER_TO_SCORE } from '../store/useStore';

// Direction each tier "pulls" the image (normalized x, y offsets)
const TIER_GRAVITY = {
  S: { x: 0,   y: -1  },   // up
  A: { x: 0.5, y: -0.8 },  // up-right
  B: { x: 0.8, y: -0.3 },  // right
  C: { x: 0,   y: 0   },   // center (C = baseline)
  D: { x: -0.5, y: 0.5 },  // down-left
  E: { x: -0.5, y: 0.8 },  // down
  F: { x: 0,   y: 1   },   // far down
};

export default function CurrentItemSpotlight() {
  const { currentItem, votingOpen, votes, totalVotes, averageScore, leadingTier, finalizeVoting, openVoting, packQueue, currentItemIndex } = useStore();
  const controls = useAnimation();
  const [prevLeading, setPrevLeading] = useState(null);

  const remainingCount = packQueue.length - currentItemIndex - 1;
  const hasMoreItems = remainingCount > 0;

  // ── Gravity/jitter effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!votingOpen || totalVotes === 0) {
      controls.start({ x: 0, y: 0, rotate: 0 });
      return;
    }

    const gravity = TIER_GRAVITY[leadingTier] || { x: 0, y: 0 };

    // Confidence = how dominant is the leading tier? (0-1)
    const leadingCount = votes[leadingTier] || 0;
    const confidence = totalVotes > 0 ? leadingCount / totalVotes : 0;

    // Pull strength: scales with confidence and total votes (max 18px pull)
    const pullStrength = Math.min(confidence * 22, 22);
    const jitterStrength = Math.max(3 - confidence * 3, 0.5);

    const sequence = async () => {
      await controls.start({
        x: gravity.x * pullStrength + (Math.random() - 0.5) * jitterStrength,
        y: gravity.y * pullStrength + (Math.random() - 0.5) * jitterStrength,
        rotate: (Math.random() - 0.5) * jitterStrength * 0.5,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      });
    };

    sequence();
    setPrevLeading(leadingTier);
  }, [leadingTier, totalVotes, votingOpen, JSON.stringify(votes)]);

  // ── Tier color for border glow ───────────────────────────────────────────────
  const tierColor = leadingTier ? TIER_COLORS[leadingTier] : 'var(--kick-border)';

  if (!currentItem) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '20px',
      }}>
        <div style={{ fontSize: '3rem', opacity: 0.3 }}>🏆</div>
        <div style={{ color: 'var(--kick-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
          {packQueue.length === 0
            ? 'Select a pack to get started'
            : 'All items have been ranked!'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 12px',
      gap: '16px',
      overflow: 'hidden',
    }}>

      {/* Progress indicator */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--kick-text-muted)',
      }}>
        <span>Item {currentItemIndex + 1} of {packQueue.length}</span>
        <span style={{ color: 'var(--kick-green)' }}>{remainingCount} remaining</span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: '3px',
        background: 'var(--kick-surface-3)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '-10px',
      }}>
        <motion.div
          style={{ height: '100%', background: 'var(--kick-green)', borderRadius: '2px' }}
          animate={{ width: `${((currentItemIndex) / packQueue.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* The main animated image */}
      <motion.div
        id="current-item-spotlight"
        layout
        animate={controls}
        style={{
          position: 'relative',
          flex: '0 0 auto',
        }}
      >
        <motion.div
          animate={{
            borderColor: votingOpen && totalVotes > 0 ? tierColor : 'rgba(255,255,255,0.1)',
            boxShadow: votingOpen && totalVotes > 0
              ? `0 0 30px ${tierColor}44, 0 0 60px ${tierColor}22`
              : '0 4px 24px rgba(0,0,0,0.4)',
          }}
          transition={{ duration: 0.4 }}
          style={{
            width: '200px',
            height: '200px',
            borderRadius: '16px',
            border: '2px solid',
            overflow: 'hidden',
            background: 'var(--kick-surface-2)',
          }}
          className={votingOpen ? 'voting-active-border' : ''}
        >
          <img
            src={currentItem.imageUrl}
            alt={currentItem.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%', height: '100%',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--kick-surface-3)',
            color: 'var(--kick-text-muted)',
            fontSize: '0.75rem',
          }}>
            No Image
          </div>
        </motion.div>

        {/* Tier badge overlay when voting */}
        <AnimatePresence>
          {votingOpen && totalVotes > 0 && leadingTier && (
            <motion.div
              key={leadingTier}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: tierColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '0.9rem',
                color: ['S', 'A', 'B', 'C'].includes(leadingTier) ? '#000' : '#fff',
                boxShadow: `0 0 12px ${tierColor}88`,
              }}
            >
              {leadingTier}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Item name */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: '700',
          fontSize: '1.3rem',
          margin: 0,
          color: 'var(--kick-text)',
        }}>
          {currentItem.name}
        </h2>
        {votingOpen && totalVotes > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '4px',
              fontSize: '0.8rem',
              color: tierColor,
              fontWeight: '600',
            }}
          >
            Chat leans {leadingTier} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
        {!votingOpen ? (
          <motion.button
            id="open-voting-btn"
            className="btn-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openVoting}
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            🗳 Open Voting
          </motion.button>
        ) : (
          <motion.button
            id="finalize-btn"
            className="btn-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={finalizeVoting}
            style={{
              padding: '12px 28px',
              fontSize: '0.95rem',
              background: totalVotes > 0 ? tierColor : undefined,
              color: totalVotes > 0 && ['S','A','B','C'].includes(leadingTier) ? '#000' : undefined,
            }}
          >
            ✓ Finalize → {leadingTier}
          </motion.button>
        )}
      </div>

      {/* Voting hint */}
      {votingOpen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: '0.72rem',
            color: 'var(--kick-text-dim)',
            textAlign: 'center',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Chat is typing S / A / B / C / D / E / F…<br />
          Each viewer's last vote counts.
        </motion.p>
      )}
    </div>
  );
}
