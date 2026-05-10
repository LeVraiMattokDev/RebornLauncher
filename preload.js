const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  closeWindow:    () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),

  // Config
  getConfig:  ()    => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),

  // Skin
  getSkinUrl: (username) => ipcRenderer.invoke('get-skin-url', username),

  // Updates
  openUrl:         (url) => ipcRenderer.invoke('open-url', url),
  updaterDownload: ()    => ipcRenderer.invoke('updater-download'),
  updaterInstall:  ()    => ipcRenderer.send('updater-install'),

  // Mod list
  listMods: () => ipcRenderer.invoke('list-mods'),

  // Server ping
  pingServer: () => ipcRenderer.invoke('ping-server'),

  // Microsoft auth
  msAuthStart:   ()             => ipcRenderer.invoke('ms-auth-start'),
  msAuthRefresh: (refreshToken) => ipcRenderer.invoke('ms-auth-refresh', refreshToken),

  // Sync mods + configs
  syncFiles: () => ipcRenderer.invoke('sync-files'),

  // Minecraft launch
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Event listeners (renderer ← main)
  on: (channel, cb) => {
    const valid = ['launch-progress', 'launch-data', 'launch-close', 'launch-error',
                   'updater-available', 'updater-progress', 'updater-ready'];
    if (valid.includes(channel)) ipcRenderer.on(channel, (_e, ...args) => cb(...args));
  },
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
});
