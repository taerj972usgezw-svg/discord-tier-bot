const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getTierByRank, updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('???? ?? ??? ?????. (??? ?? ??)')
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('???? ?? ?? ???')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('realname')
        .setDescription('?? ?? ?? (?: ???)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('?? ?? ?? ??')
        .setRequired(true)
        .addChoices(
          { name: '??', value: '??' },
          { name: '??', value: '??' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const existing = db.getUserById(userId);

    if (existing) {
      return interaction.reply({
        content: `? ?? ??? ?????! (?? ??: **${existing.rank}?**, ${getTierByRank(existing.rank)}-TIER)`,
        ephemeral: true
      });
    }

    const nickname = interaction.options.getString('nickname').trim();
    const realname = interaction.options.getString('realname').trim();
    const style = interaction.options.getString('style');

    const newUser = db.registerUser(userId, nickname, realname, style);
    const tier = getTierByRank(newUser.rank);

    await updateAllTierChannels(interaction.client);

    const embed = new EmbedBuilder()
      .setTitle('?? ??? ?? ??!')
      .setDescription(`**${newUser.nickname}**?? ???? ???????.`)
      .addFields(
        { name: '?? ??', value: `- ${newUser.nickname} (${newUser.realname}) / ${newUser.style}` },
        { name: '?? ??', value: `**${newUser.rank}?** (${tier}-TIER)`, inline: true }
      )
      .setColor(0x2ECC71);

    await interaction.reply({ embeds: [embed] });
  }
};
