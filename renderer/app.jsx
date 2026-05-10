/* global React, ReactDOM,
   TopBar, Sidebar, StatusBar, AuthScreen,
   HomeScreen, ModsScreen, ProfileScreen, StoreScreen,
   AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay */

const { useState, useEffect } = React;

function UpdateBanner({ info, onDismiss }) {
  return (
    <div className="update-banner">
      <span className="update-dot" />
      <span>Mise à jour disponible : <b>v{info.version}</b></span>
      <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }}
        onClick={() => window.electronAPI.openUrl(info.url)}>
        Voir
      </button>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: 4 }} onClick={onDismiss}>
        Ignorer
      </button>
    </div>
  );
}

function App() {
  const [config, setConfig]         = useState(null);
  const [authed, setAuthed]         = useState(false);
  const [username, setUsername]     = useState('');
  const [skinUrl, setSkinUrl]       = useState(null);
  const [screen, setScreen]         = useState('home');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [launchState, setLaunchState] = useState({ running: false, progress: 0, stage: '', logs: [] });
  const [showLaunch, setShowLaunch] = useState(false);
  const [serverInfo, setServerInfo] = useState({ online: false, players: 0, maxPlayers: 3000, latency: 0 });

  // Boot: load config + migrate accounts
  useEffect(() => {
    window.electronAPI.getConfig().then(cfg => {
      // Migration : si username existant mais pas dans accounts, l'ajouter
      let accounts = cfg.accounts || [];
      if (cfg.username && !accounts.includes(cfg.username)) {
        accounts = [...accounts, cfg.username];
        cfg = { ...cfg, accounts };
        window.electronAPI.saveConfig(cfg);
      }
      setConfig(cfg);
      if (cfg.username) {
        setUsername(cfg.username);
        setAuthed(true);
        window.electronAPI.getSkinUrl(cfg.username).then(setSkinUrl);
      }
    });
  }, []);

  // Check updates after config loaded
  useEffect(() => {
    if (!config) return;
    window.electronAPI.checkUpdates().then(info => {
      if (info.available) setUpdateInfo(info);
    });
  }, [config]);

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
      const pct = data.total > 0 ? Math.round((data.task / data.total) * 100) : 0;
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

  function handleAuth(name) {
    setUsername(name);
    setAuthed(true);
    window.electronAPI.getSkinUrl(name).then(setSkinUrl);
    const accounts = (config.accounts || []);
    const newAccounts = accounts.includes(name) ? accounts : [...accounts, name];
    const newCfg = { ...config, username: name, accounts: newAccounts };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  function handleSwitchAccount(name) {
    setUsername(name);
    window.electronAPI.getSkinUrl(name).then(setSkinUrl);
    const newCfg = { ...config, username: name };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  function handleAddAccount(name) {
    const accounts = config.accounts || [];
    if (accounts.includes(name)) return;
    const newCfg = { ...config, accounts: [...accounts, name] };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  function handleRemoveAccount(name) {
    const accounts = (config.accounts || []).filter(a => a !== name);
    let newCfg = { ...config, accounts };
    if (name === username && accounts.length > 0) {
      newCfg.username = accounts[0];
      setUsername(accounts[0]);
      window.electronAPI.getSkinUrl(accounts[0]).then(setSkinUrl);
    }
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  function handlePlay() {
    setShowLaunch(true);
    setLaunchState({
      running: true, progress: 0, stage: 'Démarrage…',
      logs: [{ ts: timestamp(), msg: `Connexion en tant que ${username}…`, ok: true }]
    });
    window.electronAPI.launchGame({
      username,
      version:      config.minecraftVersion,
      maxRam:       config.maxRam,
      minRam:       config.minRam,
    }).then(res => {
      if (!res.success) {
        setLaunchState(s => ({
          ...s, running: false, stage: `Erreur : ${res.error}`,
          logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${res.error}`, ok: false }]
        }));
      } else if (res.bannedMods && res.bannedMods.length > 0) {
        setLaunchState(s => ({
          ...s,
          logs: [...s.logs, {
            ts: timestamp(),
            msg: `Mods bannis supprimés : ${res.bannedMods.join(', ')}`,
            ok: true
          }]
        }));
      }
    });
  }

  function handleConfigSave(updates) {
    const newCfg = { ...config, ...updates };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
  }

  if (!config) return null;
  if (!authed) return <AuthScreen onAuth={handleAuth} accounts={config.accounts || []} />;

  const user = { name: username, initials: username[0]?.toUpperCase() || '?', rank: 'JOUEUR' };

  const renderScreen = () => {
    switch (screen) {
      case 'home':        return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} />;
      case 'mods':        return <ModsScreen />;
      case 'profiles':    return <ProfileScreen config={config} onSave={handleConfigSave} />;
      case 'store':       return <StoreScreen />;
      case 'account':     return <AccountScreen username={username} skinUrl={skinUrl} accounts={config.accounts || []} onSwitch={handleSwitchAccount} onAdd={handleAddAccount} onRemove={handleRemoveAccount} />;
      case 'logs':        return <LogsScreen />;
      default:            return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} />;
    }
  };

  return (
    <>
      {updateInfo && <UpdateBanner info={updateInfo} onDismiss={() => setUpdateInfo(null)} />}
      <div className="app" style={{ marginTop: updateInfo ? 32 : 0 }}>
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
