const { contextBridge, ipcRenderer } = require('electron');

const VALID_CHANNELS = [
  'launch-progress', 'launch-data', 'launch-close', 'launch-error',
  'updater-available', 'updater-progress', 'updater-ready',
  'sync-progress',
];

// Track wrapped listeners for proper cleanup
const listenerMap = new Map();

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  closeWindow:    () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Config
  getConfig:    ()    => ipcRenderer.invoke('get-config'),
  saveConfig:   (cfg) => ipcRenderer.invoke('save-config', cfg),
  resetConfig:  ()    => ipcRenderer.invoke('reset-config'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Skin
  getSkinUrl: (username) => ipcRenderer.invoke('get-skin-url', username),

  // URLs
  openUrl: (url) => ipcRenderer.invoke('open-url', url),

  // Updates
  updaterInstall: () => ipcRenderer.send('updater-install'),

  // Mod management
  listMods:       ()         => ipcRenderer.invoke('list-mods'),
  toggleMod:      (filename) => ipcRenderer.invoke('toggle-mod', filename),
  openModsFolder: ()         => ipcRenderer.invoke('open-mods-folder'),
  openGameFolder: ()         => ipcRenderer.invoke('open-game-folder'),

  // Server ping
  pingServer: () => ipcRenderer.invoke('ping-server'),

  // News
  getNews: () => ipcRenderer.invoke('get-news'),

  // Directory picker
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Microsoft auth
  msAuthStart:   ()             => ipcRenderer.invoke('ms-auth-start'),
  msAuthRefresh: (refreshToken) => ipcRenderer.invoke('ms-auth-refresh', refreshToken),

  // Sync mods + configs
  syncFiles: () => ipcRenderer.invoke('sync-files'),

  // Minecraft launch
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Event listeners with proper cleanup support
  on: (channel, cb) => {
    if (!VALID_CHANNELS.includes(channel)) return;
    const wrapper = (_e, ...args) => cb(...args);
    if (!listenerMap.has(cb)) listenerMap.set(cb, {});
    listenerMap.get(cb)[channel] = wrapper;
    ipcRenderer.on(channel, wrapper);
  },
  off: (channel, cb) => {
    const entry = listenerMap.get(cb);
    if (entry && entry[channel]) {
      ipcRenderer.removeListener(channel, entry[channel]);
      delete entry[channel];
      if (Object.keys(entry).length === 0) listenerMap.delete(cb);
    }
  },
});
