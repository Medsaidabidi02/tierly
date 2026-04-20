import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import TierRow from './TierRow';
import useStore, { TIERS } from '../store/useStore';

export default function TierList() {
  const { tierList, leadingTier, votingOpen, totalVotes } = useStore();

  return (
    <div
      id="tier-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '4px 2px',
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
