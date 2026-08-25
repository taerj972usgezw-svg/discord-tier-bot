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
  return '- ' + user.nickname + ' (' + user.realname + ') / ' + user.style;
}

async function renderTierChannel(client, tierNumber) {
  const channelId = config.channels['tier' + tierNumber];
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const allUsers = db.getAllUsers();
  const tierConfig = config.tiers[tierNumber];

  const tierUsers = allUsers.filter(u => {
    const uTier = getTierByRank(u.rank);
    return uTier === tierNumber;
  });

  const capacityText = tierNumber === 4 ? tierUsers.length + '\uBA85' : tierUsers.length + '/' + tierConfig.capacity + '\uBA85';
  
  let contentList = '';
  if (tierUsers.length === 0) {
    contentList = '*\uB4F1\uB85D\uB41C \uC778\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.*';
  } else {
    contentList = tierUsers.map(u => {
      return u.rank + '\uB4F1 | ' + formatUserLine(u) + '  *(\uC804\uC801: ' + u.wins + '\uC2B9 ' + u.losses + '\uD328)*';
    }).join('\n');
  }

  const embed = new EmbedBuilder()
    .setTitle('\uD83C\uDFC6 [ ' + tierConfig.name + ' ] \uC21C\uC704\uD45C (\uC815\uC6D0: ' + capacityText + ')')
    .setDescription(contentList)
    .setColor(tierConfig.color)
    .setFooter({ text: '\uB9C8\uC9C0\uB9C9 \uAC31\uC2E0: ' + new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) });

  const savedMsgData = db.getTierMessage(tierNumber);
  let updated = false;

  if (savedMsgData) {
    try {
      const oldMsg = await channel.messages.fetch(savedMsgData.message_id).catch(() => null);
      if (oldMsg) {
        await oldMsg.edit({ embeds: [embed] });
        updated = true;
      }
    } catch (e) {}
  }

  if (!updated) {
    try {
      const newMsg = await channel.send({ embeds: [embed] });
      db.saveTierMessage(tierNumber, newMsg.id, channel.id);
    } catch (err) {}
  }
}

async function updateAllTierChannels(client) {
  for (let t = 1; t <= 4; t++) {
    try {
      await renderTierChannel(client, t);
    } catch (err) {}
  }
}

module.exports = {
  getTierByRank,
  formatUserLine,
  renderTierChannel,
  updateAllTierChannels
};
