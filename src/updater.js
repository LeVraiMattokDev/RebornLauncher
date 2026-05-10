const https = require('https');
const crypto = require('crypto');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RebornSMP-Launcher/1.0.0' } }, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.substring(0, 100)}`)); }
      });
    }).on('error', reject);
  });
}

async function checkForUpdates(currentVersion, githubRepo) {
  try {
    const data = await fetchJSON(`https://api.github.com/repos/${githubRepo}/releases/latest`);
    const latest = (data.tag_name || '').replace(/^v/, '');
    if (latest && latest !== currentVersion) {
      return { available: true, version: latest, url: data.html_url || '', notes: data.body || '' };
    }
    return { available: false };
  } catch (e) {
    return { available: false };
  }
}

async function getSkinUrl(username) {
  // Try real Mojang UUID first (works for users registered on Mojang)
  try {
    const profile = await fetchJSON(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (profile && profile.id) {
      return `https://crafatar.com/skins/${profile.id}?overlay`;
    }
  } catch (_) {}

  // Offline UUID: nameUUIDFromBytes(MD5("OfflinePlayer:" + name))
  const md5 = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  md5[6] = (md5[6] & 0x0f) | 0x30;
  md5[8] = (md5[8] & 0x3f) | 0x80;
  const uuid = [
    md5.subarray(0, 4),
    md5.subarray(4, 6),
    md5.subarray(6, 8),
    md5.subarray(8, 10),
    md5.subarray(10, 16),
  ].map(b => b.toString('hex')).join('-');

  return `https://crafatar.com/skins/${uuid}?overlay`;
}

module.exports = { checkForUpdates, getSkinUrl };
