const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdmin } = require('../utils/adminCheck');

function createPanelComponents() {
  const embed = new EmbedBuilder()
    .setTitle('\u2694\uFE0F \uC0AC\uB2E4\uB9AC \uCC4C\uB9B0\uC9C0 \uB798\uB354 \uC2DC\uC2A4\uD15C \u2694\uFE0F')
    .setDescription(
      '\uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC21C\uC704\uD45C\uC5D0 \uCC38\uAC00\uD558\uAC70\uB098 \uACBD\uAE30 \uACB0\uACFC\uB97C \uC81C\uCD9C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n\n' +
      '\uD83D\uDCCD **\uC774\uC6A9 \uC548\uB0B4**\n' +
      '\u2022 **[\uCC38\uAC00 \uB4F1\uB85D]**: \uCC98\uC74C \uCC38\uAC00\uD558\uC2DC\uB294 \uBD84\uC740 \uC815\uBCF4\uB97C \uC785\uB825\uD558\uACE0 \uCD1C\uD558\uC744 \uC21C\uC704\uB85C \uC9C4\uC785\uD569\uB2C8\uB2E4.\n' +
      '\u2022 **[\uACBD\uAE30 \uACB0\uACFC \uC2E0\uACE0]**: \uCD5C\uB300 3\uB4F1 \uC704\uC758 \uC720\uC800\uC5D0\uAC8C \uB3C4\uC804\uD558\uC5EC \uC2B9\uB9AC \uC2DC \uD574\uB7F0 \uC21C\uC704\uB85C \uC0C1\uC2B9\uD569\uB2C8\uB2E4!\n' +
      '\u2022 **[\uB0B4 \uC815\uBCF4 \uD655\uC778]**: \uD604\uC7AC \uB098\uC758 \uC21C\uC704, \uD2F0\uC5B4, \uB3C4\uC804 \uAC00\uB2A5\uD55C \uC0C1\uB300 3\uC778\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.\n\n' +
      '\uD83C\uDFC6 **\uD2F0\uC5B4 \uAD6C\uBD84**\n' +
      '\u2022 **1-TIER**: 1~5\uB4F1 (5\uBA85 \uACE0\uC815)\n' +
      '\u2022 **2-TIER**: 6~13\uB4F1 (8\uBA85 \uACE0\uC815)\n' +
      '\u2022 **3-TIER**: 14~23\uB4F1 (10\uBA85 \uACE0\uC815)\n' +
      '\u2022 **4-TIER**: 24\uB4F1~ (\uBB34\uC81C\uD55C)'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Click buttons below' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_register')
      .setLabel('\uD83D\uDCDD \uCC38\uAC00 \uB4F1\uB85D (Register)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_match')
      .setLabel('\u2694\uFE0F \uACBD\uAE30 \uACB0\uACFC \uC2E0\uACE0 (Match)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_profile')
      .setLabel('\uD83D\uDC64 \uB0B4 \uC815\uBCF4 / \uB3C4\uC804 \uB300\uC0C1 (Profile)')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1] };
}

module.exports = {
  createPanelComponents,
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Display ladder challenge interactive panel in channel'),

  async execute(interaction) {
    const isOwner = interaction.guild?.ownerId === interaction.user.id;
    if (!checkAdmin(interaction.member) && !isOwner) {
      return interaction.reply({ content: '\u274C \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.', ephemeral: true });
    }

    const panelData = createPanelComponents();
    await interaction.channel.send(panelData);
    await interaction.reply({ content: '\u2705 \uCC4C\uB9B0\uC9C0 \uD328\uB110\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4!', ephemeral: true });
  }
};
