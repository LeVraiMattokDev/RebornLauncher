const fs = require('fs');
const path = require('path');

/**
 * Reads mod_ban/banned_mods.txt and deletes any matching .jar files
 * from the specified mods folder.
 *
 * banned_mods.txt format: one entry per line, # for comments
 * Entry can be a partial filename (case-insensitive includes match)
 * e.g.:  badmod-1.0.jar   or just   badmod
 */
function applyModBan(modsFolder, modBanFolder) {
  const result = { deleted: [], skipped: [] };
  const banListPath = path.join(modBanFolder, 'banned_mods.txt');

  if (!fs.existsSync(banListPath) || !fs.existsSync(modsFolder)) return result;

  const bannedList = fs.readFileSync(banListPath, 'utf-8')
    .split('\n')
    .map(l => l.trim().toLowerCase())
    .filter(l => l && !l.startsWith('#'));

  const mods = fs.readdirSync(modsFolder)
    .filter(f => f.endsWith('.jar') || f.endsWith('.zip'));

  for (const mod of mods) {
    const modLower = mod.toLowerCase();
    const banned = bannedList.some(b => modLower.includes(b) || modLower === b);
    if (!banned) continue;
    try {
      fs.unlinkSync(path.join(modsFolder, mod));
      result.deleted.push(mod);
      console.log(`[mod_ban] Supprimé : ${mod}`);
    } catch (e) {
      result.skipped.push(mod);
      console.warn(`[mod_ban] Échec suppression ${mod}: ${e.message}`);
    }
  }

  return result;
}

module.exports = { applyModBan };
