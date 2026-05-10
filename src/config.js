const { app } = require('electron');
const path = require('path');
const fs = require('fs');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'launcher-config.json');
}

function getDefaults() {
  return {
    msAccount: null,
    storeUrl: 'https://rebornsmp.fr/shop',
    githubRepo: 'LeVraiMattokDev/RebornLauncher',
    minecraftPath: path.join(app.getPath('appData'), '.rebornmc'),
    minecraftVersion: '1.21.8',
    maxRam: '8',
    minRam: '2',
  };
}

const FIXED = {
  githubRepo: 'LeVraiMattokDev/RebornLauncher',
  minecraftVersion: '1.21.8',
};

function load() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) {
      const saved = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...getDefaults(), ...saved, ...FIXED };
    }
  } catch (_) {}
  return getDefaults();
}

function save(config) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Config save error:', e.message);
  }
}

module.exports = { load, save };
