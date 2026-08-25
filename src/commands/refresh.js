const { SlashCommandBuilder } = require('discord.js');
const { updateAllTierChannels } = require('../utils/tierRenderer');
const { checkAdmin } = require('../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refresh')
    .setDescription('[관리자] 1~4티어 채널의 순위표 메시지를 강제로 새로고침합니다.'),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ 관리자만 사용할 수 있는 명령어입니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    await updateAllTierChannels(interaction.client);
    await interaction.editReply('✅ 모든 티어 채널의 순위표가 성공적으로 갱신되었습니다!');
  }
};
