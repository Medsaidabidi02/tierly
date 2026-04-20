// ─── Global Packs ─────────────────────────────────────────────────────────────
// Each pack has an id, name, description, and items [] with { id, name, imageUrl }

export const GLOBAL_PACKS = [
  {
    id: 'global-popular-games',
    name: '🔥 Popular Games',
    description: 'The most popular games right now',
    items: [
      { id: 'pg-1', name: 'minecraft', imageUrl: '/src/assets/game_minecraft.png' },
      { id: 'pg-2', name: 'fortnite',  imageUrl: '/src/assets/game_fortnite.png' },
      { id: 'pg-3', name: 'gta v',     imageUrl: '/src/assets/game_gtav.png' },
      { id: 'pg-4', name: 'valorant',  imageUrl: '/src/assets/game_valorant.png' },
      { id: 'pg-5', name: 'league of legends', imageUrl: '/src/assets/game_lol.png' },
      { id: 'pg-6', name: 'apex legends', imageUrl: '/src/assets/game_apex.png' },
    ],
  },
  {
    id: 'global-streaming',
    name: '🎮 Streaming Platforms',
    description: 'Rate the biggest streaming & gaming platforms',
    items: [
      { id: 'sp-1', name: 'Kick',       imageUrl: 'https://picsum.photos/seed/kick200/200/200' },
      { id: 'sp-2', name: 'Twitch',     imageUrl: 'https://picsum.photos/seed/twitch200/200/200' },
      { id: 'sp-3', name: 'YouTube',    imageUrl: 'https://picsum.photos/seed/youtube200/200/200' },
      { id: 'sp-4', name: 'TikTok',     imageUrl: 'https://picsum.photos/seed/tiktok200/200/200' },
      { id: 'sp-5', name: 'Facebook',   imageUrl: 'https://picsum.photos/seed/facebook200/200/200' },
      { id: 'sp-6', name: 'X (Twitter)',imageUrl: 'https://picsum.photos/seed/twitter200/200/200' },
      { id: 'sp-7', name: 'Discord',    imageUrl: 'https://picsum.photos/seed/discord200/200/200' },
      { id: 'sp-8', name: 'Reddit',     imageUrl: 'https://picsum.photos/seed/reddit200/200/200' },
    ],
  },
  {
    id: 'global-fastfood',
    name: '🍔 Fast Food Chains',
    description: 'Rank the most iconic fast food restaurants',
    items: [
      { id: 'ff-1', name: "McDonald's",  imageUrl: 'https://picsum.photos/seed/mcdonalds/200/200' },
      { id: 'ff-2', name: 'Burger King', imageUrl: 'https://picsum.photos/seed/burgerking/200/200' },
      { id: 'ff-3', name: 'KFC',         imageUrl: 'https://picsum.photos/seed/kfc200/200/200' },
      { id: 'ff-4', name: "Wendy's",     imageUrl: 'https://picsum.photos/seed/wendys200/200/200' },
      { id: 'ff-5', name: 'Subway',      imageUrl: 'https://picsum.photos/seed/subway200/200/200' },
      { id: 'ff-6', name: 'Taco Bell',   imageUrl: 'https://picsum.photos/seed/tacobell/200/200' },
      { id: 'ff-7', name: 'Pizza Hut',   imageUrl: 'https://picsum.photos/seed/pizzahut/200/200' },
      { id: 'ff-8', name: "Domino's",    imageUrl: 'https://picsum.photos/seed/dominos200/200/200' },
    ],
  },
  {
    id: 'global-games-genres',
    name: '🕹️ Gaming Genres',
    description: 'Rate the most popular video game genres',
    items: [
      { id: 'gg-1', name: 'Battle Royale', imageUrl: 'https://picsum.photos/seed/battleroyale/200/200' },
      { id: 'gg-2', name: 'FPS',           imageUrl: 'https://picsum.photos/seed/fps200/200/200' },
      { id: 'gg-3', name: 'MOBA',          imageUrl: 'https://picsum.photos/seed/moba200/200/200' },
      { id: 'gg-4', name: 'RPG',           imageUrl: 'https://picsum.photos/seed/rpg200/200/200' },
      { id: 'gg-5', name: 'Sports',        imageUrl: 'https://picsum.photos/seed/sports200/200/200' },
      { id: 'gg-6', name: 'Horror',        imageUrl: 'https://picsum.photos/seed/horror200/200/200' },
      { id: 'gg-7', name: 'Strategy',      imageUrl: 'https://picsum.photos/seed/strategy200/200/200' },
      { id: 'gg-8', name: 'Survival',      imageUrl: 'https://picsum.photos/seed/survival200/200/200' },
    ],
  },
  {
    id: 'global-snacks',
    name: '🍿 Snacks & Drinks',
    description: "Rate chat's favorite snacks",
    items: [
      { id: 'sn-1', name: 'Doritos',    imageUrl: 'https://picsum.photos/seed/doritos/200/200' },
      { id: 'sn-2', name: 'Pringles',   imageUrl: 'https://picsum.photos/seed/pringles/200/200' },
      { id: 'sn-3', name: 'Red Bull',   imageUrl: 'https://picsum.photos/seed/redbull/200/200' },
      { id: 'sn-4', name: 'Monster',    imageUrl: 'https://picsum.photos/seed/monster/200/200' },
      { id: 'sn-5', name: 'Oreos',      imageUrl: 'https://picsum.photos/seed/oreos200/200/200' },
      { id: 'sn-6', name: 'Cheetos',    imageUrl: 'https://picsum.photos/seed/cheetos/200/200' },
      { id: 'sn-7', name: 'Gummy Bears',imageUrl: 'https://picsum.photos/seed/gummy200/200/200' },
      { id: 'sn-8', name: 'Pizza',      imageUrl: 'https://picsum.photos/seed/pizza200/200/200' },
    ],
  },
];
