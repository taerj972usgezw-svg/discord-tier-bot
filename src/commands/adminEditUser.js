const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('????')
    .setDescription('[???] ??? ???, ??, ???(??/??)? ?????.')
    .addUserOption(opt =>
      opt.setName('??')
        .setDescription('??? ??')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('???')
        .setDescription('??? ??? (?? ? ??? ????)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('??_??')
        .setDescription('??? ??/?? (?? ? ??? ????)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('??_???')
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

    const targetUser = interaction.options.getUser('??');
    const user = db.getUserById(targetUser.id);
    if (!user) {
      return interaction.reply({ content: '? ???? ?? ?????.', ephemeral: true });
    }

    const nickname = interaction.options.getString('???');
    const realname = interaction.options.getString('??_??');
    const style = interaction.options.getString('??_???');

    const updated = db.updateUserInfo(targetUser.id, nickname, realname, style);
    await updateAllTierChannels(interaction.client);

    await interaction.reply({
      content: `? <@${targetUser.id}>?? ??? ???????:
- ${updated.nickname} (${updated.realname}) / ${updated.style}`
    });
  }
};
