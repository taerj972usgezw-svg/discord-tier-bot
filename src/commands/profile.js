const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('???')
    .setDescription('? ?? ??, ??, ?? ?? ?? ??? ?????.')
    .addUserOption(opt =>
      opt.setName('??')
        .setDescription('?? ??? ??? ????? ????? (?? ? ??)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('??') || interaction.user;
    const user = db.getUserById(targetUser.id);

    if (!user) {
      return interaction.reply({
        content: `? ${targetUser.id === interaction.user.id ? '???? ?????. `/??`?? ?? ?????!' : '???? ?? ?????.'}`,
        ephemeral: true
      });
    }

    const tier = getTierByRank(user.rank);
    const winRate = (user.wins + user.losses) > 0 
      ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) + '%'
      : '-';

    // ?? ??? ?? ?? (? ?? - 1 ~ ? ?? - 3)
    const canChallenge = [];
    for (let r = Math.max(1, user.rank - config.maxChallengeAbove); r < user.rank; r++) {
      const rival = db.getUserByRank(r);
      if (rival) {
        canChallenge.push(`? **${rival.rank}?** : ${rival.nickname} (${rival.realname}) / ${rival.style}`);
      }
    }

    const challengeText = canChallenge.length > 0
      ? canChallenge.join('\n')
      : (user.rank === 1 ? '?? ?? 1? (???) ???!' : '?? ??? ??? ????.');

    const embed = new EmbedBuilder()
      .setTitle(`?? ${user.nickname} (${user.realname}) ???`)
      .setColor(config.tiers[tier].color)
      .addFields(
        { name: '?? ?? ??', value: `**${user.rank}?** (${tier}-TIER)`, inline: true },
        { name: '?? ???', value: `${user.style}`, inline: true },
        { name: '?? ??', value: `${user.wins}? ${user.losses}? (??: ${winRate})`, inline: true },
        { name: '?? ?? ?? ?? (?? 3? ?)', value: challengeText }
      )
      .setFooter({ text: `????: ${targetUser.tag}` });

    await interaction.reply({ embeds: [embed] });
  }
};
