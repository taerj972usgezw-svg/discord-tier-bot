const { PermissionsBitField } = require('discord.js');
const config = require('../config');

function checkAdmin(member) {
  if (!member) return false;
  // ?? ??? ?? ??
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }
  // ??? ?? ID ??
  if (config.adminRoleId && member.roles.cache.has(config.adminRoleId)) {
    return true;
  }
  return false;
}

module.exports = { checkAdmin };
