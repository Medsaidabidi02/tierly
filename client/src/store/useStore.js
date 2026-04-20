import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Tier Configuration ───────────────────────────────────────────────────────
export const TIERS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export const TIER_TO_SCORE = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
export const SCORE_TO_TIER = (avg) => TIERS.slice().reverse()[Math.round(avg)];

export const TIER_COLORS = {
  S: '#ff8080', A: '#ffbf80', B: '#ffdf80',
  C: '#ffdf80', D: '#bfff80', E: '#bfff80', F: '#bfff80',
};

// ─── Store ────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  // ── Connection state ──────────────────────────────────────────────────────
  username: '',
  chatroomId: null,
  connectionStatus: 'disconnected',
  connectionError: null,

  // ── Pack state ────────────────────────────────────────────────────────────
  currentPack: null,
  customPacks: [],      // Community packs fetched from DB
  officialPacks: [],    // Official packs fetched from DB
  packQueue: [],
  currentItemIndex: 0,

  // ── Voting state ──────────────────────────────────────────────────────────
  currentItem: null,
  votingOpen: false,
  votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
  totalVotes: 0,
  voterMap: {},
  averageScore: 3,
  leadingTier: 'C',
  
  // ── Timer State ─────────────────────────────────────────────────────────
  votingTimer: null,     // Current countdown value (seconds)
  timerActive: false,

  // ── Tier list state ───────────────────────────────────────────────────────
  tierList: { S: [], A: [], B: [], C: [], D: [], E: [], F: [] },
  chatMessages: [],

  // ─── Actions ──────────────────────────────────────────────────────────────

  setUsername: (username) => set({ username }),
  setChatroomId: (chatroomId) => set({ chatroomId }),
  setConnectionStatus: (status, error = null) =>
    set({ connectionStatus: status, connectionError: error }),

  fetchGlobalPacks: async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('packs')
        .select(`
          id, name, description, created_at, is_official,
          items:pack_items(id, name, imageUrl:image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformed = (data || []).map(p => ({
        ...p,
        items: (p.items || []).sort((a,b) => a.position - b.position).map(it => ({
          id: it.id,
          name: it.name,
          imageUrl: it.imageUrl
        }))
      }));

      set({ 
        officialPacks: transformed.filter(p => p.is_official),
        customPacks: transformed.filter(p => !p.is_official)
      });
    } catch (e) {
      console.warn('DB Fetch failed:', e.message);
    }
  },

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
      timerActive: false,
      votingTimer: null
    });
  },

  openVoting: (duration) => {
    set({
      votingOpen: true,
      votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      totalVotes: 0,
      voterMap: {},
      averageScore: 3,
      leadingTier: 'C',
      votingTimer: duration || null,
      timerActive: !!duration
    });
  },

  decrementTimer: () => {
    const { votingTimer, timerActive } = get();
    if (!timerActive || votingTimer === null) return;

    if (votingTimer <= 1) {
      set({ votingTimer: 0, timerActive: false });
      get().finalizeVoting();
    } else {
      set({ votingTimer: votingTimer - 1 });
    }
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
      timerActive: false,
      votingTimer: null
    });
  },

  forceFinishPack: () => {
    set({
      currentItem: null,
      currentItemIndex: get().packQueue.length,
      votingOpen: false,
      votes: { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      totalVotes: 0,
      voterMap: {},
      timerActive: false,
      votingTimer: null
    });
  },

  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [msg, ...state.chatMessages].slice(0, 100),
    }));
  },

  // Deleted all local save logic as we are switching to global DB flow
  deletePack: async (packId) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('packs').delete().eq('id', packId);
      if (error) throw error;
      get().fetchGlobalPacks();
    } catch (e) {
      console.error('Delete failed:', e.message);
    }
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
    timerActive: false,
    votingTimer: null
  }),
}));

export default useStore;
