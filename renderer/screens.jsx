/* global React, Icon, SkinViewer3D, Switch */
const { useState, useRef, useEffect } = React;

/* ============ HOME ============ */
function HomeScreen({ onPlay, username, skinUrl, serverInfo = {} }) {
  const online  = serverInfo.online  ?? false;
  const players = serverInfo.players ?? 0;
  const max     = serverInfo.maxPlayers ?? 0;
  const ping    = serverInfo.latency ?? 0;
  const pct     = max > 0 ? Math.min(100, (players / max) * 100).toFixed(0) : 0;

  return (
    <div className="main-inner">
      <div className="hero">
        <div className="hero-stage">
          <span className="hero-tag"><span className="pulse" /> V2 Out !</span>
          <div>
            <h1 className="hero-headline">Joue à un serveur<span className="ember">UNIQUE.</span></h1>
            <p className="hero-desc">Rejoins RebornMC et vis une expérience Minecraft unique.{online ? ` ${players.toLocaleString('fr-FR')} joueurs connectés maintenant.` : ' Serveur hors-ligne.'}</p>
            <div className="hero-meta">
              {online
                ? <span><b>{players.toLocaleString('fr-FR')}</b> en ligne</span>
                : <span style={{ color: 'var(--red)' }}>Hors-ligne</span>}
              <span>play.rebornmc.fr</span>
            </div>
          </div>
          <div className="hero-cta">
            <button className="play-btn" onClick={onPlay}>
              <span className="play-glyph" />
              JOUER
            </button>
            <button className="version-pill">1.21.8</button>
          </div>
        </div>

        <div className="avatar-stage">
          <SkinViewer3D skinUrl={skinUrl} username={username} />
          <div className="avatar-controls">
            <div>
              <div className="avatar-name">{username}</div>
              <div className="avatar-rank">JOUEUR</div>
            </div>
          </div>
        </div>
      </div>

      <div className="home-row">
        <div className="stats-card" style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="card-title">Pulse Serveur</span>
            <span className={`status-dot${online ? '' : ' err'}`} style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
          </div>
          <div className="stat-row"><span className="stat-label">Joueurs en ligne</span><span className="stat-value" style={{ color: online ? 'var(--green)' : 'var(--red)' }}>{online ? players.toLocaleString('fr-FR') : '—'}</span></div>
          <div className="stat-row"><span className="stat-label">Capacité max</span><span className="stat-value">{online && max > 0 ? max.toLocaleString('fr-FR') : '—'}</span></div>
          <div className="stat-row"><span className="stat-label">Ping</span><span className="stat-value">{online ? `${ping} ms` : '—'}</span></div>
          <div className="stat-row"><span className="stat-label">Région</span><span className="stat-value">EU-West</span></div>
          <div className="player-bar"><div style={{ width: `${pct}%` }} /></div>
          <div className="player-counts">
            <span>{online ? `${players.toLocaleString('fr-FR')} en ligne` : 'Hors-ligne'}</span>
            <span>{online && max > 0 ? `${max.toLocaleString('fr-FR')} max` : ''}</span>
          </div>
          <button className="btn" style={{ width: "100%", marginTop: 14 }}><Icon name="chat" size={14} /> Discord</button>
        </div>
      </div>
    </div>
  );
}

/* ============ MODS ============ */
function ModsScreen() {
  const [mods, setMods] = useState([]);

  useEffect(() => {
    window.electronAPI.listMods()
      .then(list => setMods(list))
      .catch(() => setMods([]));
  }, []);

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Bibliothèque</div>
          <h1 className="page-h1">Mods installés</h1>
          <div className="page-sub">{mods.length} mod{mods.length !== 1 ? 's' : ''} dans le dossier mods.</div>
        </div>
      </div>

      <div className="mod-list">
        {mods.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontFamily: 'var(--pixel-font)', fontSize: 10 }}>
            AUCUN MOD INSTALLÉ
          </div>
        )}
        {mods.map((m, i) => (
          <div key={i} className="mod-row">
            <div className="mod-icon">{m.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div className="mod-name">{m.name}</div>
              <div className="mod-meta"><span>{m.filename}</span></div>
            </div>
            <span className="mod-version">{m.size}</span>
            <span className="mod-status">OK</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ PROFILE (single, no creation) ============ */
function ProfileScreen({ config, onSave }) {
  const [ram, setRam] = useState(parseInt(config.maxRam) || 8);

  function save() {
    onSave({ maxRam: String(ram), minRam: String(Math.max(2, Math.floor(ram / 4))) });
  }

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Profil actif</div>
          <h1 className="page-h1">Profil RebornMC</h1>
          <div className="page-sub">Fabric · {config.minecraftVersion} · {config.maxRam} Go RAM alloués</div>
        </div>
      </div>

      <div className="profile-single-card">
        <div className="profile-card active" data-loader="fabric" style={{ maxWidth: 320 }}>
          <div className="profile-icon">
            <Icon name="layers" size={22} />
          </div>
          <div className="profile-name">Reborn Survival</div>
          <div className="profile-meta">FABRIC · {config.minecraftVersion}</div>
          <div className="profile-stats">
            <div>
              <div className="profile-stat-label">RAM</div>
              <div className="profile-stat-value">{ram} Go</div>
            </div>
            <div>
              <div className="profile-stat-label">VERSION</div>
              <div className="profile-stat-value">{config.minecraftVersion}</div>
            </div>
            <div>
              <div className="profile-stat-label">ÉTAT</div>
              <div className="profile-stat-value" style={{ color: 'var(--green)', fontSize: 11 }}>ACTIF</div>
            </div>
          </div>
        </div>

        <div className="settings-group" style={{ flex: 1 }}>
          <div className="settings-group-title">RAM allouée</div>
          <div className="field">
            <div>
              <div className="field-label">Mémoire Java</div>
              <div className="field-hint">Recommandé : 6–10 Go.</div>
            </div>
            <div className="slider-wrap">
              <input className="ram-slider" type="range" min="2" max="24" step="1"
                value={ram} onChange={e => setRam(+e.target.value)} />
              <div className="ram-readout">
                <span>2 Go</span>
                <span><b>{ram} Go</b> alloués</span>
                <span>24 Go</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <button className="btn btn-primary" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ STORE (webview) ============ */
function StoreScreen() {
  return (
    <webview
      src="https://rebornsmp.fr/shop"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'block', border: 'none' }}
      allowpopups="true"
      partition="persist:store"
    />
  );
}

/* ============ ACCOUNT ============ */
function AccountScreen({ username, skinUrl, accounts, onSwitch, onAdd, onRemove }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser]         = useState('');
  const [addError, setAddError]       = useState('');

  function validate(name) {
    if (!name) return 'Entrez un pseudo.';
    if (name.length < 3 || name.length > 16) return 'Pseudo : 3 à 16 caractères.';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Lettres, chiffres et _ uniquement.';
    if (accounts.includes(name)) return 'Ce compte existe déjà.';
    return '';
  }

  function handleAdd() {
    const name = newUser.trim();
    const err = validate(name);
    if (err) { setAddError(err); return; }
    onAdd(name);
    setNewUser(''); setAddError(''); setShowAddForm(false);
  }

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Profil</div>
          <h1 className="page-h1">Comptes</h1>
          <div className="page-sub">{accounts.length} compte{accounts.length !== 1 ? 's' : ''} enregistré{accounts.length !== 1 ? 's' : ''}.</div>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => { setShowAddForm(true); setNewUser(''); setAddError(''); }}>
            + Ajouter
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="settings-group-title" style={{ marginBottom: 12 }}>Nouveau compte</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: addError ? 8 : 0 }}>
            <input
              type="text"
              value={newUser}
              maxLength={16}
              placeholder="VotreNom_"
              autoFocus
              onChange={e => { setNewUser(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button className="btn btn-primary" onClick={handleAdd}>Ajouter</button>
            <button className="btn" onClick={() => setShowAddForm(false)}>Annuler</button>
          </div>
          {addError && <div style={{ fontSize: 12, color: 'var(--red)' }}>{addError}</div>}
        </div>
      )}

      <div className="account-list">
        {accounts.map(acc => (
          <div key={acc} className={`account-list-row${acc === username ? ' active' : ''}`}>
            <div className="account-list-avatar">{acc[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{acc}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Mode hors-ligne · Saison 1</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {acc === username
                ? <span className="tag tag-green">ACTIF</span>
                : <button className="btn btn-sm btn-primary" onClick={() => onSwitch(acc)}>Utiliser</button>
              }
              {accounts.length > 1 && (
                <button className="btn-danger" onClick={() => onRemove(acc)}>Supprimer</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Placeholder ============ */
function PlaceholderScreen({ title, subtitle }) {
  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <h1 className="page-h1">{title}</h1>
          <div className="page-sub">{subtitle}</div>
        </div>
      </div>
      <div className="card" style={{ padding: 60, display: "grid", placeItems: "center", color: "var(--text-faint)" }}>
        <div style={{ fontFamily: "var(--pixel-font)", fontSize: 11 }}>BIENTÔT DISPONIBLE</div>
      </div>
    </div>
  );
}

/* ============ LOGS ============ */
function LogsScreen() {
  const lines = [
    { ts: "12:14:08", lvl: "INFO", msg: "Launcher démarré · build 1.0.0 · java 21.0.4" },
    { ts: "12:14:09", lvl: "INFO", msg: "Authentifié en mode hors-ligne" },
    { ts: "12:14:10", lvl: "INFO", msg: "Manifest récupéré : play.rebornsmp.net → r1" },
    { ts: "12:14:11", lvl: "INFO", msg: "Profil sélectionné : Reborn Survival (Forge 1.21.4)" },
    { ts: "12:14:12", lvl: "INFO", msg: "42 mods activés · 0 manquants · 1 mise à jour en attente" },
    { ts: "12:14:13", lvl: "WARN", msg: "Guild Banners 0.9.4 a une version plus récente (0.9.6)" },
    { ts: "12:14:14", lvl: "INFO", msg: "mod_ban : 0 mod supprimé" },
    { ts: "12:14:15", lvl: "INFO", msg: "Args Java : -Xmx8G -Xms2G -XX:+UseG1GC" },
    { ts: "12:14:17", lvl: "INFO", msg: "Processus jeu démarré (pid 4912)" },
    { ts: "12:14:22", lvl: "INFO", msg: "Connecté à play.rebornsmp.net:25565 (28ms · EU-West)" },
  ];
  const lvlColor = { INFO: "var(--text-dim)", WARN: "var(--amber)", ERR: "var(--red)" };

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Diagnostics</div>
          <h1 className="page-h1">Logs du Launcher</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm">Copier</button>
          <button className="btn btn-sm btn-primary">Envoyer au support</button>
        </div>
      </div>
      <div className="card" style={{ padding: 18, fontFamily: "var(--mono-font)", fontSize: 12, lineHeight: 1.7, background: "#0A0D14" }}>
        {lines.map((l, i) => (
          <div key={i} className="log-line">
            <span style={{ color: "var(--text-faint)" }}>[{l.ts}]</span>
            <span style={{ color: lvlColor[l.lvl] }}>{l.lvl}</span>
            <span style={{ color: "var(--text)" }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Launch Overlay (remplace PatchOverlay) ============ */
function LaunchOverlay({ state, onClose }) {
  const { progress, stage, logs, running } = state;

  return (
    <div className="patch-overlay">
      <div className="patch-window">
        <div className="patch-corner">▣ {running ? 'TÉLÉCHARGEMENT / LANCEMENT' : 'TERMINÉ'}</div>
        {!running && (
          <button className="icon-btn" style={{ position: "absolute", top: 8, right: 8 }} onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        )}
        <div className="patch-title">{running ? 'Préparation du jeu…' : 'Jeu lancé.'}</div>
        <div className="patch-sub">{stage}</div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: Math.min(100, progress) + "%" }} />
        </div>
        <div className="progress-meta">
          <span>{Math.min(100, progress).toFixed(0)}%</span>
          <span>{running ? 'En cours…' : 'Terminé'}</span>
        </div>

        <div className="progress-stage">
          {(logs || []).slice(-6).map((l, i) => (
            <div key={i} className="log-line">
              <span className="ts">[{l.ts}]</span>
              <span className={l.ok === false ? "err-text" : l.ok ? "ok" : ""} style={{ gridColumn: "2 / 4" }}>
                {l.msg}
              </span>
            </div>
          ))}
        </div>

        {!running && (
          <div className="patch-actions">
            <button className="btn btn-primary btn-sm" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, ModsScreen, ProfileScreen, StoreScreen,
  AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay
});
