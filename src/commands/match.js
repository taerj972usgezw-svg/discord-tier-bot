const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank, updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('?? ?? ??? ?????.')
    .addUserOption(opt =>
      opt.setName('opponent')
        .setDescription('?? ?? ??')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('outcome')
        .setDescription('?? ?? ??')
        .setRequired(true)
        .addChoices(
          { name: '?? (?? ??)', value: 'win' },
          { name: '?? (?? ??)', value: 'loss' }
        )
    ),

  async execute(interaction) {
    const challengerId = interaction.user.id;
    const defenderUser = interaction.options.getUser('opponent');
    const result = interaction.options.getString('outcome');

    if (challengerId === defenderUser.id) {
      return interaction.reply({ content: '? ?? ???? ??? ??? ? ????.', ephemeral: true });
    }

    const challenger = db.getUserById(challengerId);
    const defender = db.getUserById(defenderUser.id);

    if (!challenger) {
      return interaction.reply({ content: '? ?? `/register` ???? ???? ??????.', ephemeral: true });
    }
    if (!defender) {
      return interaction.reply({ content: `? ???(${defenderUser.username})? ???? ???? ?? ????.`, ephemeral: true });
    }

    const cRank = challenger.rank;
    const dRank = defender.rank;

    if (cRank > dRank) {
      const rankDiff = cRank - dRank;
      if (rankDiff > config.maxChallengeAbove) {
        return interaction.reply({
          content: `? ?? ??: ?? **${config.maxChallengeAbove}? ?**? ????? ??? ? ????.\n` +
                   `?? ?? ??: **${cRank}?** | ??? ??: **${dRank}?** (??: ${rankDiff}?)`,
          ephemeral: true
        });
      }
    }

    let summaryText = '';
    const logEmbed = new EmbedBuilder().setTimestamp();

    if (result === 'win') {
      const changeResult = db.applyLadderWin(challengerId, defender.id);
      
      if (changeResult.rankChanged) {
        const oldTier = getTierByRank(changeResult.challengerOldRank);
        const newTier = getTierByRank(changeResult.challengerNewRank);
        
        summaryText = `?? **[?? ??]** <@${challengerId}>?? <@${defender.id}>?? ??? ???? **${changeResult.challengerNewRank}?**(${newTier}-TIER)?? ??????!\n` +
                      `(?? ${changeResult.challengerOldRank}? -> ${changeResult.challengerNewRank}?, ???? ? ?? ?? 1?? ??)`;
      } else {
        summaryText = `? <@${challengerId}>?? ??????. (?? ?? ??)`;
      }

      logEmbed.setTitle('?? ?? ?? ?? (??)')
        .setDescription(summaryText)
        .setColor(0x2ECC71);
    } else {
      db.applyLadderLoss(challengerId, defender.id, challengerId);
      summaryText = `??? **[?? ??]** <@${challengerId}>?? <@${defender.id}>??? ???????. (?? ?? ??)`;
      
      logEmbed.setTitle('?? ?? ?? ?? (??)')
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
