/* global React, Icon, Switch */
const { useState } = React;

function SettingsScreen({ config, onSave, systemInfo, addToast }) {
  const [mcPath, setMcPath]               = useState(config.minecraftPath || '');
  const [closeLauncher, setCloseLauncher] = useState(config.closeLauncherOnStart || false);
  const [jvmArgs, setJvmArgs]             = useState(config.jvmArgs || '');
  const [showAnnouncements, setShowAnnouncements] = useState(config.showAnnouncements !== false);

  const totalRam = systemInfo?.totalRam || 16;

  function save() {
    onSave({ minecraftPath: mcPath, closeLauncherOnStart: closeLauncher, jvmArgs, showAnnouncements });
  }

  async function browse() {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setMcPath(dir);
  }

  async function reset() {
    const fresh = await window.electronAPI.resetConfig();
    if (fresh) {
      setMcPath(fresh.minecraftPath || '');
      setCloseLauncher(false);
      setJvmArgs('');
      addToast('Paramètres réinitialisés', 'success');
    }
  }

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Launcher</div>
          <h1 className="page-h1">Paramètres</h1>
          <div className="page-sub">Configure le launcher selon tes préférences.</div>
        </div>
      </div>

      <div className="settings-section">

        <div className="settings-group">
          <div className="settings-group-title">Dossier du jeu</div>
          <div className="field">
            <div>
              <div className="field-label">Emplacement Minecraft</div>
              <div className="field-hint">Dossier contenant mods, configs et versions.</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <input type="text" value={mcPath} onChange={e => setMcPath(e.target.value)} style={{ minWidth: 240 }} />
              <button className="btn btn-sm" onClick={browse}>Parcourir</button>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Comportement</div>
          <div className="field">
            <div>
              <div className="field-label">Réduire au lancement</div>
              <div className="field-hint">Minimiser le launcher quand le jeu démarre.</div>
            </div>
            <Switch on={closeLauncher} onChange={setCloseLauncher} />
          </div>
          <div className="field">
            <div>
              <div className="field-label">Notifications boutique</div>
              <div className="field-hint">Afficher les annonces et promotions au démarrage.</div>
            </div>
            <Switch on={showAnnouncements} onChange={setShowAnnouncements} />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Java</div>
          <div className="field">
            <div>
              <div className="field-label">Arguments JVM</div>
              <div className="field-hint">Paramètres avancés passés à Java au lancement.</div>
            </div>
            <input type="text" value={jvmArgs} onChange={e => setJvmArgs(e.target.value)}
              placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled" style={{ minWidth: 260 }} />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Système</div>
          <div className="field">
            <div>
              <div className="field-label">RAM totale</div>
              <div className="field-hint">Mémoire système détectée sur cette machine.</div>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent-2)' }}>{totalRam} Go</span>
          </div>
          <div className="field">
            <div>
              <div className="field-label">Plateforme</div>
              <div className="field-hint">{systemInfo?.platform || 'N/A'} · {systemInfo?.arch || 'N/A'}</div>
            </div>
          </div>
          <div className="field">
            <div>
              <div className="field-label">Version Minecraft</div>
              <div className="field-hint">v{config.minecraftVersion} · Fabric</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" size={13} /> Enregistrer
          </button>
          <button className="btn" onClick={() => window.electronAPI.openGameFolder()}>
            <Icon name="folder" size={13} /> Dossier du jeu
          </button>
          <button className="btn" onClick={() => window.electronAPI.openModsFolder()}>
            <Icon name="cube" size={13} /> Dossier mods
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-danger" style={{ height: 32, padding: '0 14px', fontSize: 13 }} onClick={reset}>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
