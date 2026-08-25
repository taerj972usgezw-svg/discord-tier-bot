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

// ? ?? ? ??? ??? ?? ??
async function registerSlashCommands() {
  if (!config.token || !config.clientId) {
    console.warn('[Slash Commands] TOKEN ?? CLIENT_ID? ?? ?? ??? ?????.');
    return;
  }

  const rest = new REST().setToken(config.token);
  try {
    console.log(`[Slash Commands] ${slashCommandsJSON.length}? ??? ????? ?? ?? ?...`);
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: slashCommandsJSON }
      );
      console.log(`[Slash Commands] ??(${config.guildId})? ?? ?? ??!`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: slashCommandsJSON }
      );
      console.log('[Slash Commands] ??? ??? ?? ??!');
    }
  } catch (error) {
    console.error('[Slash Commands Error]', error);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log('=========================================');
  console.log(`?? ???? ??? ?? ? ?? ??: ${c.user.tag}`);
  console.log('=========================================');
  
  // 1. ??? ??? ?? ??
  await registerSlashCommands();

  // 2. ?? ?? ??? ???/??
  try {
    console.log('[TierRenderer] ?? ? ?? ?? ??? ??? ?...');
    await updateAllTierChannels(c);
    console.log('[TierRenderer] ??? ??!');
  } catch (e) {
    console.error('[TierRenderer] ??? ??:', e);
  }
});

// ?? ??? ??? ?? (!??, !panel)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (content === '!??' || content === '!panel' || content === '!????') {
    const isOwner = message.guild?.ownerId === message.author.id;
    if (!checkAdmin(message.member) && !isOwner) {
      return message.reply('? ?? ???? ??? ??? ? ????.');
    }

    try {
      const panelData = createPanelComponents();
      await message.channel.send(panelData);
      await message.delete().catch(() => null); // ?? !?? ??? ??? ??
    } catch (err) {
      console.error('[Panel Send Error]', err);
      message.reply('? ?? ?? ? ??? ??????. ?? ?? ???/??? ?? ??? ??????.');
    }
  }
});

// ?? ????(??? ???, ??, ??, ??? ??) ???
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. ??? ???
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    // 2. ?/? ?? ?? ?? ??
    if (interaction.isButton()) {
      const handled = await handleMatchResultButton(interaction);
      if (!handled) {
        await handleButton(interaction);
      }
      return;
    }

    // 3. ?? ?? ??
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    // 4. ?? ??? ??
    if (interaction.isUserSelectMenu()) {
      await handleUserSelect(interaction);
      return;
    }
  } catch (error) {
    console.error('[Interaction Error]', error);
    const replyMsg = { content: '? ?? ? ??? ??????.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyMsg).catch(() => null);
    } else {
      await interaction.reply(replyMsg).catch(() => null);
    }
  }
});

if (!config.token) {
  console.error('? .env ??? DISCORD_TOKEN? ???? ?????.');
  process.exit(1);
}

client.login(config.token);
