const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('????')
    .setDescription('[???] ?? ??? ??? ??? ?????.')
    .addUserOption(opt =>
      opt.setName('??')
        .setDescription('??? ??? ??')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('???')
        .setDescription('??? ?? ?? ?? (1??)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '? ???? ??? ? ?? ??????.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('??');
    const newRank = interaction.options.getInteger('???');

    const user = db.getUserById(targetUser.id);
    if (!user) {
      return interaction.reply({ content: '? ???? ?? ?????.', ephemeral: true });
    }

    try {
      const oldRank = user.rank;
      db.forceSetRank(targetUser.id, newRank);
      await updateAllTierChannels(interaction.client);

      await interaction.reply({
        content: `? <@${targetUser.id}>?? ??? **${oldRank}?** ?? **${newRank}?**?? ???????.`
      });
    } catch (err) {
      await interaction.reply({ content: `? ?? ?? ??: ${err.message}`, ephemeral: true });
    }
  }
};
