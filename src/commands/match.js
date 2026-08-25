const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank, updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('도전 경기 결과를 제출합니다.')
    .addUserOption(opt =>
      opt.setName('opponent')
        .setDescription('도전 상대 유저')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('outcome')
        .setDescription('나의 경기 결과')
        .setRequired(true)
        .addChoices(
          { name: '승리 (도전 성공)', value: 'win' },
          { name: '패배 (도전 실패)', value: 'loss' }
        )
    ),

  async execute(interaction) {
    const challengerId = interaction.user.id;
    const defenderUser = interaction.options.getUser('opponent');
    const result = interaction.options.getString('outcome');

    if (challengerId === defenderUser.id) {
      return interaction.reply({ content: '❌ 자기 자신과의 경기는 등록할 수 없습니다.', ephemeral: true });
    }

    const challenger = db.getUserById(challengerId);
    const defender = db.getUserById(defenderUser.id);

    if (!challenger) {
      return interaction.reply({ content: '❌ 먼저 `/register` 명령어로 순위표에 등록해주세요.', ephemeral: true });
    }
    if (!defender) {
      return interaction.reply({ content: '❌ 상대방(' + defenderUser.username + ')이 순위표에 등록되어 있지 않습니다.', ephemeral: true });
    }

    const cRank = challenger.rank;
    const dRank = defender.rank;

    if (cRank > dRank) {
      const rankDiff = cRank - dRank;
      if (rankDiff > config.maxChallengeAbove) {
        return interaction.reply({
          content: '❌ 규칙 위반: 최대 **' + config.maxChallengeAbove + '등 위**의 유저에게만 도전할 수 있습니다.\n' +
                   '현재 나의 순위: **' + cRank + '등** | 상대방 순위: **' + dRank + '등** (차이: ' + rankDiff + '등)',
          ephemeral: true
        });
      }
    }

    let summaryText = '';
    const logEmbed = new EmbedBuilder().setTimestamp();

    if (result === 'win') {
      const changeResult = db.applyLadderWin(challengerId, defender.id);
      
      if (changeResult.rankChanged) {
        const newTier = getTierByRank(changeResult.challengerNewRank);
        summaryText = '🔥 **[도전 성공]** <@' + challengerId + '>님이 <@' + defender.id + '>님을 상대로 승리하여 **' + changeResult.challengerNewRank + '등**(' + newTier + '-TIER)으로 상승했습니다!\n' +
                      '(기존 ' + changeResult.challengerOldRank + '등 -> ' + changeResult.challengerNewRank + '등, 피도전자 및 사이 유저 1등씩 밀림)';
      } else {
        summaryText = '✅ <@' + challengerId + '>님이 승리했습니다. (순위 변동 없음)';
      }

      logEmbed.setTitle('⚔️ 경기 결과 신고 (승리)')
        .setDescription(summaryText)
        .setColor(0x2ECC71);
    } else {
      db.applyLadderLoss(challengerId, defender.id, challengerId);
      summaryText = '🛡️ **[도전 실패]** <@' + challengerId + '>님이 <@' + defender.id + '>님에게 패배하였습니다. (순위 변동 없음)';
      
      logEmbed.setTitle('⚔️ 경기 결과 신고 (패배)')
        .setDescription(summaryText)
        .setColor(0xE74C3C);
    }

    await updateAllTierChannels(interaction.client);

    if (config.channels.log) {
      const logChannel = await interaction.client.channels.fetch(config.channels.log).catch(() => null);
      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    await interaction.reply({ embeds: [logEmbed] });
  }
};
