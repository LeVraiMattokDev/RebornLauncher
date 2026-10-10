const { fetchJSON, downloadFile } = require('./http');

const GITHUB_REPO = 'LeVraiMattokDev/RebornLauncher';

async function checkForUpdates(currentVersion) {
  try {
    const data = await fetchJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    const latest = (data.tag_name || '').replace(/^v/, '');
    if (!latest || latest === currentVersion) return { available: false };

    const ext = process.platform === 'win32' ? '.exe'
              : process.platform === 'darwin' ? '.dmg'
              : '.AppImage';
    const asset = (data.assets || []).find(a => a.name.endsWith(ext));
    if (!asset) return { available: false };

    return {
      available: true,
      version: latest,
      installerUrl: asset.browser_download_url,
      assetName: asset.name,
    };
  } catch (_) {
    return { available: false };
  }
}

function downloadUpdate(url, dest, onProgress) {
  return downloadFile(url, dest, onProgress);
}

async function getSkinUrl(username) {
  // minotar.net : accepte directement le username, pas de lookup UUID requis
  return `https://minotar.net/skin/${encodeURIComponent(username)}`;
}

module.exports = { checkForUpdates, downloadUpdate, getSkinUrl };
