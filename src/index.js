const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { updateAllTierChannels } = require('./utils/tierRenderer');
const { 
  handleButton, 
  handleModalSubmit, 
  handleUserSelect, 
  handleMatchResultButton 
} = require('./utils/interactionHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log('=========================================');
  console.log(`?? ???? ??? ?? ? ?? ??: ${c.user.tag}`);
  console.log('=========================================');
  
  try {
    console.log('[TierRenderer] ?? ? ?? ?? ??? ??? ?...');
    await updateAllTierChannels(c);
    console.log('[TierRenderer] ??? ??!');
  } catch (e) {
    console.error('[TierRenderer] ??? ??:', e);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. ??? ??? ??
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    // 2. ?/? ?? ?? ??
    if (interaction.isButton()) {
      const handled = await handleMatchResultButton(interaction);
      if (!handled) {
        await handleButton(interaction);
      }
      return;
    }

    // 3. ?? ?? ?? ??
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    // 4. ?? ??? ?? ??
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
