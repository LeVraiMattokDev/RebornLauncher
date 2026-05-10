/* global React, ReactDOM,
   TopBar, Sidebar, StatusBar, AuthScreen,
   HomeScreen, ModsScreen, ProfileScreen, StoreScreen,
   AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay */

const { useState, useEffect } = React;

function UpdateBanner({ update, onDismiss }) {
  const { status, version, percent } = update;

  if (status === 'available') return (
    <div className="update-banner">
      <span className="update-dot" />
      <span>Mise à jour disponible : <b>v{version}</b></span>
      <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }}
        onClick={() => window.electronAPI.updaterDownload()}>
        Télécharger
      </button>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: 4 }} onClick={onDismiss}>
        Ignorer
      </button>
    </div>
  );

  if (status === 'downloading') return (
    <div className="update-banner">
      <span className="update-dot" />
      <span>Téléchargement v{version}… <b>{percent}%</b></span>
      <div style={{ flex: 1, maxWidth: 120, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, marginLeft: 12 }}>
        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  if (status === 'ready') return (
    <div className="update-banner">
      <span className="update-dot" style={{ background: 'var(--green)' }} />
      <span>v{version} prête à installer</span>
      <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }}
        onClick={() => window.electronAPI.updaterInstall()}>
        Redémarrer
      </button>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: 4 }} onClick={onDismiss}>
        Plus tard
      </button>
    </div>
  );

  return null;
}

function App() {
  const [config, setConfig]       = useState(null);
  const [authed, setAuthed]       = useState(false);
  const [msAccount, setMsAccount] = useState(null);
  const [skinUrl, setSkinUrl]     = useState(null);
  const [screen, setScreen]       = useState('home');
  const [update, setUpdate] = useState(null);
  const [launchState, setLaunchState] = useState({ running: false, progress: 0, stage: '', logs: [] });
  const [showLaunch, setShowLaunch]   = useState(false);
  const [serverInfo, setServerInfo]   = useState({ online: false, players: 0, maxPlayers: 3000, latency: 0 });

  // Boot: load config, auto-refresh MS token if saved
  useEffect(() => {
    window.electronAPI.getConfig().then(async cfg => {
      setConfig(cfg);
      const saved = cfg.msAccount;
      if (!saved) return;

      const isExpired = !saved.expiresAt || Date.now() > saved.expiresAt - 60000;
      if (isExpired) {
        try {
          const res = await window.electronAPI.msAuthRefresh(saved.refreshToken);
          if (res.success) {
            const newCfg = { ...cfg, msAccount: res.account };
            setConfig(newCfg);
            window.electronAPI.saveConfig(newCfg);
            setMsAccount(res.account);
            setAuthed(true);
            window.electronAPI.getSkinUrl(res.account.name).then(setSkinUrl);
          }
        } catch (_) { /* token invalid — show auth screen */ }
      } else {
        setMsAccount(saved);
        setAuthed(true);
        window.electronAPI.getSkinUrl(saved.name).then(setSkinUrl);
      }
    });
  }, []);

  // Auto-updater events
  useEffect(() => {
    window.electronAPI.on('updater-available', ({ version }) =>
      setUpdate(u => u?.status === 'downloading' || u?.status === 'ready' ? u : { status: 'available', version, percent: 0 }));
    window.electronAPI.on('updater-progress', ({ percent }) =>
      setUpdate(u => u ? { ...u, status: 'downloading', percent } : u));
    window.electronAPI.on('updater-ready', ({ version }) =>
      setUpdate({ status: 'ready', version, percent: 100 }));
  }, []);

  // Ping server on mount and every 30s
  useEffect(() => {
    const ping = () => {
      window.electronAPI.pingServer().then(info => {
        setServerInfo({ online: info.online, players: info.players, maxPlayers: info.maxPlayers || 3000, latency: info.latency });
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to launch events
  useEffect(() => {
    window.electronAPI.on('launch-progress', (data) => {
      const pct   = data.total > 0 ? Math.round((data.task / data.total) * 100) : 0;
      const label = { assets: 'assets', client: 'client', natives: 'natives', download: 'téléchargement' };
      const stage = `Téléchargement ${label[data.type] || data.type}… ${pct}%`;
      setLaunchState(s => ({ ...s, progress: pct, stage,
        logs: [...s.logs, { ts: timestamp(), msg: stage, ok: true }].slice(-20) }));
    });

    window.electronAPI.on('launch-data', (data) => {
      if (data.type === 'debug') {
        setLaunchState(s => ({
          ...s, stage: data.msg,
          logs: [...s.logs, { ts: timestamp(), msg: data.msg }].slice(-20)
        }));
      }
    });

    window.electronAPI.on('launch-close', (code) => {
      setLaunchState(s => ({
        ...s, running: false, progress: 100, stage: `Jeu fermé (code ${code}).`,
        logs: [...s.logs, { ts: timestamp(), msg: `Processus terminé avec le code ${code}.`, ok: code === 0 }]
      }));
      setTimeout(() => setShowLaunch(false), 2000);
    });

    window.electronAPI.on('launch-error', (err) => {
      setLaunchState(s => ({
        ...s, running: false, stage: `Erreur : ${err.message}`,
        logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${err.message}`, ok: false }]
      }));
    });
  }, []);

  function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', { hour12: false });
  }

  function handleAuth(account) {
    setMsAccount(account);
    setAuthed(true);
    window.electronAPI.getSkinUrl(account.name).then(setSkinUrl);
    const newCfg = { ...config, msAccount: account };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  function handleLogout() {
    setMsAccount(null);
    setAuthed(false);
    setSkinUrl(null);
    const newCfg = { ...config, msAccount: null };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  async function handlePlay() {
    // flushSync garantit le rendu de l'overlay AVANT tout await
    ReactDOM.flushSync(() => {
      setShowLaunch(true);
      setLaunchState({
        running: true, progress: 0, stage: 'Vérification des mods…',
        logs: [{ ts: timestamp(), msg: 'Synchronisation des mods et configs…', ok: true }]
      });
    });

    try {
      // Phase 1 : sync mods + configs
      const syncRes = await window.electronAPI.syncFiles();
      if (!syncRes.success) {
        setLaunchState(s => ({
          ...s, running: false, stage: `Erreur sync : ${syncRes.error}`,
          logs: [...s.logs, { ts: timestamp(), msg: `ERREUR sync : ${syncRes.error}`, ok: false }]
        }));
        return;
      }

      // Phase 2 : lancement
      setLaunchState(s => ({
        ...s, stage: 'Démarrage du jeu…',
        logs: [...s.logs, { ts: timestamp(), msg: `Lancement en tant que ${msAccount?.name}…`, ok: true }]
      }));

      const res = await window.electronAPI.launchGame({
        version: config.minecraftVersion,
        maxRam:  config.maxRam,
        minRam:  config.minRam,
      });

      if (!res.success) {
        setLaunchState(s => ({
          ...s, running: false, stage: `Erreur : ${res.error}`,
          logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${res.error}`, ok: false }]
        }));
      } else if (res.bannedMods && res.bannedMods.length > 0) {
        setLaunchState(s => ({
          ...s,
          logs: [...s.logs, { ts: timestamp(), msg: `Mods bannis supprimés : ${res.bannedMods.join(', ')}`, ok: true }]
        }));
      }
    } catch (e) {
      setLaunchState(s => ({
        ...s, running: false, stage: `Erreur : ${e.message}`,
        logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${e.message}`, ok: false }]
      }));
    }
  }

  function handleConfigSave(updates) {
    const newCfg = { ...config, ...updates };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  if (!config) return null;
  if (!authed) return <AuthScreen onAuth={handleAuth} />;

  const username = msAccount?.name || '';
  const user = { name: username, initials: username[0]?.toUpperCase() || '?', rank: 'JOUEUR' };

  const renderScreen = () => {
    switch (screen) {
      case 'home':     return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} />;
      case 'mods':     return <ModsScreen />;
      case 'profiles': return <ProfileScreen config={config} onSave={handleConfigSave} />;
      case 'store':    return <StoreScreen />;
      case 'account':  return <AccountScreen msAccount={msAccount} onLogout={handleLogout} />;
      case 'logs':     return <LogsScreen />;
      default:         return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} />;
    }
  };

  return (
    <>
      {update && <UpdateBanner update={update} onDismiss={() => setUpdate(null)} />}
      <div className="app" style={{ marginTop: update ? 32 : 0 }}>
        <TopBar user={user} onNav={setScreen} />
        <Sidebar active={screen} onNav={setScreen} />
        <main className="main">{renderScreen()}</main>
        <StatusBar ping={serverInfo.latency} server={{ up: serverInfo.online, players: serverInfo.players, max: serverInfo.maxPlayers }} />
      </div>
      {showLaunch && (
        <LaunchOverlay
          state={launchState}
          onClose={() => { if (!launchState.running) setShowLaunch(false); }}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
