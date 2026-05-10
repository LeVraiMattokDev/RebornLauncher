const https = require('https');
const fs    = require('fs');

const GITHUB_REPO = 'LeVraiMattokDev/RebornLauncher';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RebornMC-Launcher/1.0.3' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (_) { reject(new Error(`JSON invalide : ${data.slice(0, 60)}`)); }
      });
    }).on('error', reject);
  });
}

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
  return new Promise((resolve, reject) => {
    function attempt(u) {
      https.get(u, { headers: { 'User-Agent': 'RebornMC-Launcher/1.0.3' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return attempt(res.headers.location);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const total      = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded   = 0;
        const file       = fs.createWriteStream(dest);

        res.on('data', chunk => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0 && onProgress) onProgress(Math.round((downloaded / total) * 100));
        });
        res.on('end',   () => file.end(resolve));
        res.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
        file.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
      }).on('error', reject);
    }
    attempt(url);
  });
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
