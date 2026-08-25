const { EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');

function getTierByRank(rank) {
  if (rank >= 1 && rank <= 5) return 1;
  if (rank >= 6 && rank <= 13) return 2;
  if (rank >= 14 && rank <= 23) return 3;
  return 4;
}

function formatUserLine(user) {
  return `- ${user.nickname} (${user.realname}) / ${user.style}`;
}

async function renderTierChannel(client, tierNumber) {
  const channelId = config.channels[`tier${tierNumber}`];
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.warn(`[TierRenderer] ${tierNumber}?? ??(${channelId})? ?? ? ????.`);
    return;
  }

  const allUsers = db.getAllUsers();
  const tierConfig = config.tiers[tierNumber];

  const tierUsers = allUsers.filter(u => {
    const uTier = getTierByRank(u.rank);
    return uTier === tierNumber;
  });

  const capacityText = tierNumber === 4 ? `${tierUsers.length}?` : `${tierUsers.length}/${tierConfig.capacity}?`;
  
  let contentList = '';
  if (tierUsers.length === 0) {
    contentList = '*??? ??? ????.*';
  } else {
    contentList = tierUsers.map(u => {
      return `${u.rank}? | ${formatUserLine(u)}  *(??: ${u.wins}? ${u.losses}?)*`;
    }).join('\n');
  }

  const embed = new EmbedBuilder()
    .setTitle(`?? [ ${tierConfig.name} ] ??? (??: ${capacityText})`)
    .setDescription(contentList)
    .setColor(tierConfig.color)
    .setFooter({ text: `??? ??: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` });

  const savedMsgData = db.getTierMessage(tierNumber);
  let updated = false;

  if (savedMsgData) {
    try {
      const oldMsg = await channel.messages.fetch(savedMsgData.message_id).catch(() => null);
      if (oldMsg) {
        await oldMsg.edit({ embeds: [embed] });
        updated = true;
      }
    } catch (e) {
      console.error('?? ??? ?? ?? (?? ?????):', e.message);
    }
  }

  if (!updated) {
    try {
      const newMsg = await channel.send({ embeds: [embed] });
      db.saveTierMessage(tierNumber, newMsg.id, channel.id);
    } catch (err) {
      console.error(`[TierRenderer] ${tierNumber}?? ??? ??? ?? ??:`, err.message);
    }
  }
}

async function updateAllTierChannels(client) {
  for (let t = 1; t <= 4; t++) {
    try {
      await renderTierChannel(client, t);
    } catch (err) {
      console.error(`?? ${t} ??? ? ?? ??:`, err.message);
    }
  }
}

module.exports = {
  getTierByRank,
  formatUserLine,
  renderTierChannel,
  updateAllTierChannels
};
