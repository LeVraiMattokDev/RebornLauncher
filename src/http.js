const https = require('https');
const fs = require('fs');
const { version: PKG_VERSION } = require('../package.json');

const USER_AGENT = `RebornMC-Launcher/${PKG_VERSION}`;

function fetchJSON(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Trop de redirections'));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return fetchJSON(res.headers.location, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          let msg = `HTTP ${res.statusCode}`;
          try { const j = JSON.parse(data); if (j.message) msg += ` : ${j.message}`; } catch (_) {}
          return reject(new Error(msg));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON invalide : ${data.substring(0, 60)}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    function attempt(u, redirects = 0) {
      if (redirects > 5) return reject(new Error('Trop de redirections'));
      if (!u) return reject(new Error('URL de téléchargement invalide'));
      https.get(u, { headers: { 'User-Agent': USER_AGENT } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return attempt(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} pour ${u}`));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = fs.createWriteStream(dest);
        res.on('data', chunk => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0 && onProgress) onProgress(Math.round((downloaded / total) * 100));
        });
        res.on('end', () => file.end(() => resolve()));
        res.on('error', err => { file.destroy(); fs.unlink(dest, () => {}); reject(err); });
        file.on('error', err => { file.destroy(); fs.unlink(dest, () => {}); reject(err); });
      }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    }
    attempt(url);
  });
}

module.exports = { fetchJSON, downloadFile, USER_AGENT };
