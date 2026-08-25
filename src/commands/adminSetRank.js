const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('[관리자] 특정 유저의 순위를 강제로 변경합니다.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('순위를 변경할 대상 유저')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('rank')
        .setDescription('새로 지정할 순위 번호 (1부터)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ 관리자만 사용할 수 있는 명령어입니다.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getInteger('rank');

    const user = db.getUserById(targetUser.id);
    if (!user) {
      return interaction.reply({ content: '❌ 등록되지 않은 유저입니다.', ephemeral: true });
    }

    try {
      const oldRank = user.rank;
      db.forceSetRank(targetUser.id, newRank);
      await updateAllTierChannels(interaction.client);

      await interaction.reply({
        content: '✅ <@' + targetUser.id + '>님의 순위를 **' + oldRank + '등** ➡️ **' + newRank + '등**으로 수정하였습니다.'
      });
    } catch (err) {
      await interaction.reply({ content: '❌ 순위 변경 실패: ' + err.message, ephemeral: true });
    }
  }
};
