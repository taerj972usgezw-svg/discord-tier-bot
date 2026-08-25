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
        content: '\u274C \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4! (\uD604\uC7AC \uC21C\uC704: **' + existing.rank + '\uB4F1**, ' + getTierByRank(existing.rank) + '-TIER)',
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_register')
      .setTitle('\uD83D\uDCDD \uC21C\uC704\uD45C \uCC38\uAC00 \uB4F1\uB85D');

    const nickInput = new TextInputBuilder()
      .setCustomId('input_nickname')
      .setLabel('\uB2C9\uB124\uC784 (\uB514\uC2A4\uCF54\uB4DC \uB610\uB294 \uAC8C\uC784 \uB2C9\uB124\uC784)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('\uC608: \uD64D\uAE38\uB3D9')
      .setRequired(true);

    const realInput = new TextInputBuilder()
      .setCustomId('input_realname')
      .setLabel('\uBCF8\uBA85 \uB610\uB294 \uBCC4\uBA85')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('\uC608: \uAE38\uB3D9\uC774')
      .setRequired(true);

    const styleInput = new TextInputBuilder()
      .setCustomId('input_style')
      .setLabel('\uC885\uC871 / \uC2A4\uD0C0\uC77C (\uD55C\uB460 \uB610\uB294 \uC678\uB460 \uC785\uB825)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('\uD55C\uB460 \uB610\uB294 \uC678\uB460')
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
        content: '\u274C \uBA3C\uC800 [ \uD83D\uDCDD \uCC38\uAC00 \uB4F1\uB85D ] \uBC84\uD2BC\uC744 \uB20C\uB7EC \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.',
        ephemeral: true
      });
    }

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('select_match_opponent')
      .setPlaceholder('\uB3C4\uC804\uD588\uB358 \uC0C1\uB300\uBC29 \uC720\uC800\uB97C \uC120\uD0DD\uD558\uC138\uC694')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelect);

    await interaction.reply({
      content: '\uD83C\uDFAF **[\uACBD\uAE30 \uACB0\uACFC \uC2E0\uACE0]** \uC0C1\uB300\uBC29 \uC720\uC800\uB97C \uC544\uB798 \uBAA9\uB85D\uC5D0\uC11C \uC120\uD0DD\uD574\uC8FC\uC138\uC694:',
      components: [row],
      ephemeral: true
    });
  } else if (customId === 'btn_profile') {
    const user = db.getUserById(interaction.user.id);
    if (!user) {
      return interaction.reply({
        content: '\u274C \uB4F1\uB85D\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. [ \uD83D\uDCDD \uCC38\uAC00 \uB4F1\uB85D ] \uBC84\uD2BC\uC744 \uB20C\uB7EC \uBA3C\uC800 \uCC38\uAC00\uD558\uC138\uC694!',
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
        canChallenge.push('\u2022 **' + rival.rank + '\uB4F1** : ' + rival.nickname + ' (' + rival.realname + ') / ' + rival.style);
      }
    }

    const challengeText = canChallenge.length > 0
      ? canChallenge.join('\n')
      : (user.rank === 1 ? '\uD83D\uDC51 \uD604\uC7AC 1\uB4F1 (\uCD5C\uC815\uC0C1) \uC785\uB825\uB2C8\uB2E4!' : '\uB3C4\uC804 \uAC00\uB2A5\uD55C \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');

    const embed = new EmbedBuilder()
      .setTitle('\uD83D\uDC64 ' + user.nickname + ' (' + user.realname + ') \uD504\uB85C\uD544')
      .setColor(config.tiers[tier].color)
      .addFields(
        { name: '\uD83C\uDFC6 \uD604\uC7AC \uC21C\uC704', value: '**' + user.rank + '\uB4F1** (' + tier + '-TIER)', inline: true },
        { name: '\u2694\uFE0F \uC2A4\uD0C0\uC77C', value: '' + user.style, inline: true },
        { name: '\uD83D\uDCCA \uC804\uC801', value: user.wins + '\uC2B9 ' + user.losses + '\uD328 (\uC2B9\uB960: ' + winRate + ')', inline: true },
        { name: '\uD83C\uDFAF \uB3C4\uC804 \uAC00\uB2A5 \uB300\uC0C1 (\uCD5C\uB300 3\uB4F1 \uC704)', value: challengeText }
      )
      .setFooter({ text: '\uB514\uC2A4\uCF54\uB4DC: ' + interaction.user.tag });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleModalSubmit(interaction) {
  if (interaction.customId === 'modal_register') {
    const nickname = interaction.fields.getTextInputValue('input_nickname').trim();
    const realname = interaction.fields.getTextInputValue('input_realname').trim();
    let style = interaction.fields.getTextInputValue('input_style').trim();

    if (style !== '\uD55C\uB460' && style !== '\uC678\uB460') {
      style = style.includes('\uC678') ? '\uC678\uB460' : '\uD55C\uB460';
    }

    const newUser = db.registerUser(interaction.user.id, nickname, realname, style);
    const tier = getTierByRank(newUser.rank);

    await updateAllTierChannels(interaction.client);

    const embed = new EmbedBuilder()
      .setTitle('\uD83C\uDF89 \uC21C\uC704\uD45C \uB4F1\uB85D \uC644\uB8CC!')
      .setDescription('**' + newUser.nickname + '**\uB2D8\uC774 \uC21C\uC704\uD45C\uC5D0 \uC131\uACF5\uC801\uC73C\uB85C \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.')
      .addFields(
        { name: '\uD45C\uC2DC \uD615\uC2DD', value: '- ' + newUser.nickname + ' (' + newUser.realname + ') / ' + newUser.style },
        { name: '\uBC30\uC815 \uC21C\uC704', value: '**' + newUser.rank + '\uB4F1** (' + tier + '-TIER)', inline: true }
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
        content: '\u274C \uC790\uAE30 \uC790\uC2E0\uC744 \uC0C1\uB300\uB85C \uC120\uD0DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
        components: []
      });
    }

    const challenger = db.getUserById(challengerId);
    const defender = db.getUserById(defenderId);

    if (!defender) {
      return interaction.update({
        content: '\u274C \uC120\uD0DD\uD55C \uC720\uC800\uAC00 \uC544\uC9C1 \uC21C\uC704\uD45C\uC5D0 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
        components: []
      });
    }

    const cRank = challenger.rank;
    const dRank = defender.rank;

    if (cRank > dRank) {
      const rankDiff = cRank - dRank;
      if (rankDiff > config.maxChallengeAbove) {
        return interaction.update({
          content: '\u274C \uADDC\uCE59 \uC704\uBC18: \uCD5C\uB300 **' + config.maxChallengeAbove + '\uB4F1 \uC704**\uC758 \uC720\uC800\uC5D0\uAC8C\uB9CC \uB3C4\uC804\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n' +
                   '\uB0B4 \uC21C\uC704: **' + cRank + '\uB4F1** | \uC0C1\uB300\uBC29 \uC21C\uC704: **' + dRank + '\uB4F1** (\uCC28\uC774: ' + rankDiff + '\uB4F1)',
          components: []
        });
      }
    }

    const resultRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_submit_win_' + defenderId)
        .setLabel('\uD83C\uDFC6 \uB0B4\uAC00 \uC2B9\uB9AC\uD568 (\uB3C4\uC804 \uC131\uACF5)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_submit_loss_' + defenderId)
        .setLabel('\uD83D\uDEE1\uFE0F \uB0B4\uAC00 \uD328\uBC30\uD568 (\uB3C4\uC804 \uC2E4\uD328)')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: '\u2694\uFE0F **[\uC0C1\uB300: ' + defender.nickname + ' (' + defender.realname + ') / ' + defender.rank + '\uB4F1]**\n\uACBD\uAE30 \uACB0\uACFC\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694:',
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
    return interaction.update({ content: '\u274C \uC720\uC800 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', components: [] });
  }

  let summaryText = '';
  const logEmbed = new EmbedBuilder().setTimestamp();

  if (isWin) {
    const changeResult = db.applyLadderWin(challengerId, defenderId);
    if (changeResult.rankChanged) {
      const newTier = getTierByRank(changeResult.challengerNewRank);
      summaryText = '\uD83D\uDD25 **[\uB3C4\uC804 \uC131\uACF5]** <@' + challengerId + '>\uB2D8\uC774 <@' + defenderId + '>\uB2D8\uC744 \uC0C1\uB300\uB85C \uC2B9\uB9AC\uD558\uC5EC **' + changeResult.challengerNewRank + '\uB4F1**(' + newTier + '-TIER)\uC73C\uB85C \uC0C1\uC2B9\uD588\uC2B5\uB2C8\uB2E4!\n' +
                    '(\uAE30\uC874 ' + changeResult.challengerOldRank + '\uB4F1 -> ' + changeResult.challengerNewRank + '\uB4F1, \uD53C\uB3C4\uC804\uC790 \uBC0F \uC0AC\uC774 \uC720\uC800 1\uB4F1\uC529 \uBC00\uB9BC)';
    } else {
      summaryText = '\u2705 <@' + challengerId + '>\uB2D8\uC774 \uC2B9\uB9AC\uD588\uC2B5\uB2C8\uB2E4. (\uC21C\uC704 \uBCC0\uB3D9 \uC5C6\uC74C)';
    }

    logEmbed.setTitle('\u2694\uFE0F \uACBD\uAE30 \uACB0\uACFC \uC2E0\uACE0 (\uC2B9\uB9AC)')
      .setDescription(summaryText)
      .setColor(0x2ECC71);
  } else {
    db.applyLadderLoss(challengerId, defenderId, challengerId);
    summaryText = '\uD83D\uDEE1\uFE0F **[\uB3C4\uC804 \uC2E4\uD328]** <@' + challengerId + '>\uB2D8\uC774 <@' + defenderId + '>\uB2D8\uC5D0\uAC8C \uD328\uBC30\uD558\uC600\uC2B5\uB2C8\uB2E4. (\uC21C\uC704 \uBCC0\uB3D9 \uC5C6\uC74C)';

    logEmbed.setTitle('\u2694\uFE0F \uACBD\uAE30 \uACB0\uACFC \uC2E0\uACE0 (\uD328\uBC30)')
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
