const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs   = require('fs');
const net  = require('net');

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

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0B0E14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // ── Window controls ──────────────────────────────────────────────────────
  ipcMain.on('window-close',    () => mainWindow?.close());
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });

  // ── Config ───────────────────────────────────────────────────────────────
  const configModule = require('./src/config');
  ipcMain.handle('get-config',  ()        => configModule.load());
  ipcMain.handle('save-config', (_e, cfg) => { configModule.save(cfg); return true; });

  // ── Skin lookup ───────────────────────────────────────────────────────────
  const { getSkinUrl } = require('./src/updater');
  ipcMain.handle('get-skin-url', (_e, username) => getSkinUrl(username));

  // ── Update check ─────────────────────────────────────────────────────────
  const { checkForUpdates } = require('./src/updater');
  ipcMain.handle('check-updates', async () => {
    const cfg = configModule.load();
    return checkForUpdates(app.getVersion(), cfg.githubRepo);
  });

  ipcMain.handle('open-url', (_e, url) => { shell.openExternal(url); });

  // ── Server ping ───────────────────────────────────────────────────────────
  ipcMain.handle('ping-server', async () => {
    try {
      return await pingMinecraft('play.rebornmc.fr');
    } catch (e) {
      return { online: false, players: 0, maxPlayers: 0, latency: 0 };
    }
  });

  // ── Mod list ──────────────────────────────────────────────────────────────
  ipcMain.handle('list-mods', () => {
    const cfg = configModule.load();
    const modsDir = path.join(cfg.minecraftPath, 'mods');
    if (!fs.existsSync(modsDir)) return [];
    try {
      return fs.readdirSync(modsDir)
        .filter(f => f.endsWith('.jar'))
        .map(f => {
          const stat = fs.statSync(path.join(modsDir, f));
          return {
            name:     f.replace(/\.jar$/, ''),
            filename: f,
            size:     (stat.size / (1024 * 1024)).toFixed(1) + ' Mo',
          };
        });
    } catch (_) { return []; }
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

  // ── Minecraft launch ──────────────────────────────────────────────────────
  const { launchMinecraft } = require('./src/launcher');
  const { applyModBan }     = require('./src/modban');

  ipcMain.handle('launch-game', async (event, opts) => {
    const cfg = configModule.load();
    let msAccount = cfg.msAccount;

    if (!msAccount) return { success: false, error: 'Compte Microsoft non connecté.' };

    // Refresh token if expired or close to expiry
    if (!msAccount.expiresAt || Date.now() > msAccount.expiresAt - 60000) {
      try {
        const res = await refreshAuth(msAccount.refreshToken);
        msAccount = res;
        configModule.save({ ...cfg, msAccount });
      } catch (_) {
        return { success: false, error: 'Session expirée. Reconnectez votre compte Microsoft.' };
      }
    }

    const modsFolder   = path.join(cfg.minecraftPath, 'mods');
    const modBanFolder = path.join(__dirname, 'mod_ban');
    const banResult    = applyModBan(modsFolder, modBanFolder);

    try {
      await launchMinecraft({
        mcToken:    msAccount.mcToken,
        uuid:       msAccount.uuid,
        name:       msAccount.name,
        mcPath:     cfg.minecraftPath,
        version:    opts.version || cfg.minecraftVersion,
        maxRam:     opts.maxRam  || cfg.maxRam,
        minRam:     opts.minRam  || cfg.minRam,
        githubRepo: cfg.githubRepo,
        onProgress: data => event.sender.send('launch-progress', data),
        onData:     data => event.sender.send('launch-data', data),
        onClose:    code => event.sender.send('launch-close', code),
        onError:    err  => event.sender.send('launch-error', { message: err?.message || String(err) }),
      });
      return { success: true, bannedMods: banResult.deleted };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
