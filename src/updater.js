const https = require('https');

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
  try {
    const profile = await fetchJSON(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (profile && profile.id) {
      return `https://crafatar.com/skins/${profile.id}?overlay`;
    }
  } catch (_) {}
  return null;
}

module.exports = { checkForUpdates, getSkinUrl };
