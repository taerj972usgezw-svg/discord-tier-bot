const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('????')
    .setDescription('[???] ????? ??? ?????. (?? ??? ???? 1? ?????)')
    .addUserOption(opt =>
      opt.setName('??')
        .setDescription('??? ??')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '? ???? ??? ? ?? ??????.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('??');
    try {
      const removed = db.removeUser(targetUser.id);
      await updateAllTierChannels(interaction.client);

      await interaction.reply({
        content: `??? **${removed.nickname}** (${removed.realname}) ??? ????? ???????.`
      });
    } catch (err) {
      await interaction.reply({ content: `? ?? ?? ??: ${err.message}`, ephemeral: true });
    }
  }
};
