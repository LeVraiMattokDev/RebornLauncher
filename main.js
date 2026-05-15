const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const net  = require('net');
const os   = require('os');

// ── Minecraft server ping ─────────────────────────────────────────────────────
function writeVarInt(v) {
  const b = [];
  do { let byte = v & 0x7F; v >>>= 7; if (v !== 0) byte |= 0x80; b.push(byte); } while (v !== 0);
  return Buffer.from(b);
}
function writeStr(s) {
  const e = Buffer.from(s, 'utf8');
  return Buffer.concat([writeVarInt(e.length), e]);
}
function readVarInt(buf, off) {
  let res = 0, shift = 0, pos = off;
  while (pos < buf.length) {
    const b = buf[pos++]; res |= (b & 0x7F) << shift;
    if ((b & 0x80) === 0) return { value: res, bytesRead: pos - off };
    shift += 7; if (shift >= 35) throw new Error('VarInt overflow');
  }
  throw new Error('Incomplete VarInt');
}
function pingMinecraft(host, port = 25565, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port });
    let done = false, buf = Buffer.alloc(0);
    const finish = (r) => { if (done) return; done = true; clearTimeout(t); sock.destroy(); resolve(r); };
    const fail   = (e) => { if (done) return; done = true; clearTimeout(t); sock.destroy(); reject(e); };
    const t = setTimeout(() => fail(new Error('timeout')), timeout);
    sock.on('error', fail).on('timeout', () => fail(new Error('timeout')));
    sock.on('connect', () => {
      const start = Date.now();
      const portBuf = Buffer.alloc(2); portBuf.writeUInt16BE(port);
      const hsData = Buffer.concat([writeVarInt(0x00), writeVarInt(47), writeStr(host), portBuf, writeVarInt(1)]);
      const hsPkt  = Buffer.concat([writeVarInt(hsData.length), hsData]);
      const srData = writeVarInt(0x00);
      const srPkt  = Buffer.concat([writeVarInt(srData.length), srData]);
      sock.write(Buffer.concat([hsPkt, srPkt]));
      sock.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        try {
          const lr = readVarInt(buf, 0);
          if (buf.length < lr.value + lr.bytesRead) return;
          let off = lr.bytesRead;
          const ir = readVarInt(buf, off); off += ir.bytesRead;
          if (ir.value !== 0x00) return;
          const jlr = readVarInt(buf, off); off += jlr.bytesRead;
          const json = JSON.parse(buf.slice(off, off + jlr.value).toString('utf8'));
          finish({ online: true, players: json.players?.online ?? 0, maxPlayers: json.players?.max ?? 0, latency: Date.now() - start });
        } catch (_) {}
      });
    });
  });
}

let mainWindow      = null;
let tray            = null;
let activeClient    = null;
let activeGamePid   = null;
let isQuitting      = false;
let discord         = null;
let cancelRequested = false;

// ── Tray ──────────────────────────────────────────────────────────────────────
function setupTray() {
  const iconPath = path.join(__dirname, 'assets', 'logo.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('RebornMC Launcher');
  const menu = Menu.buildFromTemplate([
    { label: 'Afficher le launcher', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quitter', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#080B12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Intercepte la fermeture — minimise dans le tray
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(() => {
  createWindow();
  setupTray();

  // ── Discord Rich Presence ────────────────────────────────────────────────
  try {
    discord = require('./src/discord');
    discord.initDiscord();
  } catch (_) {}

  // ── Window controls ──────────────────────────────────────────────────────
  ipcMain.on('window-close',    () => { if (mainWindow) mainWindow.hide(); });
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });

  // ── App version ──────────────────────────────────────────────────────────
  ipcMain.handle('get-app-version', () => app.getVersion());

  // ── Config ───────────────────────────────────────────────────────────────
  const configModule = require('./src/config');
  ipcMain.handle('get-config',  ()        => configModule.load());
  ipcMain.handle('save-config', (_e, cfg) => { configModule.save(cfg); return true; });

  // ── Skin lookup ───────────────────────────────────────────────────────────
  const { getSkinUrl } = require('./src/updater');
  ipcMain.handle('get-skin-url', (_e, username) => getSkinUrl(username));

  ipcMain.handle('open-url', (_e, url) => { shell.openExternal(url); });

  // ── Server ping ───────────────────────────────────────────────────────────
  ipcMain.handle('ping-server', async () => {
    try {
      return await pingMinecraft('play.rebornmc.fr');
    } catch (e) {
      return { online: false, players: 0, maxPlayers: 0, latency: 0 };
    }
  });

  // ── System info ───────────────────────────────────────────────────────────
  ipcMain.handle('get-system-info', () => ({
    totalRam: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    freeRam: Math.round(os.freemem() / (1024 * 1024 * 1024)),
    platform: process.platform,
    arch: process.arch,
  }));

  // ── Java check ────────────────────────────────────────────────────────────
  ipcMain.handle('check-java', () => {
    try {
      const { findJava } = require('./src/launcher');
      const javaPath = findJava();
      return { found: true, path: javaPath || 'system' };
    } catch (e) {
      return { found: false, error: e.message };
    }
  });

  // ── Mod list (includes disabled) ──────────────────────────────────────────
  ipcMain.handle('list-mods', () => {
    const cfg = configModule.load();
    const modsDir = path.join(cfg.minecraftPath, 'mods');
    if (!fs.existsSync(modsDir)) return [];
    try {
      return fs.readdirSync(modsDir)
        .filter(f => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
        .map(f => {
          const stat = fs.statSync(path.join(modsDir, f));
          const disabled = f.endsWith('.disabled');
          return {
            name:     f.replace(/\.jar(\.disabled)?$/, ''),
            filename: f,
            size:     (stat.size / (1024 * 1024)).toFixed(1) + ' Mo',
            enabled:  !disabled,
          };
        });
    } catch (_) { return []; }
  });

  // ── Toggle mod (enable/disable) ───────────────────────────────────────────
  ipcMain.handle('toggle-mod', (_e, filename) => {
    const cfg = configModule.load();
    const modsDir = path.join(cfg.minecraftPath, 'mods');
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) return { error: 'Nom de fichier invalide.' };
    const filePath = path.join(modsDir, safeFilename);
    try {
      if (filename.endsWith('.disabled')) {
        const enabledPath = filePath.slice(0, -'.disabled'.length);
        fs.renameSync(filePath, enabledPath);
        return { enabled: true, newFilename: path.basename(enabledPath) };
      } else {
        const disabledPath = filePath + '.disabled';
        fs.renameSync(filePath, disabledPath);
        return { enabled: false, newFilename: filename + '.disabled' };
      }
    } catch (e) {
      return { error: e.message };
    }
  });

  // ── Open folders ──────────────────────────────────────────────────────────
  ipcMain.handle('open-mods-folder', () => {
    const cfg = configModule.load();
    const modsDir = path.join(cfg.minecraftPath, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
    shell.openPath(modsDir);
  });

  ipcMain.handle('open-game-folder', () => {
    const cfg = configModule.load();
    if (!fs.existsSync(cfg.minecraftPath)) fs.mkdirSync(cfg.minecraftPath, { recursive: true });
    shell.openPath(cfg.minecraftPath);
  });

  // ── Select directory dialog ───────────────────────────────────────────────
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Choisir le dossier Minecraft',
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // ── Reset config ──────────────────────────────────────────────────────────
  ipcMain.handle('reset-config', () => {
    const cfg = configModule.load();
    const fresh = configModule.getDefaults();
    fresh.msAccount = cfg.msAccount;
    fresh.savedAccounts = cfg.savedAccounts || [];
    configModule.save(fresh);
    return fresh;
  });

  // ── News from GitHub ──────────────────────────────────────────────────────
  ipcMain.handle('get-news', async () => {
    try {
      const cfg = configModule.load();
      const { fetchJSON } = require('./src/http');
      const file = await fetchJSON(`https://api.github.com/repos/${cfg.githubRepo}/contents/news.json`);
      const content = Buffer.from(file.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    } catch (_) {
      return [];
    }
  });

  // ── Announcements from GitHub ─────────────────────────────────────────────
  // Format attendu dans announcements.json du repo :
  // [{ "id": "promo-1", "active": true, "title": "...", "message": "...", "type": "promo", "url": "https://..." }]
  ipcMain.handle('get-announcements', async () => {
    try {
      const cfg = configModule.load();
      const { fetchJSON } = require('./src/http');
      const file = await fetchJSON(`https://api.github.com/repos/${cfg.githubRepo}/contents/announcements.json`);
      const content = Buffer.from(file.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    } catch (_) {
      return [];
    }
  });

  // ── Microsoft auth ────────────────────────────────────────────────────────
  const { openAuthWindow, fullAuthFromCode, refreshAuth } = require('./src/msauth');

  ipcMain.handle('ms-auth-start', async () => {
    try {
      const code    = await openAuthWindow(mainWindow);
      const account = await fullAuthFromCode(code);
      return { success: true, account };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ms-auth-refresh', async (_e, refreshToken) => {
    try {
      const account = await refreshAuth(refreshToken);
      return { success: true, account };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ── Sync mods + configs ───────────────────────────────────────────────────
  const { launchMinecraft, syncMods, syncConfigs } = require('./src/launcher');
  const { applyModBan }                            = require('./src/modban');

  ipcMain.handle('sync-files', async (event) => {
    const cfg = configModule.load();
    if (!cfg.githubRepo) return { success: true };

    const mcPath    = cfg.minecraftPath;
    const modsDir   = path.join(mcPath, 'mods');
    const configDir = path.join(mcPath, 'config');
    const send      = d => event.sender.send('launch-data', d);
    const onSyncProgress = d => event.sender.send('sync-progress', d);

    if (!fs.existsSync(modsDir))   fs.mkdirSync(modsDir,   { recursive: true });
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    try {
      await syncMods({ githubRepo: cfg.githubRepo, modsDir, onData: send, onProgress: onSyncProgress });
      await syncConfigs({ githubRepo: cfg.githubRepo, configDir, remoteConfigPath: 'mods/config', onData: send });
      return { success: true };
    } catch (e) {
      console.error('[sync-files] erreur:', e.message);
      return { success: false, error: e.message };
    }
  });

  // ── Cancel launch ─────────────────────────────────────────────────────────
  ipcMain.handle('cancel-launch', () => {
    cancelRequested = true;
    const pidToKill = activeGamePid;
    activeClient  = null;
    activeGamePid = null;

    if (pidToKill) {
      try {
        if (process.platform === 'win32') {
          require('child_process').execSync(
            `taskkill /F /T /PID ${pidToKill}`,
            { stdio: 'ignore' }
          );
        } else {
          process.kill(-pidToKill, 'SIGKILL');
        }
      } catch (_) {}
    }

    return { killed: !!pidToKill };
  });

  // ── Minecraft launch ──────────────────────────────────────────────────────
  ipcMain.handle('launch-game', async (event, opts) => {
    const cfg = configModule.load();
    let msAccount = cfg.msAccount;

    if (!msAccount) return { success: false, error: 'Compte Microsoft non connecté.' };

    if (!msAccount.expiresAt || Date.now() > msAccount.expiresAt - 60000) {
      try {
        const res = await refreshAuth(msAccount.refreshToken);
        msAccount = res;
        configModule.save({ ...cfg, msAccount });
      } catch (_) {
        return { success: false, error: 'Session expirée. Reconnectez votre compte Microsoft.' };
      }
    }

    cancelRequested = false;
    activeGamePid   = null;

    const modsFolder   = path.join(cfg.minecraftPath, 'mods');
    const modBanFolder = path.join(__dirname, 'mod_ban');
    const banResult    = applyModBan(modsFolder, modBanFolder);

    try {
      discord?.setDownloading();

      activeClient = await launchMinecraft({
        mcToken:    msAccount.mcToken,
        uuid:       msAccount.uuid,
        name:       msAccount.name,
        mcPath:     cfg.minecraftPath,
        version:    opts.version || cfg.minecraftVersion,
        maxRam:     opts.maxRam  || cfg.maxRam,
        minRam:     opts.minRam  || cfg.minRam,
        jvmArgs:    cfg.jvmArgs  || '',
        onProgress: data => { if (!cancelRequested) event.sender.send('launch-progress', data); },
        onData:     data => { if (!cancelRequested) event.sender.send('launch-data', data); },
        onClose:    code => {
          if (cancelRequested) { cancelRequested = false; return; }
          activeClient  = null;
          activeGamePid = null;
          discord?.setIdle();
          event.sender.send('launch-close', code);
          if (cfg.closeLauncherOnStart && mainWindow) mainWindow.show();
        },
        onError:    err  => {
          if (cancelRequested) { cancelRequested = false; return; }
          activeClient  = null;
          activeGamePid = null;
          discord?.setIdle();
          event.sender.send('launch-error', { message: err?.message || String(err) });
        },
      });

      // Capture le PID du processus Java dès qu'il est spawn
      const pidWatcher = setInterval(() => {
        if (!activeClient) { clearInterval(pidWatcher); return; }
        const pid = activeClient.proc?.pid;
        if (pid) {
          activeGamePid = pid;
          clearInterval(pidWatcher);
        }
      }, 100);
      setTimeout(() => clearInterval(pidWatcher), 120000);

      discord?.setPlaying(msAccount.name);

      if (cfg.closeLauncherOnStart && mainWindow) {
        setTimeout(() => mainWindow.minimize(), 2000);
      }

      return { success: true, bannedMods: banResult.deleted };
    } catch (e) {
      activeClient  = null;
      activeGamePid = null;
      discord?.setIdle();
      return { success: false, error: e.message };
    }
  });

  // ── Auto-updater ──────────────────────────────────────────────────────────
  let pendingInstallerPath = null;

  ipcMain.on('updater-install', () => {
    if (pendingInstallerPath) {
      shell.openPath(pendingInstallerPath).then(() => { isQuitting = true; app.quit(); });
    }
  });

  if (app.isPackaged) {
    const { checkForUpdates, downloadUpdate } = require('./src/updater');

    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const info = await checkForUpdates(app.getVersion());
        if (!info.available) return;

        mainWindow?.webContents.send('updater-available', { version: info.version });

        const dest = path.join(app.getPath('temp'), info.assetName);
        await downloadUpdate(info.installerUrl, dest, percent => {
          mainWindow?.webContents.send('updater-progress', { percent });
        });

        pendingInstallerPath = dest;
        mainWindow?.webContents.send('updater-ready', { version: info.version });
      } catch (e) {
        console.error('[updater]', e.message);
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    discord?.destroy();
    app.quit();
  }
});
