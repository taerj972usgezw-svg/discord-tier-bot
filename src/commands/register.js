const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getTierByRank, updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('순위표에 참가 등록합니다.')
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('디스코드 또는 게임 닉네임')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('realname')
        .setDescription('본명 또는 별명 (예: 홍길동)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('한둠 또는 외둠 선택')
        .setRequired(true)
        .addChoices(
          { name: '한둠', value: '한둠' },
          { name: '외둠', value: '외둠' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const existing = db.getUserById(userId);

    if (existing) {
      return interaction.reply({
        content: '❌ 이미 등록된 유저입니다! (현재 순위: **' + existing.rank + '등**, ' + getTierByRank(existing.rank) + '-TIER)',
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
      .setTitle('🎉 순위표 등록 완료!')
      .setDescription('**' + newUser.nickname + '**님이 순위표에 등록되었습니다.')
      .addFields(
        { name: '표시 형식', value: '- ' + newUser.nickname + ' (' + newUser.realname + ') / ' + newUser.style },
        { name: '배정 순위', value: '**' + newUser.rank + '등** (' + tier + '-TIER)', inline: true }
      )
      .setColor(0x2ECC71);

    await interaction.reply({ embeds: [embed] });
  }
};
