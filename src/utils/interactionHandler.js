const { 
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, 
  EmbedBuilder, UserSelectMenuBuilder, ButtonStyle, ButtonBuilder 
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const { getTierByRank, updateAllTierChannels } = require('./tierRenderer');

async function handleButton(interaction) {
  const customId = interaction.customId;

  if (customId === 'btn_register') {
    const existing = db.getUserById(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `? ?? ???? ????! (?? ??: **${existing.rank}?**, ${getTierByRank(existing.rank)}-TIER)`,
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_register')
      .setTitle('?? ??? ?? ??');

    const nickInput = new TextInputBuilder()
      .setCustomId('input_nickname')
      .setLabel('??? (???? ?? ?? ???)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('?: ???')
      .setRequired(true);

    const realInput = new TextInputBuilder()
      .setCustomId('input_realname')
      .setLabel('?? ?? ??')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('?: ???')
      .setRequired(true);

    const styleInput = new TextInputBuilder()
      .setCustomId('input_style')
      .setLabel('?? / ??? (?? ?? ?? ??)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('?? ?? ??')
      .setMinLength(2)
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nickInput),
      new ActionRowBuilder().addComponents(realInput),
      new ActionRowBuilder().addComponents(styleInput)
    );

    await interaction.showModal(modal);
  } else if (customId === 'btn_match') {
    const user = db.getUserById(interaction.user.id);
    if (!user) {
      return interaction.reply({
        content: '? ?? [ ?? ?? ?? ] ??? ?? ??????.',
        ephemeral: true
      });
    }

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('select_match_opponent')
      .setPlaceholder('???? ??? ??? ?????')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelect);

    await interaction.reply({
      content: '?? **[?? ?? ??]** ??? ??? ?? ???? ??????:',
      components: [row],
      ephemeral: true
    });
  } else if (customId === 'btn_profile') {
    const user = db.getUserById(interaction.user.id);
    if (!user) {
      return interaction.reply({
        content: '? ???? ?????. [ ?? ?? ?? ] ??? ?? ?? ?????!',
        ephemeral: true
      });
    }

    const tier = getTierByRank(user.rank);
    const winRate = (user.wins + user.losses) > 0 
      ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) + '%'
      : '-';

    const canChallenge = [];
    for (let r = Math.max(1, user.rank - config.maxChallengeAbove); r < user.rank; r++) {
      const rival = db.getUserByRank(r);
      if (rival) {
        canChallenge.push(`? **${rival.rank}?** : ${rival.nickname} (${rival.realname}) / ${rival.style}`);
      }
    }

    const challengeText = canChallenge.length > 0
      ? canChallenge.join('\n')
      : (user.rank === 1 ? '?? ?? 1? (???) ???!' : '?? ??? ??? ????.');

    const embed = new EmbedBuilder()
      .setTitle(`?? ${user.nickname} (${user.realname}) ???`)
      .setColor(config.tiers[tier].color)
      .addFields(
        { name: '?? ?? ??', value: `**${user.rank}?** (${tier}-TIER)`, inline: true },
        { name: '?? ???', value: `${user.style}`, inline: true },
        { name: '?? ??', value: `${user.wins}? ${user.losses}? (??: ${winRate})`, inline: true },
        { name: '?? ?? ?? ?? (?? 3? ?)', value: challengeText }
      )
      .setFooter({ text: `????: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleModalSubmit(interaction) {
  if (interaction.customId === 'modal_register') {
    const nickname = interaction.fields.getTextInputValue('input_nickname').trim();
    const realname = interaction.fields.getTextInputValue('input_realname').trim();
    let style = interaction.fields.getTextInputValue('input_style').trim();

    if (style !== '??' && style !== '??') {
      style = style.includes('?') ? '??' : '??';
    }

    const newUser = db.registerUser(interaction.user.id, nickname, realname, style);
    const tier = getTierByRank(newUser.rank);

    await updateAllTierChannels(interaction.client);

    const embed = new EmbedBuilder()
      .setTitle('?? ??? ?? ??!')
      .setDescription(`**${newUser.nickname}**?? ???? ????? ???????.`)
      .addFields(
        { name: '?? ??', value: `- ${newUser.nickname} (${newUser.realname}) / ${newUser.style}` },
        { name: '?? ??', value: `**${newUser.rank}?** (${tier}-TIER)`, inline: true }
      )
      .setColor(0x2ECC71);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleUserSelect(interaction) {
  if (interaction.customId === 'select_match_opponent') {
    const defenderId = interaction.values[0];
    const challengerId = interaction.user.id;

    if (challengerId === defenderId) {
      return interaction.update({
        content: '? ?? ??? ??? ??? ? ????.',
        components: []
      });
    }

    const challenger = db.getUserById(challengerId);
    const defender = db.getUserById(defenderId);

    if (!defender) {
      return interaction.update({
        content: '? ??? ??? ?? ???? ???? ?? ????.',
        components: []
      });
    }

    const cRank = challenger.rank;
    const dRank = defender.rank;

    if (cRank > dRank) {
      const rankDiff = cRank - dRank;
      if (rankDiff > config.maxChallengeAbove) {
        return interaction.update({
          content: `? ?? ??: ?? **${config.maxChallengeAbove}? ?**? ????? ??? ? ????.\n` +
                   `? ??: **${cRank}?** | ??? ??: **${dRank}?** (??: ${rankDiff}?)`,
          components: []
        });
      }
    }

    const resultRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_submit_win_${defenderId}`)
        .setLabel('?? ?? ??? (?? ??)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn_submit_loss_${defenderId}`)
        .setLabel('??? ?? ??? (?? ??)')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: `?? **[??: ${defender.nickname} (${defender.realname}) / ${defender.rank}?]**\n?? ??? ??? ???:`,
      components: [resultRow]
    });
  }
}

async function handleMatchResultButton(interaction) {
  const customId = interaction.customId;
  const isWin = customId.startsWith('btn_submit_win_');
  const isLoss = customId.startsWith('btn_submit_loss_');

  if (!isWin && !isLoss) return false;

  const defenderId = customId.replace('btn_submit_win_', '').replace('btn_submit_loss_', '');
  const challengerId = interaction.user.id;

  const challenger = db.getUserById(challengerId);
  const defender = db.getUserById(defenderId);

  if (!challenger || !defender) {
    return interaction.update({ content: '? ?? ??? ?? ? ????.', components: [] });
  }

  let summaryText = '';
  const logEmbed = new EmbedBuilder().setTimestamp();

  if (isWin) {
    const changeResult = db.applyLadderWin(challengerId, defenderId);
    if (changeResult.rankChanged) {
      const newTier = getTierByRank(changeResult.challengerNewRank);
      summaryText = `?? **[?? ??]** <@${challengerId}>?? <@${defenderId}>?? ??? ???? **${changeResult.challengerNewRank}?**(${newTier}-TIER)?? ??????!\n` +
                    `(?? ${changeResult.challengerOldRank}? -> ${changeResult.challengerNewRank}?, ???? ? ?? ?? 1?? ??)`;
    } else {
      summaryText = `? <@${challengerId}>?? ??????. (?? ?? ??)`;
    }

    logEmbed.setTitle('?? ?? ?? ?? (??)')
      .setDescription(summaryText)
      .setColor(0x2ECC71);
  } else {
    db.applyLadderLoss(challengerId, defenderId, challengerId);
    summaryText = `??? **[?? ??]** <@${challengerId}>?? <@${defenderId}>??? ???????. (?? ?? ??)`;

    logEmbed.setTitle('?? ?? ?? ?? (??)')
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
  handleUserSelect,
  handleMatchResultButton
};
