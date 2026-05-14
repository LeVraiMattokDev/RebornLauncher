/* global React, ReactDOM,
   TopBar, Sidebar, StatusBar, AuthScreen, SplashScreen, ToastContainer,
   HomeScreen, ModsScreen, ProfileScreen, StoreScreen, SettingsScreen,
   AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay, CrashReporter */

const { useState, useEffect, useRef } = React;

function UpdateBanner({ update, onDismiss }) {
  const { status, version, percent } = update;

  if (status === 'available') return (
    <div className="update-banner">
      <span className="update-dot" />
      <span>Mise à jour v{version} détectée — téléchargement en cours…</span>
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
        onClick={() => window.electronAPI.updaterInstall()}>Redémarrer</button>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: 4 }} onClick={onDismiss}>Plus tard</button>
    </div>
  );

  return null;
}

function App() {
  const [config, setConfig]             = useState(null);
  const [appVersion, setAppVersion]     = useState('');
  const [authed, setAuthed]             = useState(false);
  const [msAccount, setMsAccount]       = useState(null);
  const [skinUrl, setSkinUrl]           = useState(null);
  const [screen, setScreen]             = useState('home');
  const [update, setUpdate]             = useState(null);
  const [launchState, setLaunchState]   = useState({ running: false, progress: 0, stage: '', logs: [] });
  const [showLaunch, setShowLaunch]     = useState(false);
  const [serverInfo, setServerInfo]     = useState({ online: false, players: 0, maxPlayers: 3000, latency: 0 });
  const [toasts, setToasts]             = useState([]);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashStatus, setSplashStatus] = useState('Chargement…');
  const [globalLogs, setGlobalLogs]     = useState([]);
  const [systemInfo, setSystemInfo]     = useState(null);
  const [crashReport, setCrashReport]   = useState(null);

  const toastIdRef    = useRef(0);
  const handlePlayRef = useRef(null);
  const crashLogsRef  = useRef(null);

  function addToast(message, type = 'info', duration = 4000, url = null) {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type, url }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }

  function addLog(lvl, msg) {
    setGlobalLogs(prev => [...prev, {
      ts: new Date().toLocaleTimeString('fr-FR', { hour12: false }), lvl, msg
    }].slice(-500));
  }

  function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', { hour12: false });
  }

  // ── Boot sequence (replaces multiple useEffects) ──
  useEffect(() => {
    async function boot() {
      try {
        setSplashStatus('Chargement de la configuration…');
        const [ver, cfg, sysInfo] = await Promise.all([
          window.electronAPI.getAppVersion(),
          window.electronAPI.getConfig(),
          window.electronAPI.getSystemInfo(),
        ]);
        setAppVersion(ver);
        setConfig(cfg);
        setSystemInfo(sysInfo);
        addLog('INFO', `Launcher démarré · v${ver} · ${sysInfo.platform} ${sysInfo.arch}`);
        addLog('INFO', `RAM système : ${sysInfo.totalRam} Go`);

        setSplashStatus('Vérification du compte…');
        const saved = cfg.msAccount;
        if (saved) {
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
                addLog('INFO', `Authentifié : ${res.account.name}`);
              }
            } catch (_) { addLog('WARN', 'Token expiré — reconnexion nécessaire'); }
          } else {
            setMsAccount(saved);
            setAuthed(true);
            window.electronAPI.getSkinUrl(saved.name).then(setSkinUrl);
            addLog('INFO', `Authentifié : ${saved.name}`);
          }
        }

        setSplashStatus('Connexion au serveur…');
        try {
          const info = await window.electronAPI.pingServer();
          setServerInfo({ online: info.online, players: info.players, maxPlayers: info.maxPlayers || 3000, latency: info.latency });
          addLog('INFO', info.online ? `Serveur en ligne · ${info.players} joueurs · ${info.latency}ms` : 'Serveur hors ligne');
        } catch (_) { addLog('WARN', 'Ping serveur échoué'); }

        // ── Java check ──
        try {
          const javaInfo = await window.electronAPI.checkJava();
          if (!javaInfo.found) {
            addLog('WARN', `Java introuvable : ${javaInfo.error}`);
            addToast('Java introuvable ! Installe Java 21 sur adoptium.net', 'error', 8000, 'https://adoptium.net');
          } else {
            addLog('INFO', `Java : ${javaInfo.path}`);
          }
        } catch (_) {}

        // ── Announcements ──
        try {
          if (cfg.showAnnouncements !== false) {
            const announcements = await window.electronAPI.getAnnouncements();
            const seen = cfg.seenAnnouncements || [];
            const unseen = announcements.filter(a => a.active && !seen.includes(a.id));
            for (const a of unseen) {
              addToast(a.title + (a.message ? ` — ${a.message}` : ''), 'promo', 10000, a.url || null);
              addLog('INFO', `Annonce : ${a.title}`);
            }
            if (unseen.length > 0) {
              const newCfg = { ...cfg, seenAnnouncements: [...seen, ...unseen.map(a => a.id)] };
              window.electronAPI.saveConfig(newCfg);
              setConfig(newCfg);
            }
          }
        } catch (_) {}

      } catch (e) {
        addLog('ERR', `Erreur au démarrage : ${e.message}`);
      } finally {
        setSplashVisible(false);
      }
    }
    boot();
  }, []);

  // ── Auto-updater events ──
  useEffect(() => {
    const onAvail = ({ version }) => {
      setUpdate(u => u?.status === 'downloading' || u?.status === 'ready' ? u : { status: 'available', version, percent: 0 });
      addLog('INFO', `Mise à jour v${version} détectée`);
      addToast(`Mise à jour v${version} disponible`, 'info');
    };
    const onProg = ({ percent }) => setUpdate(u => u ? { ...u, status: 'downloading', percent } : u);
    const onReady = ({ version }) => {
      setUpdate({ status: 'ready', version, percent: 100 });
      addToast(`v${version} prête à installer`, 'success');
    };
    window.electronAPI.on('updater-available', onAvail);
    window.electronAPI.on('updater-progress', onProg);
    window.electronAPI.on('updater-ready', onReady);
    return () => {
      window.electronAPI.off('updater-available', onAvail);
      window.electronAPI.off('updater-progress', onProg);
      window.electronAPI.off('updater-ready', onReady);
    };
  }, []);

  // ── Server ping every 30s ──
  useEffect(() => {
    const id = setInterval(() => {
      window.electronAPI.pingServer().then(info => {
        setServerInfo({ online: info.online, players: info.players, maxPlayers: info.maxPlayers || 3000, latency: info.latency });
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Launch events ──
  useEffect(() => {
    const onProgress = (data) => {
      const pct = data.total > 0 ? Math.round((data.task / data.total) * 100) : 0;
      const label = { assets: 'assets', client: 'client', natives: 'natives', download: 'téléchargement' };
      const stage = `Téléchargement ${label[data.type] || data.type}… ${pct}%`;
      setLaunchState(s => ({ ...s, progress: 50 + pct / 2, stage,
        logs: [...s.logs, { ts: timestamp(), msg: stage, ok: true }].slice(-20) }));
    };
    const onData = (data) => {
      if (data.type === 'debug') {
        // Filtre le message classpath (trop long, inutile dans le stage)
        const isClasspath = data.msg.includes('Launching with arguments');
        const displayMsg = isClasspath ? 'Démarrage de Minecraft…' : data.msg;
        setLaunchState(s => ({ ...s, stage: displayMsg,
          logs: [...s.logs, { ts: timestamp(), msg: data.msg }].slice(-20) }));
        addLog('INFO', data.msg);
      }
    };
    const onClose = (code) => {
      setLaunchState(s => {
        const newLogs = [...s.logs, { ts: timestamp(), msg: `Processus terminé (code ${code}).`, ok: code === 0 }];
        if (code !== 0) crashLogsRef.current = newLogs;
        return { ...s, running: false, progress: 100, stage: `Jeu fermé (code ${code}).`, logs: newLogs };
      });
      addLog(code === 0 ? 'INFO' : 'WARN', `Jeu fermé (code ${code})`);
      if (code !== 0) {
        addToast(`Minecraft a crashé (code ${code})`, 'error');
        setTimeout(() => {
          setCrashReport({ code, logs: crashLogsRef.current || [] });
          setShowLaunch(false);
        }, 600);
      } else {
        addToast('Jeu fermé', 'info');
        setTimeout(() => setShowLaunch(false), 2000);
      }
    };
    const onError = (err) => {
      setLaunchState(s => ({ ...s, running: false, stage: `Erreur : ${err.message}`,
        logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${err.message}`, ok: false }] }));
      addLog('ERR', err.message);
      addToast(`Erreur : ${err.message}`, 'error');
    };
    const onSync = (data) => {
      const pct = Math.round((data.current / data.total) * 40);
      setLaunchState(s => ({ ...s, progress: pct,
        stage: `Synchronisation ${data.current}/${data.total} : ${data.name}…` }));
    };

    window.electronAPI.on('launch-progress', onProgress);
    window.electronAPI.on('launch-data', onData);
    window.electronAPI.on('launch-close', onClose);
    window.electronAPI.on('launch-error', onError);
    window.electronAPI.on('sync-progress', onSync);
    return () => {
      window.electronAPI.off('launch-progress', onProgress);
      window.electronAPI.off('launch-data', onData);
      window.electronAPI.off('launch-close', onClose);
      window.electronAPI.off('launch-error', onError);
      window.electronAPI.off('sync-progress', onSync);
    };
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => { handlePlayRef.current = handlePlay; });
  useEffect(() => {
    const handler = (e) => {
      if (!authed) return;
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handlePlayRef.current?.(); }
      if (e.ctrlKey && e.key === ',') { e.preventDefault(); setScreen('settings'); }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        window.electronAPI.pingServer().then(info => {
          setServerInfo({ online: info.online, players: info.players, maxPlayers: info.maxPlayers || 3000, latency: info.latency });
          addToast('Serveur actualisé', 'info');
        }).catch(() => {});
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authed]);

  // ── Handlers ──
  function handleAuth(account) {
    setMsAccount(account);
    setAuthed(true);
    window.electronAPI.getSkinUrl(account.name).then(setSkinUrl);
    const newCfg = { ...config, msAccount: account };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
    addLog('INFO', `Connecté : ${account.name}`);
    addToast(`Bienvenue ${account.name} !`, 'success');
  }

  function handleLogout() {
    setMsAccount(null);
    setAuthed(false);
    setSkinUrl(null);
    const newCfg = { ...config, msAccount: null };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
    addLog('INFO', 'Déconnecté');
    addToast('Déconnecté', 'info');
  }

  async function handleAddAccount() {
    try {
      const res = await window.electronAPI.msAuthStart();
      if (res.success) {
        const saved = [...(config.savedAccounts || [])];
        if (msAccount) saved.push(msAccount);
        const newCfg = { ...config, msAccount: res.account, savedAccounts: saved };
        setConfig(newCfg);
        window.electronAPI.saveConfig(newCfg);
        setMsAccount(res.account);
        setSkinUrl(null);
        window.electronAPI.getSkinUrl(res.account.name).then(setSkinUrl);
        addToast(`Compte ${res.account.name} ajouté`, 'success');
        addLog('INFO', `Nouveau compte : ${res.account.name}`);
      } else {
        addToast(res.error || 'Connexion échouée', 'error');
      }
    } catch (e) { addToast(e.message, 'error'); }
  }

  function handleSwitchAccount(account) {
    const saved = (config.savedAccounts || []).filter(a => a.uuid !== account.uuid);
    if (msAccount) saved.push(msAccount);
    const newCfg = { ...config, msAccount: account, savedAccounts: saved };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
    setMsAccount(account);
    setSkinUrl(null);
    window.electronAPI.getSkinUrl(account.name).then(setSkinUrl);
    addToast(`Compte changé : ${account.name}`, 'success');
    addLog('INFO', `Compte changé : ${account.name}`);
  }

  function handleRemoveAccount(uuid) {
    const saved = (config.savedAccounts || []).filter(a => a.uuid !== uuid);
    const newCfg = { ...config, savedAccounts: saved };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
    addToast('Compte supprimé', 'info');
  }

  async function handlePlay() {
    if (showLaunch) return;
    ReactDOM.flushSync(() => {
      setShowLaunch(true);
      setLaunchState({
        running: true, progress: 0, stage: 'Vérification des mods…',
        logs: [{ ts: timestamp(), msg: 'Synchronisation des mods et configs…', ok: true }]
      });
    });
    addLog('INFO', 'Lancement du jeu…');

    try {
      const syncRes = await window.electronAPI.syncFiles();
      if (!syncRes.success) {
        setLaunchState(s => ({ ...s, running: false, stage: `Erreur sync : ${syncRes.error}`,
          logs: [...s.logs, { ts: timestamp(), msg: `ERREUR sync : ${syncRes.error}`, ok: false }] }));
        addToast(`Sync échouée : ${syncRes.error}`, 'error');
        addLog('ERR', `Sync échouée : ${syncRes.error}`);
        return;
      }
      addToast('Mods synchronisés', 'success');

      setLaunchState(s => ({ ...s, progress: 45, stage: 'Démarrage du jeu…',
        logs: [...s.logs, { ts: timestamp(), msg: `Lancement en tant que ${msAccount?.name}…`, ok: true }] }));

      const res = await window.electronAPI.launchGame({
        version: config.minecraftVersion,
        maxRam: config.maxRam,
        minRam: config.minRam,
      });

      if (!res.success) {
        setLaunchState(s => ({ ...s, running: false, stage: `Erreur : ${res.error}`,
          logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${res.error}`, ok: false }] }));
        addToast(`Erreur : ${res.error}`, 'error');
        addLog('ERR', res.error);
      } else {
        addLog('INFO', 'Jeu lancé');
        if (res.bannedMods?.length > 0) {
          addLog('WARN', `Mods bannis supprimés : ${res.bannedMods.join(', ')}`);
          addToast(`${res.bannedMods.length} mod(s) banni(s) supprimé(s)`, 'warning');
        }
      }
    } catch (e) {
      setLaunchState(s => ({ ...s, running: false, stage: `Erreur : ${e.message}`,
        logs: [...s.logs, { ts: timestamp(), msg: `ERREUR : ${e.message}`, ok: false }] }));
      addToast(`Erreur : ${e.message}`, 'error');
      addLog('ERR', e.message);
    }
  }

  async function handleCancel() {
    await window.electronAPI.cancelLaunch();
    setLaunchState(s => ({ ...s, running: false, stage: 'Lancement annulé.' }));
    addToast('Lancement annulé', 'info');
    addLog('INFO', 'Lancement annulé par l\'utilisateur');
    setTimeout(() => setShowLaunch(false), 1500);
  }

  function handleConfigSave(updates) {
    const newCfg = { ...config, ...updates };
    setConfig(newCfg);
    window.electronAPI.saveConfig(newCfg);
    addToast('Paramètres enregistrés', 'success');
  }

  // ── Render ──
  if (splashVisible) return (
    <>
      <SplashScreen version={appVersion} status={splashStatus} />
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );

  if (!config) return null;
  if (!authed) return (
    <>
      <AuthScreen onAuth={handleAuth} version={appVersion} />
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );

  const username = msAccount?.name || '';
  const user = { name: username, initials: username[0]?.toUpperCase() || '?', rank: 'JOUEUR' };

  const renderScreen = () => {
    switch (screen) {
      case 'home':     return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} mcVersion={config.minecraftVersion} addToast={addToast} />;
      case 'mods':     return <ModsScreen addToast={addToast} />;
      case 'profiles': return <ProfileScreen config={config} onSave={handleConfigSave} />;
      case 'store':    return <StoreScreen />;
      case 'account':  return <AccountScreen msAccount={msAccount} config={config} onLogout={handleLogout} onAddAccount={handleAddAccount} onSwitchAccount={handleSwitchAccount} onRemoveAccount={handleRemoveAccount} addToast={addToast} />;
      case 'settings': return <SettingsScreen config={config} onSave={handleConfigSave} systemInfo={systemInfo} addToast={addToast} />;
      case 'logs':     return <LogsScreen logs={globalLogs} addToast={addToast} />;
      default:         return <HomeScreen onPlay={handlePlay} username={username} skinUrl={skinUrl} serverInfo={serverInfo} addToast={addToast} />;
    }
  };

  return (
    <>
      {update && <UpdateBanner update={update} onDismiss={() => setUpdate(null)} />}
      <div className="app" style={{ marginTop: update ? 32 : 0 }}>
        <TopBar user={user} onNav={setScreen} version={appVersion} />
        <Sidebar active={screen} onNav={setScreen} />
        <main className="main">{renderScreen()}</main>
        <StatusBar ping={serverInfo.latency} server={{ up: serverInfo.online, players: serverInfo.players, max: serverInfo.maxPlayers }} />
      </div>
      {showLaunch && (
        <LaunchOverlay
          state={launchState}
          onClose={() => { if (!launchState.running) setShowLaunch(false); }}
          onCancel={handleCancel}
        />
      )}
      {crashReport && (
        <CrashReporter
          code={crashReport.code}
          logs={crashReport.logs}
          onClose={() => setCrashReport(null)}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
