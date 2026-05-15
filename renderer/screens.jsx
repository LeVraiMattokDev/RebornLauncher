/* global React, Icon, SkinViewer3D, Switch */
const { useState, useRef, useEffect } = React;

/* ============ HOME ============ */
function HomeScreen({ onPlay, username, skinUrl, serverInfo = {}, mcVersion = '1.21.8', addToast }) {
  const online  = serverInfo.online  ?? false;
  const players = serverInfo.players ?? 0;
  const max     = serverInfo.maxPlayers ?? 0;
  const ping    = serverInfo.latency ?? 0;
  const pct     = max > 0 ? Math.min(100, (players / max) * 100) : 0;

  const [news, setNews] = useState([]);
  useEffect(() => {
    window.electronAPI.getNews().then(setNews).catch(() => {});
  }, []);

  return (
    <div className="main-inner">

      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-stage">
          <span className="hero-tag">
            <span className="pulse" />
            {online ? `${players.toLocaleString('fr-FR')} joueurs en ligne` : 'Serveur hors ligne'}
          </span>

          <h1 className="hero-headline">
            Joue à un serveur<br />
            <span className="ember">vraiment unique.</span>
          </h1>

          <p className="hero-desc">
            RebornMC — survival, events et communauté francophone.
            {online ? ` ${players.toLocaleString('fr-FR')} joueurs connectés.` : ' Serveur temporairement indisponible.'}
          </p>

          <div className="hero-meta">
            <span>play.rebornmc.fr</span>
            {online && ping > 0 && <span><b>{ping} ms</b></span>}
            <span>Minecraft {mcVersion}</span>
          </div>

          <div className="hero-cta">
            <button className="play-btn" onClick={onPlay}>
              <span className="play-glyph" />
              JOUER
            </button>
          </div>
        </div>

        {/* Skin viewer */}
        <div className="avatar-stage">
          <SkinViewer3D skinUrl={skinUrl} username={username} width={190} height={245} />
          <div className="avatar-controls">
            <div className="avatar-name">{username || 'Joueur'}</div>
            <div className="avatar-rank">Joueur</div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stats-card">
          <div className="stat-label">Statut</div>
          <div className={`stat-value${online ? ' online' : ' dim'}`} style={{ fontSize: 14, marginTop: 2 }}>
            {online ? '● En ligne' : '○ Hors ligne'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Joueurs</div>
          <div className={`stat-value${!online ? ' dim' : ''}`}>
            {online ? players.toLocaleString('fr-FR') : '—'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Latence</div>
          <div className={`stat-value${!online ? ' dim' : ping < 80 ? ' online' : ' warn'}`}>
            {online ? `${ping} ms` : '—'}
          </div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Capacité</div>
          <div className={`stat-value${!online ? ' dim' : ''}`} style={{ fontSize: 18 }}>
            {online && max > 0 ? `${Math.round(pct)}%` : '—'}
          </div>
          {online && max > 0 && (
            <div className="player-bar" style={{ marginTop: 8 }}>
              <div style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Actualités ── */}
      {news.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Actualités</div>
          <div className="card">
            <div className="news-list">
              {news.slice(0, 5).map((n, i) => (
                <div key={i} className="news-item"
                  onClick={() => n.url && window.electronAPI.openUrl(n.url)}>
                  <div className={`news-thumb ${n.type || ''}`}>
                    {(n.icon || '').slice(0, 3) || '···'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="news-meta">{n.category || 'Actualité'}</div>
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

      {/* ── Liens rapides ── */}
      <div style={{ display: 'flex', gap: 9 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 38 }}
          onClick={() => window.electronAPI.openUrl('https://discord.gg/rebornmc')}>
          <Icon name="chat" size={14} /> Discord
        </button>
        <button className="btn" style={{ flex: 1, justifyContent: 'center', height: 38 }}
          onClick={() => window.electronAPI.openUrl('https://rebornsmp.fr')}>
          <Icon name="spark" size={14} /> Site web
        </button>
      </div>
    </div>
  );
}

/* ============ MODS ============ */
function ModsScreen({ addToast }) {
  const [mods, setMods]     = useState([]);
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

  const filtered     = mods.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const enabledCount = mods.filter(m => m.enabled).length;

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Bibliothèque</div>
          <h1 className="page-h1">Mods installés</h1>
          <div className="page-sub">{enabledCount} actif{enabledCount !== 1 ? 's' : ''} · {mods.length} au total</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn" onClick={() => { loadMods(); addToast('Liste rafraîchie', 'info'); }}>
            <Icon name="refresh" size={14} />
          </button>
          <button className="btn" onClick={() => window.electronAPI.openModsFolder()}>
            <Icon name="folder" size={14} /> Dossier
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input
            placeholder="Rechercher un mod…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mod-list">
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            {search ? 'Aucun résultat.' : 'Aucun mod installé.'}
          </div>
        )}
        {filtered.map((m, i) => (
          <div key={i} className="mod-row" style={{ opacity: m.enabled ? 1 : 0.5 }}>
            <div className="mod-icon">{m.name.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mod-name">{m.name}</div>
              <div className="mod-meta"><span>{m.filename}</span></div>
            </div>
            <span className="mod-version">{m.size}</span>
            <span className={`mod-status${m.enabled ? '' : ' missing'}`}>
              {m.enabled ? 'Actif' : 'Inactif'}
            </span>
            <Switch on={m.enabled} onChange={() => toggleMod(m.filename)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ PROFILE ============ */
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
        <div className="profile-card active" data-loader="fabric" style={{ maxWidth: 300 }}>
          <div className="profile-icon"><Icon name="layers" size={20} /></div>
          <div className="profile-name">Reborn Survival</div>
          <div className="profile-meta">Fabric · {config.minecraftVersion}</div>
          <div className="profile-stats">
            <div>
              <div className="profile-stat-label">RAM</div>
              <div className="profile-stat-value">{ram} Go</div>
            </div>
            <div>
              <div className="profile-stat-label">Version</div>
              <div className="profile-stat-value">{config.minecraftVersion}</div>
            </div>
            <div>
              <div className="profile-stat-label">État</div>
              <div className="profile-stat-value" style={{ color: 'var(--green)', fontSize: 11 }}>Actif</div>
            </div>
          </div>
        </div>

        <div className="settings-group" style={{ flex: 1 }}>
          <div className="settings-group-title">RAM allouée</div>
          <div className="field">
            <div>
              <div className="field-label">Mémoire Java</div>
              <div className="field-hint">Recommandé : 6–10 Go selon votre machine.</div>
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
          <div style={{ padding: '11px 14px' }}>
            <button className="btn btn-primary" onClick={save}>
              <Icon name="check" size={13} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ STORE ============ */
function StoreScreen() {
  return (
    <div className="main-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{
        width: 68, height: 68, borderRadius: 18,
        background: 'var(--accent-bg)', border: '1px solid var(--accent-bdr)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <Icon name="store" size={28} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8 }}>Boutique</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Boutique RebornMC</h1>
        <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: 300, lineHeight: 1.6, fontSize: 13 }}>
          Grades, cosmétiques et avantages pour améliorer ton expérience sur le serveur.
        </p>
      </div>
      <button className="btn btn-primary" style={{ height: 42, padding: '0 26px', fontSize: 14, borderRadius: 11 }}
        onClick={() => window.electronAPI.openUrl('https://rebornsmp.fr/shop')}>
        <Icon name="spark" size={15} /> Ouvrir la boutique
      </button>
    </div>
  );
}

/* ============ ACCOUNT ============ */
function AccountScreen({ msAccount, config, onLogout, onAddAccount, onSwitchAccount, onRemoveAccount, addToast }) {
  const name          = msAccount?.name || '';
  const uuid          = msAccount?.uuid || '';
  const savedAccounts = config?.savedAccounts || [];

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Profil</div>
          <h1 className="page-h1">Comptes</h1>
          <div className="page-sub">
            {1 + savedAccounts.length} compte{1 + savedAccounts.length > 1 ? 's' : ''} enregistré{1 + savedAccounts.length > 1 ? 's' : ''}.
          </div>
        </div>
        <button className="btn btn-primary" onClick={onAddAccount}>
          <Icon name="plus" size={14} /> Ajouter un compte
        </button>
      </div>

      <div className="section-title">Compte actif</div>
      <div className="account-list-row active" style={{ marginBottom: 18 }}>
        <div className="account-list-avatar">{name[0]?.toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{uuid || 'UUID non disponible'}</div>
        </div>
        <span className="tag tag-green">Actif</span>
        <button className="btn-danger" onClick={onLogout}>Déconnecter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
        <div className="stats-card">
          <div className="stat-label">Type</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Microsoft</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>Java Edition</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Serveur</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>play.rebornmc.fr</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>EU-West</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Rang</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-2)', marginTop: 6 }}>Joueur</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>Rang par défaut</div>
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
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Compte Microsoft</div>
                </div>
                <button className="btn btn-sm" onClick={() => onSwitchAccount(acc)}>Utiliser</button>
                <button className="btn-danger" onClick={() => onRemoveAccount(acc.uuid)}>
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

/* ============ LOGS ============ */
function LogsScreen({ logs = [], addToast }) {
  const [filter, setFilter] = useState('ALL');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const filtered  = filter === 'ALL' ? logs : logs.filter(l => l.lvl === filter);
  const lvlColor  = { INFO: 'var(--text-2)', WARN: 'var(--amber)', ERR: 'var(--red)' };

  function copyLogs() {
    const text = filtered.map(l => `[${l.ts}] ${l.lvl} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => { if (addToast) addToast('Logs copiés', 'success'); });
  }

  return (
    <div className="main-inner">
      <div className="page-header">
        <div>
          <div className="page-title">Diagnostics</div>
          <h1 className="page-h1">Logs du launcher</h1>
          <div className="page-sub">{logs.length} entrée{logs.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {['ALL', 'INFO', 'WARN', 'ERR'].map(lvl => (
            <button key={lvl} className={`chip${filter === lvl ? ' active' : ''}`} onClick={() => setFilter(lvl)}>{lvl}</button>
          ))}
          <button className="btn btn-sm" onClick={copyLogs}><Icon name="copy" size={12} /> Copier</button>
        </div>
      </div>

      <div ref={scrollRef} className="card" style={{
        padding: 16, fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.75,
        background: 'rgba(5,5,8,0.95)',
        maxHeight: 'calc(100vh - 210px)', overflowY: 'auto',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            {logs.length === 0 ? 'Lance le jeu pour voir les logs.' : 'Aucun log pour ce filtre.'}
          </div>
        )}
        {filtered.map((l, i) => (
          <div key={i} className="log-line">
            <span style={{ color: 'var(--text-3)' }}>[{l.ts}]</span>
            <span style={{ color: lvlColor[l.lvl] || 'var(--text-2)', fontWeight: l.lvl !== 'INFO' ? 600 : 400 }}>{l.lvl}</span>
            <span style={{ color: 'var(--text)' }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ LAUNCH OVERLAY ============ */
function LaunchOverlay({ state, onClose, onCancel }) {
  const { progress, stage, logs, running } = state;
  return (
    <div className="patch-overlay">
      <div className="patch-window">
        <div className="patch-corner">
          {running ? '▸ Préparation en cours' : '✓ Terminé'}
        </div>
        {!running && (
          <button className="icon-btn" style={{ position: 'absolute', top: 10, right: 10 }} onClick={onClose}>
            <Icon name="close" size={13} />
          </button>
        )}
        <div className="patch-title">{running ? 'Lancement du jeu…' : 'Jeu lancé.'}</div>
        <div className="patch-sub">{(stage || '').length > 130 ? stage.slice(0, 130) + '…' : stage}</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: Math.min(100, progress) + '%' }} />
        </div>
        <div className="progress-meta">
          <span>{Math.min(100, progress).toFixed(0)}%</span>
          <span>{running ? 'En cours…' : 'Terminé'}</span>
        </div>
        <div className="progress-stage">
          {(logs || []).slice(-6).map((l, i) => (
            <div key={i} className="log-line">
              <span className="ts">[{l.ts}]</span>
              <span className={l.ok === false ? 'err-text' : l.ok ? 'ok' : ''} style={{ gridColumn: '2 / 4' }}>{l.msg}</span>
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

/* ============ CRASH REPORTER ============ */
function CrashReporter({ code, logs, onClose }) {
  function copyLogs() {
    const text = (logs || []).map(l => `[${l.ts}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(`Minecraft crash — code ${code}\n\n${text}`).catch(() => {});
  }
  return (
    <div className="patch-overlay">
      <div className="patch-window" style={{ borderColor: 'var(--red-bdr)' }}>
        <div className="patch-corner" style={{ color: 'var(--red)' }}>✕ Crash détecté</div>
        <div className="patch-title" style={{ color: 'var(--red)' }}>Minecraft a planté</div>
        <div className="patch-sub">
          Code de sortie : <b style={{ fontFamily: 'var(--mono)' }}>{code}</b> — consulte les logs ci-dessous.
        </div>
        <div className="progress-stage" style={{ maxHeight: 200, overflowY: 'auto' }}>
          {(logs || []).map((l, i) => (
            <div key={i} className="log-line">
              <span className="ts">[{l.ts}]</span>
              <span className={l.ok === false ? 'err-text' : ''} style={{ gridColumn: '2 / 4' }}>{l.msg}</span>
            </div>
          ))}
        </div>
        <div className="patch-actions">
          <button className="btn btn-sm" onClick={copyLogs}><Icon name="copy" size={12} /> Copier les logs</button>
          <button className="btn btn-sm" onClick={() => window.electronAPI.openUrl('https://discord.gg/rebornmc')}>
            <Icon name="chat" size={12} /> Support Discord
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ============ PLACEHOLDER ============ */
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
      <div className="card" style={{ padding: 60, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 12 }}>Bientôt disponible</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, ModsScreen, ProfileScreen, StoreScreen,
  AccountScreen, PlaceholderScreen, LogsScreen, LaunchOverlay, CrashReporter,
});
