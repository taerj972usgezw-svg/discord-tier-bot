const { Client, Collection, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { updateAllTierChannels } = require('./utils/tierRenderer');
const { createPanelComponents } = require('./commands/panel');
const { checkAdmin } = require('./utils/adminCheck');
const { 
  handleButton, 
  handleModalSubmit, 
  handleUserSelect, 
  handleMatchResultButton 
} = require('./utils/interactionHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const slashCommandsJSON = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommandsJSON.push(command.data.toJSON());
  }
}

async function registerSlashCommands() {
  if (!config.token || !config.clientId) {
    console.warn('[Slash Commands] No TOKEN or CLIENT_ID configured');
    return;
  }

  const rest = new REST().setToken(config.token);
  try {
    console.log(`[Slash Commands] Registering ${slashCommandsJSON.length} commands...`);
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: slashCommandsJSON }
      );
      console.log(`[Slash Commands] Registered to Guild (${config.guildId}) successfully!`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: slashCommandsJSON }
      );
      console.log('[Slash Commands] Registered globally successfully!');
    }
  } catch (error) {
    console.error('[Slash Commands Error]', error);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log('=========================================');
  console.log(`[Bot Ready] Connected as: ${c.user.tag}`);
  console.log('=========================================');
  
  await registerSlashCommands();

  try {
    console.log('[TierRenderer] Updating tier channels...');
    await updateAllTierChannels(c);
    console.log('[TierRenderer] Tier channels updated!');
  } catch (e) {
    console.error('[TierRenderer Error]', e);
  }
});

// ?? ??? ??? ??? (!panel, !p, !??, !??)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  if (content === '!panel' || content === '!p' || content === '!??' || content === '!??' || content === '!rank') {
    const isOwner = message.guild?.ownerId === message.author.id;
    if (!checkAdmin(message.member) && !isOwner) {
      return message.reply('\u274C \uAD00\uB9AC\uC790\uB9CC \uD328\uB110\uC744 \uC0DD\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. (Admin only)');
    }

    try {
      const panelData = createPanelComponents();
      await message.channel.send(panelData);
      await message.delete().catch(() => null);
    } catch (err) {
      console.error('[Panel Send Error]', err);
      message.reply('\u274C \uD328\uB110 \uC804\uC1A1 \uC2E4\uD328. \uBD07\uC758 \uCC44\uB110 \uAD8C\uD55C(\uBA54\uC2DC\uC9C0/\uC784\uBE44\uB4DC \uBCF4\uB0B4\uAE30)\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.');
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      const handled = await handleMatchResultButton(interaction);
      if (!handled) {
        await handleButton(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (interaction.isUserSelectMenu()) {
      await handleUserSelect(interaction);
      return;
    }
  } catch (error) {
    console.error('[Interaction Error]', error);
    const replyMsg = { content: '\u274C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyMsg).catch(() => null);
    } else {
      await interaction.reply(replyMsg).catch(() => null);
    }
  }
});

if (!config.token) {
  console.error('No DISCORD_TOKEN provided in environment variables');
  process.exit(1);
}

client.login(config.token);
