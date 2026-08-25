require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID,
  
  // ?? ?? ??
  channels: {
    tier1: process.env.TIER_1_CHANNEL_ID,
    tier2: process.env.TIER_2_CHANNEL_ID,
    tier3: process.env.TIER_3_CHANNEL_ID,
    tier4: process.env.TIER_4_CHANNEL_ID,
    log: process.env.LOG_CHANNEL_ID,
  },

  // ??? ? ??
  maxChallengeAbove: 3, // ?? 3? ??? ?? ??

  // ??? ?? ? ?? ??
  tiers: {
    1: {
      name: '1-TIER',
      capacity: 5, // 1~5? (5? ??)
      color: 0xE74C3C, // ???
      minRank: 1,
      maxRank: 5,
    },
    2: {
      name: '2-TIER',
      capacity: 8, // 6~13? (8? ??)
      color: 0xE67E22, // ???
      minRank: 6,
      maxRank: 13,
    },
    3: {
      name: '3-TIER',
      capacity: 10, // 14~23? (10? ??)
      color: 0xF1C40F, // ???
      minRank: 14,
      maxRank: 23,
    },
    4: {
      name: '4-TIER',
      capacity: Infinity, // 24?~ (???)
      color: 0x3498DB, // ???
      minRank: 24,
      maxRank: Infinity,
    }
  }
};
