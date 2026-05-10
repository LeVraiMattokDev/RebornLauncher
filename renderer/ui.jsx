/* global React */
const { useState, useEffect, useRef } = React;

/* ============== ICONS ============== */
const Icon = ({ name, size = 18 }) => {
  const paths = {
    home:     <><path d="M3 11l9-8 9 8" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
    cube:     <><path d="M12 3l9 5v8l-9 5-9-5V8l9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
    layers:   <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" /></>,
    store:    <><path d="M3 7h18l-1.5 11.5a2 2 0 0 1-2 1.5h-11a2 2 0 0 1-2-1.5L3 7z" /><path d="M8 7V5a4 4 0 0 1 8 0v2" /></>,
    cog:      <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></>,
    user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    search:   <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
    plus:     <path d="M12 5v14M5 12h14" />,
    chev:     <path d="M6 9l6 6 6-6" />,
    folder:   <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />,
    users:    <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M14 20c0-2 2-4 4-4s4 1 4 3" /></>,
    spark:    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" />,
    log:      <><path d="M4 6h16M4 12h16M4 18h10" /></>,
    refresh:  <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
    crown:    <path d="M3 18h18M3 7l4 5 5-7 5 7 4-5v11H3V7z" />,
    chat:     <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" />,
    close:    <><path d="M6 6l12 12M18 6L6 18" /></>,
    edit:     <><path d="M12 20h9" /><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  };
  return (
    <svg className="nav-icon" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

/* ============== 3D Skin Viewer ============== */
function SkinViewer3D({ skinUrl, username, width = 140, height = 190 }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  // Créer le viewer une seule fois au montage
  useEffect(() => {
    if (!canvasRef.current || !window.skinview3d) return;
    try {
      const viewer = new window.skinview3d.SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
      });

      if (viewer.camera) {
        viewer.camera.rotation.x = -0.2;
        viewer.camera.position.z = 50;
      }
      viewer.autoRotate = false;
      if (viewer.controls) viewer.controls.enableZoom = false;

      if (window.skinview3d.WalkingAnimation) {
        const anim = viewer.loadAnimation(window.skinview3d.WalkingAnimation);
        if (anim) anim.speed = 0.6;
      }

      viewerRef.current = viewer;

      return () => {
        try { viewer.dispose(); } catch (_) {}
        viewerRef.current = null;
      };
    } catch (e) {
      console.warn('SkinViewer3D init failed:', e.message);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger la skin quand l'URL change
  useEffect(() => {
    if (!viewerRef.current) return;
    const steve = 'https://crafatar.com/skins/8667ba71-b85a-4004-af54-457a9734eed7';
    const url = skinUrl || steve;
    try {
      viewerRef.current.loadSkin(url).catch(() => {
        if (viewerRef.current) viewerRef.current.loadSkin(steve).catch(() => {});
      });
    } catch (e) {
      console.warn('SkinViewer3D loadSkin failed:', e.message);
    }
  }, [skinUrl]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, background: 'transparent' }} />
    </div>
  );
}

/* ============== TopBar ============== */
function TopBar({ user, onNav }) {
  return (
    <div className="topbar">
      <div className="titlebar-drag" />
      <div className="brand">
        <div className="brand-mark"><img src="./assets/logo.png" style={{ width: 22, height: 22, objectFit: 'contain' }} /></div>
        <div className="brand-text">
          <div className="brand-name">REBORNMC</div>
          <div className="brand-sub">Launcher v1.0.0</div>
        </div>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        <button className="icon-btn" title="Notifications">
          <Icon name="bell" size={16} />
        </button>
      </div>
      <div className="user-chip" onClick={() => onNav('account')}>
        <div className="user-avatar online">{user.initials}</div>
        <div>
          <div className="user-name">{user.name}</div>
          <div className="user-rank">HORS-LIGNE</div>
        </div>
        <Icon name="chev" size={14} />
      </div>
      <div className="titlebar-controls">
        <button className="wc-btn wc-min" title="Réduire" onClick={() => window.electronAPI.minimizeWindow()} />
        <button className="wc-btn wc-max" title="Agrandir" onClick={() => window.electronAPI.maximizeWindow()} />
        <button className="wc-btn wc-close" title="Fermer" onClick={() => window.electronAPI.closeWindow()} />
      </div>
    </div>
  );
}

/* ============== Sidebar ============== */
function Sidebar({ active, onNav }) {
  const items = [
    { group: "Jouer" },
    { id: "home",        label: "Accueil",      icon: "home" },
    { id: "mods",        label: "Mods",         icon: "cube" },
    { id: "profiles",   label: "Profil",        icon: "layers" },
    { group: "Serveur" },
    { id: "store",       label: "Boutique",     icon: "store", badge: "NEW" },
    { group: "Vous" },
    { id: "account",     label: "Compte",       icon: "user" },
    { id: "logs",        label: "Logs",         icon: "log" },
  ];
  return (
    <div className="sidebar">
      {items.map((it, i) => {
        if (it.group) return <div key={`g-${i}`} className="nav-label">{it.group}</div>;
        return (
          <button key={it.id} className={`nav-item${active === it.id ? " active" : ""}`} onClick={() => onNav(it.id)}>
            <Icon name={it.icon} />
            <span className="nav-text">{it.label}</span>
            {it.badge && <span className="nav-badge">{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ============== StatusBar ============== */
function StatusBar({ ping, server }) {
  return (
    <div className="statusbar">
      <div className="statusbar-item">
        <span className={`status-dot${server.up ? "" : " err"}`} />
        <span>{server.up ? "EN LIGNE" : "HORS LIGNE"}</span>
      </div>
      <div className="statusbar-item">play.rebornmc.fr</div>
      <div className="tick-sep">·</div>
      <div className="statusbar-item">{server.up ? `${ping} ms` : "—"}</div>
      <div className="tick-sep">·</div>
      <div className="statusbar-item">{server.up ? `${server.players}/${server.max} joueurs` : "—"}</div>
      <div className="statusbar-spacer" />
      <div className="tick-text">
        <span>région : EU-West</span>
        <span className="tick-sep">·</span>
        <span>build 2026.5.10-r1</span>
        <span className="tick-sep">·</span>
        <span>java 21.0.4</span>
      </div>
    </div>
  );
}

/* ============== Switch ============== */
const Switch = ({ on, onChange }) => (
  <button className={`switch${on ? " on" : ""}`} onClick={() => onChange(!on)} />
);

Object.assign(window, { Icon, SkinViewer3D, TopBar, Sidebar, StatusBar, Switch });
