const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edituser')
    .setDescription('[???] ??? ???, ??, ???(??/??)? ?????.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('??? ?? ??')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('??? ??? (??? ? ????)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('realname')
        .setDescription('??? ??/?? (??? ? ????)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('?? ?? ??')
        .setRequired(false)
        .addChoices(
          { name: '??', value: '??' },
          { name: '??', value: '??' }
        )
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '? ???? ??? ? ?? ??????.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const user = db.getUserById(targetUser.id);
    if (!user) {
      return interaction.reply({ content: '? ???? ?? ?????.', ephemeral: true });
    }

    const nickname = interaction.options.getString('nickname');
    const realname = interaction.options.getString('realname');
    const style = interaction.options.getString('style');

    const updated = db.updateUserInfo(targetUser.id, nickname, realname, style);
    await updateAllTierChannels(interaction.client);

    await interaction.reply({
      content: `? <@${targetUser.id}>?? ??? ???????:\n- ${updated.nickname} (${updated.realname}) / ${updated.style}`
    });
  }
};
