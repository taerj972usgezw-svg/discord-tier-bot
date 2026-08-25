const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`[Slash Commands] ${commands.length}?? ??? ???? ????? ?? ?...`);

    if (config.guildId) {
      // ?? ?? ?? (?? ??)
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`[Slash Commands] ?? ??(${config.guildId})? ??? ??? ?? ??!`);
    } else {
      // ??? ?? (?? ?? ??? ?? 1?? ??)
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`[Slash Commands] ??? ??? ??? ?? ??!`);
    }
  } catch (error) {
    console.error('[Slash Commands Error]', error);
  }
})();
