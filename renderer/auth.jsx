/* global React */
const { useState } = React;

function AuthScreen({ onAuth, version }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleMicrosoftLogin() {
    setLoading(true);
    setError('');
    try {
      const res = await window.electronAPI.msAuthStart();
      if (res.success) {
        onAuth(res.account);
      } else {
        setError(res.error || 'Connexion échouée.');
      }
    } catch (e) {
      setError(e.message || 'Erreur inattendue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay">
      <div className="titlebar-drag" style={{ position: 'fixed', top: 0, left: 0, right: 80, height: 36, zIndex: 10001 }} />
      <div className="titlebar-controls" style={{ position: 'fixed', top: 8, right: 12, zIndex: 10001 }}>
        <button className="wc-btn wc-min" title="Réduire" onClick={() => window.electronAPI.minimizeWindow()} />
        <button className="wc-btn wc-max" title="Agrandir" onClick={() => window.electronAPI.maximizeWindow()} />
        <button className="wc-btn wc-close" title="Fermer" onClick={() => window.electronAPI.closeWindow()} />
      </div>
      <div className="auth-box">
        <div className="auth-brand">
          <div className="auth-logo">
            <img src="./assets/logo.png" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title">REBORNMC</h1>
          <p className="auth-version">Launcher v{version}</p>
        </div>

        <div className="auth-form">
          <div className="auth-badge" style={{ marginBottom: 16 }}>
            <span className="auth-badge-dot" />
            Connexion Microsoft requise · Minecraft Java Edition
          </div>

          {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button
            className="btn btn-primary auth-btn"
            onClick={handleMicrosoftLogin}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                Connexion en cours…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
                  <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                Se connecter avec Microsoft
              </>
            )}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
            Une fenêtre de connexion Microsoft s&apos;ouvrira.<br/>
            Minecraft Java Edition requis sur ce compte.
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthScreen });
