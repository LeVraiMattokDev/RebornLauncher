const { fetchJSON, downloadFile } = require('./http');

const GITHUB_REPO = 'LeVraiMattokDev/RebornLauncher';

async function checkForUpdates(currentVersion) {
  try {
    const data = await fetchJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    const latest = (data.tag_name || '').replace(/^v/, '');
    if (!latest || latest === currentVersion) return { available: false };

    const asset = (data.assets || []).find(a => a.name.endsWith('.exe'));
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
  try {
    const profile = await fetchJSON(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (profile && profile.id) {
      return `https://crafatar.com/skins/${profile.id}?overlay`;
    }
  } catch (_) {}
  return null;
}

module.exports = { checkForUpdates, downloadUpdate, getSkinUrl };
