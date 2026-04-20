import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import TierRow from './TierRow';
import useStore, { TIERS } from '../store/useStore';

export default function TierList() {
  const { tierList, leadingTier, votingOpen, totalVotes } = useStore();

  return (
    <div
      id="tier-list-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '12px',
        backgroundColor: '#0a0a0a',
        borderRadius: '12px'
      }}
    >
      <LayoutGroup>
        {TIERS.map((tier) => (
          <TierRow
            key={tier}
            tier={tier}
            items={tierList[tier] || []}
            isHighlighted={votingOpen && totalVotes > 0 && leadingTier === tier}
          />
        ))}
      </LayoutGroup>
    </div>
  );
}
