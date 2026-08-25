const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeuser')
    .setDescription('[관리자] 순위표에서 유저를 삭제합니다. (하위 랭크 자동 1씩 당김)')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('삭제할 대상 유저')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ 관리자만 사용할 수 있는 명령어입니다.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    try {
      const removed = db.removeUser(targetUser.id);
      await updateAllTierChannels(interaction.client);

      await interaction.reply({
        content: '🗑️ **' + removed.nickname + '** (' + removed.realname + ') 유저가 순위표에서 삭제되었습니다.'
      });
    } catch (err) {
      await interaction.reply({ content: '❌ 유저 삭제 실패: ' + err.message, ephemeral: true });
    }
  }
};
