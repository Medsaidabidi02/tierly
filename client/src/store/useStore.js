import { create } from 'zustand';

// ─── Tier Configuration ───────────────────────────────────────────────────────
export const TIERS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export const TIER_TO_SCORE = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
export const SCORE_TO_TIER = (avg) => TIERS.slice().reverse()[Math.round(avg)]; // F=0 → index 0

export const TIER_COLORS = {
  S: '#ff6b35', A: '#ffd700', B: '#7bc67e',
  C: '#4fc3f7', D: '#9575cd', E: '#f48fb1', F: '#546e7a',
};

// Helper to load/save from localStorage
const STORAGE_KEY = 'kickrank_custom_packs';
const loadLocalPacks = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};
const saveLocalPacks = (packs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
};

// ─── Store ────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  // ── Connection state ──────────────────────────────────────────────────────
  username: '',
  chatroomId: null,
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'subscribed' | 'error'
  connectionError: null,

  // ── Pack state ────────────────────────────────────────────────────────────
  currentPack: null,       // { id, name, items: [{ id, name, imageUrl }] }
  customPacks: loadLocalPacks(), // Initialize from local storage
  packQueue: [],           // items yet to be voted on
  currentItemIndex: 0,

  // ── Voting state ──────────────────────────────────────────────────────────
  currentItem: null,       // { id, name, imageUrl }
  votingOpen: false,
  votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
  totalVotes: 0,
  voterSet: new Set(),     // Track per-session voters (username → last vote)
  voterMap: {},            // username → tier (last vote)
  averageScore: 3,         // 0-6
  leadingTier: 'C',

  // ── Tier list state ───────────────────────────────────────────────────────
  tierList: { S: [], A: [], B: [], C: [], D: [], E: [], F: [] },
  // Chat feed
  chatMessages: [],

  // ─── Actions ──────────────────────────────────────────────────────────────

  setUsername: (username) => set({ username }),
  setChatroomId: (chatroomId) => set({ chatroomId }),
  setConnectionStatus: (status, error = null) =>
    set({ connectionStatus: status, connectionError: error }),

  setPack: (pack) => {
    const items = pack.items.map((item, i) => ({ ...item, id: item.id || `item-${i}` }));
    set({
      currentPack: pack,
      packQueue: [...items],
      currentItemIndex: 0,
      currentItem: items[0] || null,
      tierList: { S: [], A: [], B: [], C: [], D: [], E: [], F: [] },
    });
  },

  nextItem: () => {
    const { packQueue, currentItemIndex } = get();
    const next = currentItemIndex + 1;
    set({
      currentItemIndex: next,
      currentItem: packQueue[next] || null,
      votingOpen: false,
      votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      totalVotes: 0,
      voterMap: {},
      averageScore: 3,
      leadingTier: 'C',
    });
  },

  openVoting: () => {
    set({
      votingOpen: true,
      votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      totalVotes: 0,
      voterMap: {},
      averageScore: 3,
      leadingTier: 'C',
    });
  },

  registerVote: (username, tier) => {
    if (!TIERS.includes(tier)) return;
    const { votes, voterMap, votingOpen } = get();
    if (!votingOpen) return;

    const newVotes = { ...votes };
    const prevVote = voterMap[username];

    if (prevVote && prevVote !== tier) {
      newVotes[prevVote] = Math.max(0, newVotes[prevVote] - 1);
    }

    if (prevVote !== tier) {
      newVotes[tier] = (newVotes[tier] || 0) + 1;
    }

    const newVoterMap = { ...voterMap, [username]: tier };
    const totalVotes = Object.values(newVotes).reduce((s, v) => s + v, 0);
    let weightedSum = 0;
    for (const [t, count] of Object.entries(newVotes)) {
      weightedSum += TIER_TO_SCORE[t] * count;
    }
    const avg = totalVotes > 0 ? weightedSum / totalVotes : 3;
    const leadingTier = SCORE_TO_TIER(avg);

    set({
      votes: newVotes,
      voterMap: newVoterMap,
      totalVotes,
      averageScore: avg,
      leadingTier,
    });
  },

  finalizeVoting: () => {
    const { currentItem, leadingTier, tierList, packQueue, currentItemIndex } = get();
    if (!currentItem || !leadingTier) return;

    const newTier = { ...tierList };
    newTier[leadingTier] = [...newTier[leadingTier], { ...currentItem, finalTier: leadingTier }];

    const next = currentItemIndex + 1;
    set({
      tierList: newTier,
      votingOpen: false,
      currentItemIndex: next,
      currentItem: packQueue[next] || null,
      votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      totalVotes: 0,
      voterMap: {},
      averageScore: 3,
      leadingTier: 'C',
    });
  },

  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [msg, ...state.chatMessages].slice(0, 100),
    }));
  },

  // ── Local-Only Custom Packs ──────────────────
  addCustomPack: (pack) => {
    const { customPacks } = get();
    const newPacks = [pack, ...customPacks];
    set({ customPacks: newPacks });
    saveLocalPacks(newPacks);
  },

  deletePack: (packId) => {
    const { customPacks } = get();
    const newPacks = customPacks.filter(p => p.id !== packId);
    set({ customPacks: newPacks });
    saveLocalPacks(newPacks);
  },

  resetAll: () => set({
    currentPack: null,
    packQueue: [],
    currentItemIndex: 0,
    currentItem: null,
    votingOpen: false,
    votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    totalVotes: 0,
    voterMap: {},
    averageScore: 3,
    leadingTier: 'C',
    tierList: { S: [], A: [], B: [], C: [], D: [], E: [], F: [] },
    chatMessages: [],
  }),
}));

export default useStore;
