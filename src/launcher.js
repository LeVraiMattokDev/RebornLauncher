const { Client, Authenticator } = require('minecraft-launcher-core');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RebornMC-Launcher/1.0.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.substring(0, 60)}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) => https.get(u, { headers: { 'User-Agent': 'RebornMC-Launcher/1.0.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return get(res.headers.location);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    get(url);
  });
}

async function syncMods({ githubRepo, modsDir, onData }) {
  const msg = (m) => onData && onData({ type: 'debug', msg: m });
  const manifestPath = path.join(modsDir, '.reborn-manifest.json');
  let manifest = {};
  try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch (_) {}

  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  msg('Vérification des mods depuis GitHub…');
  let remoteFiles;
  try {
    remoteFiles = await fetchJSON(`https://api.github.com/repos/${githubRepo}/contents/mods`);
  } catch (e) {
    msg(`Impossible de récupérer les mods : ${e.message}`);
    return;
  }

  if (!Array.isArray(remoteFiles)) { msg('Dossier mods introuvable dans le dépôt.'); return; }

  const remoteJars = remoteFiles.filter(f => f.type === 'file' && f.name.endsWith('.jar'));
  const remoteNames = new Set(remoteJars.map(f => f.name));

  // Télécharger mods manquants ou modifiés
  for (const remote of remoteJars) {
    const dest = path.join(modsDir, remote.name);
    if (fs.existsSync(dest) && manifest[remote.name] === remote.sha) continue;
    msg(`Téléchargement : ${remote.name}…`);
    await downloadFile(remote.download_url, dest);
    manifest[remote.name] = remote.sha;
    msg(`${remote.name} installé.`);
  }

  // Supprimer mods retirés du dépôt
  const localJars = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));
  for (const local of localJars) {
    if (!remoteNames.has(local)) {
      fs.unlinkSync(path.join(modsDir, local));
      delete manifest[local];
      msg(`Mod retiré : ${local}`);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  msg(`Mods synchronisés (${remoteJars.length} mod${remoteJars.length !== 1 ? 's' : ''}).`);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function findJava() {
  // Essai via PATH
  try {
    execSync('java -version', { stdio: 'ignore' });
    return null; // null = utiliser java du PATH
  } catch (_) {}

  // Essai JAVA_HOME
  if (process.env.JAVA_HOME) {
    const bin = path.join(process.env.JAVA_HOME, 'bin',
      process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(bin)) return bin;
  }

  // Chemins courants Windows
  if (process.platform === 'win32') {
    const bases = [
      path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Java'),
      path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Eclipse Adoptium'),
      path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft'),
      path.join(process.env['ProgramW6432'] || 'C:\\Program Files', 'Java'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Eclipse Adoptium'),
    ];
    for (const base of bases) {
      if (!fs.existsSync(base)) continue;
      for (const dir of fs.readdirSync(base)) {
        const bin = path.join(base, dir, 'bin', 'java.exe');
        if (fs.existsSync(bin)) return bin;
      }
    }
  }

  throw new Error(
    'Java introuvable. Installez Java 21 depuis https://adoptium.net puis relancez.'
  );
}

async function ensureFabric(mcPath, mcVersion, onData) {
  const loaders = await fetchJSON('https://meta.fabricmc.net/v2/versions/loader');
  const latestLoader = (loaders.find(l => l.stable) || loaders[0]).version;

  const fabricId = `fabric-loader-${latestLoader}-${mcVersion}`;
  const versionDir = path.join(mcPath, 'versions', fabricId);
  const profilePath = path.join(versionDir, `${fabricId}.json`);

  if (!fs.existsSync(profilePath)) {
    if (onData) onData({ type: 'debug', msg: `Installation Fabric ${latestLoader} pour ${mcVersion}…` });
    ensureDir(versionDir);
    const profile = await fetchJSON(
      `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${latestLoader}/profile/json`
    );
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    if (onData) onData({ type: 'debug', msg: 'Fabric installé.' });
  }

  return fabricId;
}

async function launchMinecraft({ username, mcPath, version, maxRam, minRam, githubRepo, onProgress, onData, onClose, onError }) {
  const client = new Client();

  ensureDir(mcPath);
  ensureDir(path.join(mcPath, 'mods'));

  const auth = Authenticator.getAuth(username);

  if (githubRepo) {
    await syncMods({ githubRepo, modsDir: path.join(mcPath, 'mods'), onData });
  }

  if (onData) onData({ type: 'debug', msg: 'Vérification Java…' });
  const javaPath = findJava();

  if (onData) onData({ type: 'debug', msg: 'Vérification Fabric…' });
  const fabricId = await ensureFabric(mcPath, version, onData);

  const opts = {
    authorization: auth,
    root: mcPath,
    version: {
      number: version,
      type: 'release',
      custom: fabricId,
    },
    memory: {
      max: `${maxRam}G`,
      min: `${minRam}G`,
    },
  };

  if (javaPath) opts.javaPath = javaPath;

  client.on('progress', data => onProgress && onProgress(data));
  client.on('download-status', data => onData && onData({ type: 'download', ...data }));
  client.on('debug', msg => onData && onData({ type: 'debug', msg: String(msg) }));
  client.on('data', data => onData && onData({ type: 'stdout', msg: String(data) }));
  client.on('close', code => onClose && onClose(code));
  client.on('error', err => onError && onError(err));

  client.launch(opts).catch(err => onError && onError(err));

  return client;
}

module.exports = { launchMinecraft };
