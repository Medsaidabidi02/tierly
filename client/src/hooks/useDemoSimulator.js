import { useEffect, useRef } from 'react';
import useStore, { TIERS } from '../store/useStore';

const FAKE_USERS = ['StreamerFan99', 'KickLord', 'xXGamerXx', 'NotABot', 'ChillVibes',
  'TopTierOnly', 'FanOfS', 'AlwaysF', 'MidTierKing', 'VoterOne', 'VoteBot2k',
  'RandomDude', 'ChatPerson', 'TierJudge', 'CriticalEye'];

/**
 * In demo mode (chatroomId === 'DEMO'), simulates chat votes automatically.
 * Fires a random vote every 0.4–1.5 seconds when voting is open.
 */
export function useDemoSimulator() {
  const { chatroomId, votingOpen, registerVote, addChatMessage } = useStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (chatroomId !== 'DEMO' || !votingOpen) {
      clearInterval(intervalRef.current);
      return;
    }

    const fire = () => {
      const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
      // Bias towards mid-high tiers for a realistic distribution
      const weights = [8, 14, 12, 10, 7, 5, 4]; // S, A, B, C, D, E, F
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let tier = 'C';
      for (let i = 0; i < TIERS.length; i++) {
        r -= weights[i];
        if (r <= 0) { tier = TIERS[i]; break; }
      }

      const msg = { username: user, content: tier, tier, timestamp: Date.now() };
      addChatMessage(msg);
      registerVote(user, tier);
    };

    const schedule = () => {
      const delay = 400 + Math.random() * 1100;
      intervalRef.current = setTimeout(() => {
        fire();
        if (votingOpen) schedule();
      }, delay);
    };

    schedule();

    return () => clearTimeout(intervalRef.current);
  }, [chatroomId, votingOpen]);
}
