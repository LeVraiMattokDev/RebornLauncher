/* global React */
const { useState } = React;

function AuthScreen({ onAuth, accounts = [] }) {
  const [showForm, setShowForm] = useState(accounts.length === 0);
  const [username, setUsername] = useState('');
  const [error, setError]       = useState('');

  function validate(name) {
    if (!name) return 'Entrez un pseudo.';
    if (name.length < 3 || name.length > 16) return 'Pseudo : 3 à 16 caractères.';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Lettres, chiffres et _ uniquement.';
    return '';
  }

  function handleSubmit() {
    const name = username.trim();
    const err = validate(name);
    if (err) { setError(err); return; }
    onAuth(name);
  }

  const Brand = () => (
    <div className="auth-brand">
      <div className="auth-logo"><img src="./assets/logo.png" style={{ width: 32, height: 32, objectFit: 'contain' }} /></div>
      <h1 className="auth-title">REBORNMC</h1>
      <p className="auth-version">Launcher v1.0.0</p>
    </div>
  );

  if (!showForm) {
    return (
      <div className="auth-overlay">
        <div className="auth-box">
          <Brand />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--pixel-font)', color: 'var(--text-faint)', marginBottom: 4 }}>
              CHOISIR UN COMPTE
            </div>
            {accounts.map(acc => (
              <button key={acc} className="auth-account-card" onClick={() => onAuth(acc)}>
                <div className="auth-account-avatar">{acc[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{acc}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Mode hors-ligne</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            ))}
            <button className="btn" style={{ marginTop: 4, fontSize: 13 }} onClick={() => { setShowForm(true); setUsername(''); setError(''); }}>
              + Nouveau compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        <Brand />
        <div className="auth-form">
          {accounts.length > 0 && (
            <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowForm(false)}>
              ← Retour
            </button>
          )}
          <label className="auth-label">Pseudo de jeu</label>
          <input
            className="auth-input"
            type="text"
            value={username}
            maxLength={16}
            autoFocus
            placeholder="VotreNom_"
            onChange={e => { setUsername(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-badge">
            <span className="auth-badge-dot" />
            Mode hors-ligne · Aucun compte Mojang requis
          </div>
          <button className="btn btn-primary auth-btn" onClick={handleSubmit}>
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen });
