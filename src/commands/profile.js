const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('내 현재 순위, 티어, 도전 가능 상대 목록을 확인합니다.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('조회할 유저 (생략 시 본인)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = db.getUserById(targetUser.id);

    if (!user) {
      return interaction.reply({
        content: '❌ ' + (targetUser.id === interaction.user.id ? '등록되지 않았습니다. `/register`로 먼저 참가하세요!' : '등록되지 않은 유저입니다.'),
        ephemeral: true
      });
    }

    const tier = getTierByRank(user.rank);
    const winRate = (user.wins + user.losses) > 0 
      ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) + '%'
      : '-';

    const canChallenge = [];
    for (let r = Math.max(1, user.rank - config.maxChallengeAbove); r < user.rank; r++) {
      const rival = db.getUserByRank(r);
      if (rival) {
        canChallenge.push('• **' + rival.rank + '등** : ' + rival.nickname + ' (' + rival.realname + ') / ' + rival.style);
      }
    }

    const challengeText = canChallenge.length > 0
      ? canChallenge.join('\n')
      : (user.rank === 1 ? '👑 현재 1등 (최정상) 입니다!' : '도전 가능한 대상이 없습니다.');

    const embed = new EmbedBuilder()
      .setTitle('👤 ' + user.nickname + ' (' + user.realname + ') 프로필')
      .setColor(config.tiers[tier].color)
      .addFields(
        { name: '🏆 현재 순위', value: '**' + user.rank + '등** (' + tier + '-TIER)', inline: true },
        { name: '⚔️ 스타일', value: '' + user.style, inline: true },
        { name: '📊 전적', value: user.wins + '승 ' + user.losses + '패 (승률: ' + winRate + ')', inline: true },
        { name: '🎯 도전 가능 대상 (최대 3등 위)', value: challengeText }
      )
      .setFooter({ text: '디스코드: ' + targetUser.tag });

    await interaction.reply({ embeds: [embed] });
  }
};
