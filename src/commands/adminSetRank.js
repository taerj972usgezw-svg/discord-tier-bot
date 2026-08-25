const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('[???] ?? ??? ??? ??? ?????.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('??? ??? ?? ??')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('rank')
        .setDescription('?? ??? ?? ?? (1??)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '? ???? ??? ? ?? ??????.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getInteger('rank');

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
