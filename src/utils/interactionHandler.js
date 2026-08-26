const { 
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, 
  EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ButtonBuilder 
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank, updateAllTierChannels } = require('./tierRenderer');
const { checkAdmin } = require('./adminCheck');

async function handleButton(interaction) {
  const customId = interaction.customId;

  // 1. 참가 등록 버튼 (관리자 전용 / 티어 지정)
  if (customId === 'btn_register') {
    const isOwner = interaction.guild?.ownerId === interaction.user.id;
    if (!checkAdmin(interaction.member) && !isOwner) {
      return interaction.reply({ content: '❌ 참가 등록은 서버 관리자만 진행할 수 있습니다.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_register_admin')
      .setTitle('📝 유저 등록 (티어 지정)');

    const nickInput = new TextInputBuilder()
      .setCustomId('input_nickname')
      .setLabel('닉네임')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('예: 홍길동')
      .setRequired(true);

    const realInput = new TextInputBuilder()
      .setCustomId('input_realname')
      .setLabel('본명 또는 별명')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('예: 길동이')
      .setRequired(true);

    const styleInput = new TextInputBuilder()
      .setCustomId('input_style')
      .setLabel('종족 / 스타일 (한둠 또는 외둠)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('한둠 또는 외둠')
      .setRequired(true);

    const tierInput = new TextInputBuilder()
      .setCustomId('input_tier')
      .setLabel('배정할 티어 번호 (1, 2, 3, 4 중 입력)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1, 2, 3, 4 중 선택')
      .setValue('1')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nickInput),
      new ActionRowBuilder().addComponents(realInput),
      new ActionRowBuilder().addComponents(styleInput),
      new ActionRowBuilder().addComponents(tierInput)
    );

    await interaction.showModal(modal);
  }

  // 2. 순위표 강제 새로고침 버튼
  else if (customId === 'btn_admin_refresh') {
    await updateAllTierChannels(interaction.client);
    await interaction.reply({ content: '✅ 모든 티어 채널의 순위표가 최신 상태로 갱신되었습니다!', ephemeral: true });
  }

  // 3. 경기 결과 신고 버튼 (순위표에 등록된 닉네임 선택)
  else if (customId === 'btn_match') {
    const allUsers = db.getAllUsers();
    if (allUsers.length < 2) {
      return interaction.reply({ content: '❌ 순위표에 최소 2명 이상의 유저가 등록되어 있어야 경기를 신고할 수 있습니다.', ephemeral: true });
    }

    const options = allUsers.slice(0, 25).map(u => ({
      label: u.rank + '등 : ' + u.nickname + ' (' + u.realname + ')',
      description: '스타일: ' + u.style + ' | ' + getTierByRank(u.rank) + '-TIER | ' + u.wins + '승 ' + u.losses + '패',
      value: u.id
    }));

    const challengerSelect = new StringSelectMenuBuilder()
      .setCustomId('select_match_challenger')
      .setPlaceholder('1단계: 도전한 사람(본인/도전자)을 선택하세요')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(challengerSelect);

    await interaction.reply({
      content: '⚔️ **[경기 결과 신고 - 1단계]**\n도전한 유저(도전자)를 목록에서 선택해주세요:',
      components: [row],
      ephemeral: true
    });
  }

  // 4. 순위 / 프로필 확인 버튼
  else if (customId === 'btn_profile') {
    const allUsers = db.getAllUsers();
    if (allUsers.length === 0) {
      return interaction.reply({ content: '❌ 현재 순위표에 등록된 유저가 없습니다.', ephemeral: true });
    }

    const options = allUsers.slice(0, 25).map(u => ({
      label: u.rank + '등 : ' + u.nickname + ' (' + u.realname + ')',
      description: '스타일: ' + u.style + ' | ' + getTierByRank(u.rank) + '-TIER',
      value: u.id
    }));

    const profileSelect = new StringSelectMenuBuilder()
      .setCustomId('select_profile_user')
      .setPlaceholder('조회할 유저를 선택하세요')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(profileSelect);

    await interaction.reply({
      content: '👤 **[프로필 및 도전 가능 상대 조회]** 유저를 선택하세요:',
      components: [row],
      ephemeral: true
    });
  }
}

async function handleModalSubmit(interaction) {
  // 관리자 유저 등록 (티어 지정)
  if (interaction.customId === 'modal_register_admin' || interaction.customId === 'modal_admin_add_user') {
    const nickname = interaction.fields.getTextInputValue('input_nickname')?.trim() || interaction.fields.getTextInputValue('admin_input_nickname')?.trim();
    const realname = interaction.fields.getTextInputValue('input_realname')?.trim() || interaction.fields.getTextInputValue('admin_input_realname')?.trim();
    let style = interaction.fields.getTextInputValue('input_style')?.trim() || interaction.fields.getTextInputValue('admin_input_style')?.trim();
    const tierStr = interaction.fields.getTextInputValue('input_tier')?.trim() || interaction.fields.getTextInputValue('admin_input_tier')?.trim();
    const tierNum = parseInt(tierStr, 10) || 1;

    if (style !== '한둠' && style !== '외둠') {
      style = style.includes('외') ? '외둠' : '한둠';
    }

    const uniqueId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newUser = db.registerUserWithTier(uniqueId, nickname, realname, style, tierNum);
    const actualTier = getTierByRank(newUser.rank);

    await updateAllTierChannels(interaction.client);

    const embed = new EmbedBuilder()
      .setTitle('🎉 [유저 등록 완료]')
      .setDescription('**' + newUser.nickname + '** (' + newUser.realname + ')님이 **' + actualTier + '-TIER** (' + newUser.rank + '등)에 성공적으로 등록되었습니다.')
      .addFields(
        { name: '표시 형식', value: '- ' + newUser.nickname + ' (' + newUser.realname + ') / ' + newUser.style },
        { name: '배정 순위', value: '**' + newUser.rank + '등** (' + actualTier + '-TIER)', inline: true }
      )
      .setColor(0x2ECC71);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleStringSelect(interaction) {
  // 1. 도전자 선택 -> 피도전자 선택 메뉴 띄우기
  if (interaction.customId === 'select_match_challenger') {
    const challengerId = interaction.values[0];
    const challenger = db.getUserById(challengerId);

    if (!challenger) {
      return interaction.update({ content: '❌ 선택한 유저를 찾을 수 없습니다.', components: [] });
    }

    const allUsers = db.getAllUsers();
    const rivals = allUsers.filter(u => u.id !== challengerId);

    if (rivals.length === 0) {
      return interaction.update({ content: '❌ 상대할 다른 유저가 없습니다.', components: [] });
    }

    // 도전자보다 상위에 있는 유저들 중 가장 가까운 직속 상위 3명
    const higherUsers = allUsers.filter(u => u.rank < challenger.rank);
    const validHigherIds = new Set(higherUsers.slice(-config.maxChallengeAbove).map(u => u.id));

    const options = rivals.slice(0, 25).map(u => {
      let desc = '';
      if (u.rank < challenger.rank) {
        if (validHigherIds.has(u.id)) {
          desc = '⚔️ 상위 유저 (도전 가능)';
        } else {
          desc = '⛔ 상위 유저 (3단계 초과)';
        }
      } else {
        desc = '🛡️ 하위 유저 (순위 방어전)';
      }

      return {
        label: u.rank + '등 : ' + u.nickname + ' (' + u.realname + ')',
        description: '스타일: ' + u.style + ' | ' + desc,
        value: challengerId + '_vs_' + u.id
      };
    });

    const defenderSelect = new StringSelectMenuBuilder()
      .setCustomId('select_match_defender')
      .setPlaceholder('2단계: 대결한 상대방(피도전자)을 선택하세요')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(defenderSelect);

    await interaction.update({
      content: '⚔️ **[도전자: ' + challenger.nickname + ' (' + challenger.realname + ') / ' + challenger.rank + '등]**\n대결한 상대방 유저를 선택해주세요:',
      components: [row]
    });
  }

  // 2. 피도전자 선택 -> 승/패 버튼 띄우기
  else if (interaction.customId === 'select_match_defender') {
    const [challengerId, defenderId] = interaction.values[0].split('_vs_');
    const challenger = db.getUserById(challengerId);
    const defender = db.getUserById(defenderId);

    if (!challenger || !defender) {
      return interaction.update({ content: '❌ 유저 정보를 찾을 수 없습니다.', components: [] });
    }

    const cRank = challenger.rank;
    const dRank = defender.rank;

    if (cRank > dRank) {
      const allUsers = db.getAllUsers();
      const higherUsers = allUsers.filter(u => u.rank < cRank);
      const validHigher = higherUsers.slice(-config.maxChallengeAbove);
      const isValidChallenge = validHigher.some(u => u.id === defenderId);

      if (!isValidChallenge) {
        return interaction.update({
          content: '❌ **도전 불가**: 도전자보다 최대 **' + config.maxChallengeAbove + '단계 위**의 유저에게만 도전할 수 있습니다.\n' +
                   '도전자(' + challenger.nickname + ': **' + cRank + '등**) ➡️ 상대방(' + defender.nickname + ': **' + dRank + '등**) 사이에 도전 가능한 직속 상위 유저가 존재합니다.',
          components: []
        });
      }
    }

    const resultRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_match_win_' + challengerId + '_' + defenderId)
        .setLabel('🏆 ' + challenger.nickname + ' 승리 (도전 성공)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_match_loss_' + challengerId + '_' + defenderId)
        .setLabel('🛡️ ' + challenger.nickname + ' 패배 (도전 실패)')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: '⚔️ **[매치] ' + challenger.nickname + ' (' + cRank + '등) VS ' + defender.nickname + ' (' + dRank + '등)**\n경기 결과를 선택해 주세요:',
      components: [resultRow]
    });
  }

  // 3. 프로필 조회
  else if (interaction.customId === 'select_profile_user') {
    const userId = interaction.values[0];
    const user = db.getUserById(userId);

    if (!user) {
      return interaction.update({ content: '❌ 유저를 찾을 수 없습니다.', components: [] });
    }

    const tier = getTierByRank(user.rank);
    const winRate = (user.wins + user.losses) > 0 
      ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) + '%'
      : '-';

    const allUsers = db.getAllUsers();
    const higherUsers = allUsers.filter(u => u.rank < user.rank);
    const canChallengeUsers = higherUsers.slice(-config.maxChallengeAbove);

    const challengeText = canChallengeUsers.length > 0
      ? canChallengeUsers.map(r => '• **' + r.rank + '등** : ' + r.nickname + ' (' + r.realname + ') / ' + r.style).join('\n')
      : (user.rank === 1 ? '👑 현재 1등 (최정상) 입니다!' : '도전 가능한 대상이 없습니다.');

    const embed = new EmbedBuilder()
      .setTitle('👤 ' + user.nickname + ' (' + user.realname + ') 프로필')
      .setColor(config.tiers[tier].color)
      .addFields(
        { name: '🏆 현재 순위', value: '**' + user.rank + '등** (' + tier + '-TIER)', inline: true },
        { name: '⚔️ 스타일', value: '' + user.style, inline: true },
        { name: '📊 전적', value: user.wins + '승 ' + user.losses + '패 (승률: ' + winRate + ')', inline: true },
        { name: '🎯 도전 가능 대상 (직속 상위 3인)', value: challengeText }
      );

    await interaction.update({ embeds: [embed], components: [] });
  }
}

async function handleMatchResultButton(interaction) {
  const customId = interaction.customId;
  const isWin = customId.startsWith('btn_match_win_');
  const isLoss = customId.startsWith('btn_match_loss_');

  if (!isWin && !isLoss) return false;

  const parts = customId.replace('btn_match_win_', '').replace('btn_match_loss_', '').split('_');
  const challengerId = parts[0];
  const defenderId = parts[1];

  const challenger = db.getUserById(challengerId);
  const defender = db.getUserById(defenderId);

  if (!challenger || !defender) {
    return interaction.update({ content: '❌ 유저 정보를 찾을 수 없습니다.', components: [] });
  }

  let summaryText = '';
  const logEmbed = new EmbedBuilder().setTimestamp();

  if (isWin) {
    const changeResult = db.applyLadderWin(challengerId, defenderId);
    if (changeResult.rankChanged) {
      const newTier = getTierByRank(changeResult.challengerNewRank);
      summaryText = '🔥 **[도전 성공]** **' + challenger.nickname + '**님이 **' + defender.nickname + '**님을 상대로 승리하여 **' + changeResult.challengerNewRank + '등**(' + newTier + '-TIER)으로 상승했습니다!\n' +
                    '(기존 ' + changeResult.challengerOldRank + '등 -> ' + changeResult.challengerNewRank + '등, 피도전자 및 사이 유저 1등씩 밀림)';
    } else {
      summaryText = '✅ **' + challenger.nickname + '**님이 승리했습니다. (순위 변동 없음)';
    }

    logEmbed.setTitle('⚔️ 경기 결과 신고 (승리)')
      .setDescription(summaryText)
      .setColor(0x2ECC71);
  } else {
    db.applyLadderLoss(challengerId, defenderId, challengerId);
    summaryText = '🛡️ **[도전 실패]** **' + challenger.nickname + '**님이 **' + defender.nickname + '**님에게 패배하였습니다. (순위 변동 없음)';

    logEmbed.setTitle('⚔️ 경기 결과 신고 (패배)')
      .setDescription(summaryText)
      .setColor(0xE74C3C);
  }

  await updateAllTierChannels(interaction.client);

  if (config.channels.log) {
    const logChannel = await interaction.client.channels.fetch(config.channels.log).catch(() => null);
    if (logChannel) {
      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  await interaction.update({
    content: summaryText,
    components: []
  });

  return true;
}

module.exports = {
  handleButton,
  handleModalSubmit,
  handleStringSelect,
  handleMatchResultButton
};