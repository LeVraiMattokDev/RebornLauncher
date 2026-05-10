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
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  openUrl:      (url) => ipcRenderer.invoke('open-url', url),

  // Mod list
  listMods: () => ipcRenderer.invoke('list-mods'),

  // Server ping
  pingServer: () => ipcRenderer.invoke('ping-server'),

  // Minecraft launch
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Event listeners (renderer ← main)
  on: (channel, cb) => {
    const valid = ['launch-progress', 'launch-data', 'launch-close', 'launch-error'];
    if (valid.includes(channel)) ipcRenderer.on(channel, (_e, ...args) => cb(...args));
  },
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
});
