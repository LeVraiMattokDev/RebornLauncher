// Discord Rich Presence
// TODO: remplace DISCORD_APP_CLIENT_ID par l'ID de ton application Discord
// Crée une app sur https://discord.com/developers/applications
// puis ajoute des assets "logo" dans Rich Presence > Art Assets
const DISCORD_CLIENT_ID = '1504537435944521919';

let rpc = null;

function initDiscord() {
  if (DISCORD_CLIENT_ID === 'DISCORD_APP_CLIENT_ID') return; // pas configuré
  try {
    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(DISCORD_CLIENT_ID);
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    rpc.on('ready', () => {
      setActivity({ details: 'Dans le launcher', state: 'RebornMC' });
    });
    rpc.login({ clientId: DISCORD_CLIENT_ID }).catch(() => { rpc = null; });
  } catch (_) {
    rpc = null;
  }
}

function setActivity(opts) {
  if (!rpc) return;
  try {
    rpc.setActivity({
      largeImageKey: 'logo',
      largeImageText: 'RebornMC Launcher',
      instance: false,
      ...opts,
    });
  } catch (_) {}
}

function setIdle() {
  setActivity({ details: 'Dans le launcher', state: 'Inactif' });
}

function setDownloading() {
  setActivity({ details: 'Téléchargement en cours…', state: 'Préparation du jeu', startTimestamp: Date.now() });
}

function setPlaying(username) {
  setActivity({
    details: 'En jeu sur RebornMC',
    state: username || 'Joueur',
    startTimestamp: Date.now(),
    instance: true,
  });
}

function destroy() {
  if (rpc) {
    try { rpc.destroy(); } catch (_) {}
    rpc = null;
  }
}

module.exports = { initDiscord, setIdle, setDownloading, setPlaying, destroy };
