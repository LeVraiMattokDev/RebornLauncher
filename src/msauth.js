const { BrowserWindow } = require('electron');
const https = require('https');

const CLIENT_ID = '00000000402b5328';
const REDIRECT  = 'https://login.live.com/oauth20_desktop.srf';
const SCOPE     = 'service::user.auth.xboxlive.com::MBI_SSL';

function postForm(hostname, path, params) {
  const data = new URLSearchParams(params).toString();
  return postRaw(hostname, path, data, 'application/x-www-form-urlencoded');
}

function postJson(hostname, path, body, extraHeaders) {
  return postRaw(hostname, path, JSON.stringify(body), 'application/json', extraHeaders);
}

function postRaw(hostname, path, data, contentType, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(data),
        Accept: 'application/json',
        ...extraHeaders,
      },
    }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (_) { reject(new Error(`Réponse serveur invalide : ${d.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { Accept: 'application/json', ...headers },
    }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (_) { reject(new Error(`Réponse serveur invalide : ${d.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function exchangeCode(code) {
  return postForm('login.live.com', '/oauth20_token.srf', {
    client_id: CLIENT_ID,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT,
    scope: SCOPE,
  });
}

async function doRefreshToken(refreshToken) {
  return postForm('login.live.com', '/oauth20_token.srf', {
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    redirect_uri: REDIRECT,
    scope: SCOPE,
  });
}

async function getXblToken(msAccessToken) {
  const res = await postJson('user.auth.xboxlive.com', '/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: msAccessToken,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  });
  if (!res.Token) throw new Error('Impossible d\'obtenir le token Xbox Live.');
  const uhs = res.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) throw new Error('Réponse Xbox Live invalide (DisplayClaims manquant).');
  return { token: res.Token, uhs };
}

async function getXstsToken(xblToken) {
  const res = await postJson('xsts.auth.xboxlive.com', '/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  });
  if (res.XErr) {
    const known = {
      2148916233: 'Ce compte Microsoft n\'a pas de compte Xbox. Créez-en un sur xbox.com.',
      2148916235: 'Xbox Live n\'est pas disponible dans votre pays.',
      2148916236: 'Ce compte nécessite une vérification d\'adulte sur xbox.com.',
      2148916237: 'Ce compte nécessite une vérification d\'adulte sur xbox.com.',
      2148916238: 'Ce compte enfant doit être ajouté à une famille Xbox sur xbox.com.',
    };
    throw new Error(known[res.XErr] || `Erreur Xbox : ${res.XErr}`);
  }
  const xuhs = res.DisplayClaims?.xui?.[0]?.uhs;
  if (!xuhs) throw new Error('Réponse XSTS invalide (DisplayClaims manquant).');
  return { token: res.Token, uhs: xuhs };
}

async function getMcToken(uhs, xstsToken) {
  const res = await postJson('api.minecraftservices.com', '/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
  });
  if (!res.access_token) throw new Error('Impossible d\'obtenir le token Minecraft.');
  return res.access_token;
}

async function getMcProfile(mcToken) {
  const res = await getJson('api.minecraftservices.com', '/minecraft/profile', {
    Authorization: `Bearer ${mcToken}`,
  });
  if (res.error || !res.id) {
    throw new Error('Ce compte Microsoft ne possède pas Minecraft Java Edition.');
  }
  return { uuid: res.id, name: res.name };
}

async function authFromMSAccessToken(msAccessToken, refreshToken) {
  const xbl     = await getXblToken(msAccessToken);
  const xsts    = await getXstsToken(xbl.token);
  const mcToken = await getMcToken(xsts.uhs, xsts.token);
  const profile = await getMcProfile(mcToken);
  return {
    name: profile.name,
    uuid: profile.uuid,
    mcToken,
    refreshToken,
    expiresAt: Date.now() + 3500 * 1000,
  };
}

async function fullAuthFromCode(code) {
  const ms = await exchangeCode(code);
  if (ms.error) throw new Error(ms.error_description || ms.error);
  return authFromMSAccessToken(ms.access_token, ms.refresh_token);
}

async function refreshAuth(refreshToken) {
  const ms = await doRefreshToken(refreshToken);
  if (ms.error) throw new Error(ms.error_description || ms.error);
  return authFromMSAccessToken(ms.access_token, ms.refresh_token);
}

function openAuthWindow(parentWindow) {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://login.live.com/oauth20_authorize.srf` +
      `?client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPE)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT)}`;

    const win = new BrowserWindow({
      width: 520,
      height: 680,
      parent: parentWindow || undefined,
      modal: !!parentWindow,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
      title: 'Connexion Microsoft',
    });

    win.once('ready-to-show', () => win.show());

    let resolved = false;

    function handleUrl(url) {
      if (!url.startsWith(REDIRECT)) return;
      if (resolved) return;
      resolved = true;
      const u     = new URL(url);
      const code  = u.searchParams.get('code');
      const error = u.searchParams.get('error_description') || u.searchParams.get('error');
      win.close();
      if (code) resolve(code);
      else reject(new Error(error || 'Connexion annulée.'));
    }

    win.webContents.on('will-redirect', (_e, url) => handleUrl(url));
    win.webContents.on('will-navigate', (_e, url) => handleUrl(url));
    win.on('closed', () => {
      if (!resolved) { resolved = true; reject(new Error('Connexion annulée.')); }
    });

    win.loadURL(authUrl);
  });
}

module.exports = { openAuthWindow, fullAuthFromCode, refreshAuth };
