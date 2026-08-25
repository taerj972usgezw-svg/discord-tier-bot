const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { checkAdmin } = require('../utils/adminCheck');
const { updateAllTierChannels } = require('../utils/tierRenderer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edituser')
    .setDescription('[관리자] 유저의 닉네임, 별명, 스타일(한둠/외둠)을 수정합니다.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('수정할 대상 유저')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('변경할 닉네임 (미변경 시 비워두기)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('realname')
        .setDescription('변경할 본명/별명 (미변경 시 비워두기)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('한둠 또는 외둠')
        .setRequired(false)
        .addChoices(
          { name: '한둠', value: '한둠' },
          { name: '외둠', value: '외둠' }
        )
    ),

  async execute(interaction) {
    if (!checkAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ 관리자만 사용할 수 있는 명령어입니다.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const user = db.getUserById(targetUser.id);
    if (!user) {
      return interaction.reply({ content: '❌ 등록되지 않은 유저입니다.', ephemeral: true });
    }

    const nickname = interaction.options.getString('nickname');
    const realname = interaction.options.getString('realname');
    const style = interaction.options.getString('style');

    const updated = db.updateUserInfo(targetUser.id, nickname, realname, style);
    await updateAllTierChannels(interaction.client);

    await interaction.reply({
      content: '✅ <@' + targetUser.id + '>님의 정보가 수정되었습니다:\n- ' + updated.nickname + ' (' + updated.realname + ') / ' + updated.style
    });
  }
};
