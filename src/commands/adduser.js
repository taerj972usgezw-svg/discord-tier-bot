const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getTierByRank, updateAllTierChannels } = require('../utils/tierRenderer');
const { checkAdmin } = require('../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adduser')
    .setDescription('[관리자] 특정 티어에 유저를 직접 추가합니다.')
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('유저 닉네임')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('realname')
        .setDescription('본명 또는 별명')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('한둠 또는 외둠')
        .setRequired(true)
        .addChoices(
          { name: '한둠', value: '한둠' },
          { name: '외둠', value: '외둠' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('tier')
        .setDescription('배정할 시작 티어 (1~4)')
        .setRequired(true)
        .addChoices(
          { name: '1-TIER', value: 1 },
          { name: '2-TIER', value: 2 },
          { name: '3-TIER', value: 3 },
          { name: '4-TIER', value: 4 }
        )
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('해당 디스코드 유저 멘션 (선택사항)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const isOwner = interaction.guild?.ownerId === interaction.user.id;
    if (!checkAdmin(interaction.member) && !isOwner) {
      return interaction.reply({ content: '❌ 관리자 권한이 필요합니다.', ephemeral: true });
    }

    const nickname = interaction.options.getString('nickname').trim();
    const realname = interaction.options.getString('realname').trim();
    const style = interaction.options.getString('style');
    const tierNum = interaction.options.getInteger('tier');
    const discordUser = interaction.options.getUser('user');

    const targetId = discordUser ? discordUser.id : ('user_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    const newUser = db.registerUserWithTier(targetId, nickname, realname, style, tierNum);
    const actualTier = getTierByRank(newUser.rank);

    await updateAllTierChannels(interaction.client);

    const embed = new EmbedBuilder()
      .setTitle('👑 [관리자] 유저 추가 완료!')
      .setDescription('**' + newUser.nickname + '** (' + newUser.realname + ')님이 **' + actualTier + '-TIER** (' + newUser.rank + '등)에 추가되었습니다.')
      .addFields(
        { name: '표시 형식', value: '- ' + newUser.nickname + ' (' + newUser.realname + ') / ' + newUser.style },
        { name: '배정 순위', value: '**' + newUser.rank + '등** (' + actualTier + '-TIER)', inline: true }
      )
      .setColor(0x3498DB);

    await interaction.reply({ embeds: [embed] });
  }
};
