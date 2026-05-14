/* global React, Icon, SkinViewer3D, Switch */
const { useState, useRef, useEffect } = React;

/* ============ HOME ============ */
function HomeScreen({ onPlay, username, skinUrl, serverInfo = {}, mcVersion = '1.21.8', addToast }) {
  const online  = serverInfo.online  ?? false;
  const players = serverInfo.players ?? 0;
  const max     = serverInfo.maxPlayers ?? 0;
  const ping    = serverInfo.latency ?? 0;
  const pct     = max > 0 ? Math.min(100, (players / max) * 100).toFixed(0) : 0;

  const [news, setNews] = useState([]);
  useEffect(() => {
    window.electronAPI.getNews().then(setNews).catch(() => {});
  }, []);

  return (
    <div className="main-inner">
      <div className="hero">
        <div className="hero-stage">
          <span className="hero-tag"><span className="pulse" /> V2 Out !</span>
          <div>
            <h1 className="hero-headline">Joue à un serveur<span className="ember"> UNIQUE.</span></h1>
            <p className="hero-desc">Rejoins RebornMC et vis une expérience Minecraft unique.{online ? ` ${players.toLocaleString('fr-FR')} joueurs connectés maintenant.` : ' Serveur indisponible.'}</p>
            <div className="hero-meta">
              {online
                ? <span><b>{players.toLocaleString('fr-FR')}</b> en ligne</span>
                : <span style={{ color: 'var(--red)' }}>Hors-ligne</span>}
              <span>play.rebornmc.fr</span>
            </div>
          </div>
          <div className="hero-cta">
            <button className="play-btn" onClick={onPlay}>
              <span className="play-glyph" />JOUER
            </button>
            <button className="version-pill">{mcVersion}</button>
          </div>
        </div>
        <div className="avatar-stage">
          <SkinViewer3D skinUrl={skinUrl} username={username} width={200} height={260} />
          <div className="avatar-controls">
            <div>
              <div className="avatar-name">{username}</div>
              <div className="avatar-rank">JOUEUR</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Statut</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`status-dot${online ? '' : ' err'}`} style={{ width: 8, height: 8 }} />
            <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono-font)', color: online ? 'var(--green)' : 'var(--red)' }}>{online ? 'EN LIGNE' : 'HORS LIGNE'}</span>
          </div>
        </div>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Joueurs</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono-font)' }}>{online ? players.toLocaleString('fr-FR') : '—'}</div>
        </div>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Latence</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono-font)', color: online && ping < 80 ? 'var(--green)' : online ? 'var(--amber)' : 'var(--text-faint)' }}>{online ? `${ping}ms` : '—'}</div>
        </div>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Capacité</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono-font)' }}>{online && max > 0 ? `${pct}%` : '—'}</div>
          {online && max > 0 && <div className="player-bar" style={{ marginTop: 8, marginBottom: 0 }}><div style={{ width: `${pct}%` }} /></div>}
        </div>
      </div>

      {news.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Actualités</div>
          <div className="card">
            <div className="news-list">
              {news.slice(0, 5).map((n, i) => (
                <div key={i} className="news-item" onClick={() => n.url && window.electronAPI.openUrl(n.url)}>
                  <div className={`news-thumb ${n.type || ''}`}>{(n.icon || '').slice(0, 3) || '>>>'}</div>
                  <div style={{ flex: 1 }}>
                    <div className="news-meta">{n.category || 'NEWS'}</div>
                    <div className="news-title">{n.title}</div>
                    <div className="news-desc">{n.description}</div>
                  </div>
                  {n.date && <div className="news-date">{n.date}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 40 }} onClick={() => window.electronAPI.openUrl('https://discord.gg/rebornmc')}>
          <Icon name="chat" size={14} /> Rejoindre le Discord
        </button>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 40 }} onClick={() => window.electronAPI.openUrl('https://rebornsmp.fr')}>
          <Icon name="spark" size={14} /> Site Web
        </button>
      </div>
    </div>
  );
}

/* ============ MODS — with search, toggle, open folder ============ */
function ModsScreen({ addToast }) {
  const [mods, setMods] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadMods(); }, []);

  function loadMods() {
    window.electronAPI.listMods().then(setMods).catch(() => setMods([]));
  }

  async function toggleMod(filename) {
    const result = await window.electronAPI.toggleMod(filename);
    if (result && !result.error) {
      addToast(result.enabled ? 'Mod activé' : 'Mod désactivé', 'success');
      loadMods();
    } else if (result?.error) {
      addToast(result.error, 'error');
    }
  }

  const filtered = mods.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const enabledCount = mods.filter(m => m.enabled).length;

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Bibliothèque</div>
          <h1 className="page-h1">Mods installés</h1>
          <div className="page-sub">{enabledCount} actif{enabledCount !== 1 ? 's' : ''} · {mods.length} total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { loadMods(); addToast('Liste rafraîchie', 'info'); }}>
            <Icon name="refresh" size={14} />
          </button>
          <button className="btn" onClick={() => window.electronAPI.openModsFolder()}>
            <Icon name="folder" size={14} /> Ouvrir le dossier
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={14} />
          <input placeholder="Rechercher un mod…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mod-list">
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontFamily: 'var(--pixel-font)', fontSize: 10 }}>
            {search ? 'AUCUN RÉSULTAT' : 'AUCUN MOD INSTALLÉ'}
          </div>
        )}
        {filtered.map((m, i) => (
          <div key={i} className="mod-row" style={{ opacity: m.enabled ? 1 : 0.5 }}>
            <div className="mod-icon">{m.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div className="mod-name">{m.name}</div>
              <div className="mod-meta"><span>{m.filename}</span></div>
            </div>
            <span className="mod-version">{m.size}</span>
            <span className={`mod-status${m.enabled ? '' : ' missing'}`}>
              {m.enabled ? 'ACTIF' : 'INACTIF'}
            </span>
            <Switch on={m.enabled} onChange={() => toggleMod(m.filename)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ PROFILE (single, with RAM) ============ */
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
          <div className="profile-icon"><Icon name="layers" size={22} /></div>
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

/* ============ STORE ============ */
function StoreScreen() {
  return (
    <div className="main-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
        marginBottom: 4
      }}>
        <Icon name="store" size={32} />
      </div>
      <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 10, color: 'var(--accent)', textShadow: '0 0 16px rgba(139,92,246,0.3)' }}>BOUTIQUE</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', textAlign: 'center' }}>Boutique RebornMC</h1>
      <p style={{ color: 'var(--text-dim)', margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
        Grades, cosmétiques et avantages exclusifs pour améliorer ton expérience.
      </p>
      <button className="btn btn-primary" style={{ height: 44, padding: '0 28px', fontSize: 14, borderRadius: 12 }}
        onClick={() => window.electronAPI.openUrl('https://rebornsmp.fr/shop')}>
        <Icon name="spark" size={16} /> Ouvrir la boutique
      </button>
    </div>
  );
}

/* ============ ACCOUNT — multi-account ============ */
function AccountScreen({ msAccount, config, onLogout, onAddAccount, onSwitchAccount, onRemoveAccount, addToast }) {
  const name = msAccount?.name || '';
  const uuid = msAccount?.uuid || '';
  const savedAccounts = config?.savedAccounts || [];

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Profil</div>
          <h1 className="page-h1">Comptes</h1>
          <div className="page-sub">{1 + savedAccounts.length} compte{1 + savedAccounts.length > 1 ? 's' : ''} enregistré{1 + savedAccounts.length > 1 ? 's' : ''}.</div>
        </div>
        <button className="btn btn-primary" onClick={onAddAccount}>
          <Icon name="plus" size={14} /> Ajouter un compte
        </button>
      </div>

      <div className="section-title">Compte actif</div>
      <div className="account-list-row active" style={{ marginBottom: 20 }}>
        <div className="account-list-avatar">{name[0]?.toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 3 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono-font)' }}>{uuid || 'UUID non disponible'}</div>
        </div>
        <span className="tag tag-green">ACTIF</span>
        <button className="btn-danger" style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={onLogout}>Déconnecter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Type</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Microsoft</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Minecraft Java Edition</div>
        </div>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Serveur</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>play.rebornmc.fr</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Région EU-West</div>
        </div>
        <div className="stats-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Rang</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>Joueur</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Rang par défaut</div>
        </div>
      </div>

      {savedAccounts.length > 0 && (
        <>
          <div className="section-title">Autres comptes</div>
          <div className="account-list">
            {savedAccounts.map((acc, i) => (
              <div key={i} className="account-list-row">
                <div className="account-list-avatar">{acc.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Compte Microsoft</div>
                </div>
                <button className="btn btn-sm" onClick={() => onSwitchAccount(acc)}>Utiliser</button>
                <button className="btn-danger" style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                  onClick={() => onRemoveAccount(acc.uuid)}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
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

/* ============ LOGS — real-time ============ */
function LogsScreen({ logs = [], addToast }) {
  const [filter, setFilter] = useState('ALL');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.lvl === filter);
  const lvlColor = { INFO: "var(--text-dim)", WARN: "var(--amber)", ERR: "var(--red)" };

  function copyLogs() {
    const text = filtered.map(l => `[${l.ts}] ${l.lvl} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      if (addToast) addToast('Logs copiés', 'success');
    });
  }

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Diagnostics</div>
          <h1 className="page-h1">Logs du Launcher</h1>
          <div className="page-sub">{logs.length} entrée{logs.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'INFO', 'WARN', 'ERR'].map(lvl => (
            <button key={lvl} className={`chip${filter === lvl ? ' active' : ''}`} onClick={() => setFilter(lvl)}>{lvl}</button>
          ))}
          <button className="btn btn-sm" onClick={copyLogs}>Copier</button>
        </div>
      </div>
      <div ref={scrollRef} className="card" style={{
        padding: 18, fontFamily: "var(--mono-font)", fontSize: 12, lineHeight: 1.8,
        background: "rgba(6, 8, 14, 0.9)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.04)",
        maxHeight: 'calc(100vh - 220px)', overflowY: 'auto',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
            {logs.length === 0 ? 'Aucun log. Lance le jeu pour voir les logs ici.' : 'Aucun log pour ce filtre.'}
          </div>
        )}
        {filtered.map((l, i) => (
          <div key={i} className="log-line">
            <span style={{ color: "var(--text-faint)", opacity: 0.6 }}>[{l.ts}]</span>
            <span style={{
              color: lvlColor[l.lvl] || 'var(--text-dim)',
              fontWeight: l.lvl !== 'INFO' ? 600 : 400,
              textShadow: l.lvl === 'WARN' ? '0 0 8px rgba(251,191,36,0.2)' : l.lvl === 'ERR' ? '0 0 8px rgba(248,113,113,0.2)' : 'none',
            }}>{l.lvl}</span>
            <span style={{ color: "var(--text)" }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Launch Overlay ============ */
function LaunchOverlay({ state, onClose, onCancel }) {
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
        <div className="patch-sub">{(stage || '').length > 140 ? stage.slice(0, 140) + '…' : stage}</div>
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
              <span className={l.ok === false ? "err-text" : l.ok ? "ok" : ""} style={{ gridColumn: "2 / 4" }}>{l.msg}</span>
            </div>
          ))}
        </div>
        {running && (
          <div className="patch-actions">
            <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)' }} onClick={onCancel}>
              <Icon name="close" size={13} /> Annuler
            </button>
          </div>
        )}
        {!running && (
          <div className="patch-actions">
            <button className="btn btn-primary btn-sm" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Crash Reporter ============ */
function CrashReporter({ code, logs, onClose }) {
  function copyLogs() {
    const text = (logs || []).map(l => `[${l.ts}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(`Minecraft crash — code ${code}\n\n${text}`).catch(() => {});
  }
  return (
    <div className="patch-overlay">
      <div className="patch-window" style={{ borderColor: 'rgba(248,113,113,0.4)' }}>
        <div className="patch-corner" style={{ color: 'var(--red)' }}>▣ CRASH DÉTECTÉ</div>
        <div className="patch-title" style={{ color: 'var(--red)' }}>Minecraft a planté</div>
        <div className="patch-sub">Code de sortie : <b style={{ fontFamily: 'var(--mono-font)' }}>{code}</b> — consulte les logs ci-dessous.</div>
        <div className="progress-stage" style={{ maxHeight: 200, overflowY: 'auto' }}>
          {(logs || []).map((l, i) => (
            <div key={i} className="log-line">
              <span className="ts">[{l.ts}]</span>
              <span className={l.ok === false ? "err-text" : ""} style={{ gridColumn: "2 / 4" }}>{l.msg}</span>
            </div>
          ))}
        </div>
        <div className="patch-actions">
          <button className="btn btn-sm" onClick={copyLogs}><Icon name="copy" size={13} /> Copier les logs</button>
          <button className="btn btn-sm" onClick={() => window.electronAPI.openUrl('https://discord.gg/rebornmc')}>
            <Icon name="chat" size={13} /> Support Discord
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, ModsScreen, ProfileScreen, StoreScreen,
  AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay, CrashReporter
});
