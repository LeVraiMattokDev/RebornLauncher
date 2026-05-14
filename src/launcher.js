const { Client } = require('minecraft-launcher-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { fetchJSON, downloadFile } = require('./http');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function syncMods({ githubRepo, modsDir, onData, onProgress }) {
  const msg = (m) => onData && onData({ type: 'debug', msg: m });
  const manifestPath = path.join(modsDir, '.reborn-manifest.json');
  let manifest = {};
  try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch (_) {}

  ensureDir(modsDir);

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

  let downloaded = 0;
  for (let i = 0; i < remoteJars.length; i++) {
    const remote = remoteJars[i];
    const dest = path.join(modsDir, remote.name);

    if (onProgress) onProgress({ current: i + 1, total: remoteJars.length, name: remote.name });

    // Skip if SHA matches and file exists locally
    if (manifest[remote.name] === remote.sha && fs.existsSync(dest)) {
      msg(`${remote.name} à jour.`);
      continue;
    }

    msg(`Sync : ${remote.name}…`);
    const dlUrl = `https://media.githubusercontent.com/media/${githubRepo}/HEAD/${remote.path}`;
    try {
      await downloadFile(dlUrl, dest);
    } catch (_) {
      await downloadFile(remote.download_url, dest);
    }
    manifest[remote.name] = remote.sha;
    downloaded++;
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
  msg(`Mods synchronisés (${downloaded} téléchargé${downloaded !== 1 ? 's' : ''}, ${remoteJars.length} total).`);
}

async function listGitHubFilesRecursive(githubRepo, remotePath) {
  const entries = await fetchJSON(`https://api.github.com/repos/${githubRepo}/contents/${remotePath}`);
  if (!Array.isArray(entries)) return [];
  const files = [];
  for (const entry of entries) {
    if (entry.type === 'file') {
      files.push(entry);
    } else if (entry.type === 'dir') {
      const sub = await listGitHubFilesRecursive(githubRepo, entry.path);
      files.push(...sub);
    }
  }
  return files;
}

async function syncConfigs({ githubRepo, configDir, remoteConfigPath = 'config', onData }) {
  const msg = (m) => onData && onData({ type: 'debug', msg: m });

  try {
    const check = await fetchJSON(`https://api.github.com/repos/${githubRepo}/contents/${remoteConfigPath}`);
    if (!Array.isArray(check)) return;
  } catch (_) {
    return;
  }

  const manifestPath = path.join(configDir, '.reborn-config-manifest.json');
  let manifest = {};
  try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch (_) {}

  msg('Vérification des configs depuis GitHub…');

  let remoteFiles;
  try {
    remoteFiles = await listGitHubFilesRecursive(githubRepo, remoteConfigPath);
  } catch (e) {
    msg(`Impossible de récupérer les configs : ${e.message}`);
    return;
  }

  const prefix = remoteConfigPath.endsWith('/') ? remoteConfigPath : remoteConfigPath + '/';

  let count = 0;
  for (const remote of remoteFiles) {
    const relPath = remote.path.startsWith(prefix)
      ? remote.path.slice(prefix.length)
      : remote.path;
    const dest = path.join(configDir, relPath);

    // Skip if SHA matches and file exists
    if (manifest[relPath] === remote.sha && fs.existsSync(dest)) continue;

    ensureDir(path.dirname(dest));
    msg(`Sync config : ${relPath}…`);
    const dlUrl = `https://media.githubusercontent.com/media/${githubRepo}/HEAD/${remote.path}`;
    try {
      await downloadFile(dlUrl, dest);
    } catch (_) {
      await downloadFile(remote.download_url, dest);
    }
    manifest[relPath] = remote.sha;
    count++;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  if (count > 0) msg(`${count} fichier${count !== 1 ? 's' : ''} de config mis à jour.`);
  else msg('Configs à jour.');
}

function findJava() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return null;
  } catch (_) {}

  if (process.env.JAVA_HOME) {
    const bin = path.join(process.env.JAVA_HOME, 'bin',
      process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(bin)) return bin;
  }

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

async function launchMinecraft({ mcToken, uuid, name, mcPath, version, maxRam, minRam, jvmArgs, onProgress, onData, onClose, onError }) {
  const client = new Client();

  ensureDir(mcPath);
  ensureDir(path.join(mcPath, 'mods'));
  ensureDir(path.join(mcPath, 'config'));

  const auth = {
    access_token: mcToken,
    client_token: uuid,
    uuid,
    name,
    user_properties: '{}',
  };

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
  if (jvmArgs) {
    opts.customArgs = jvmArgs.split(/\s+/).filter(Boolean);
  }

  client.on('progress', data => onProgress && onProgress(data));
  client.on('download-status', data => onData && onData({ type: 'download', ...data }));
  client.on('debug', msg => onData && onData({ type: 'debug', msg: String(msg) }));
  client.on('data', data => onData && onData({ type: 'stdout', msg: String(data) }));
  client.on('close', code => onClose && onClose(code));
  client.on('error', err => onError && onError(err));

  client.launch(opts).catch(err => onError && onError(err));

  return client;
}

module.exports = { launchMinecraft, syncMods, syncConfigs, findJava };
