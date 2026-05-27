import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const pageBg  = dark ? '#191919' : '#f7f7f5';
  const cardBg  = dark ? '#1f1f1f' : '#ffffff';
  const border  = dark ? '#2f2f2f' : '#e8e8e4';
  const text    = dark ? '#e8e8e4' : '#37352f';
  const subtext = dark ? '#9b9b9b' : '#787774';

  const styles = {
    page: {
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: pageBg, padding: '1rem',
    },
    appName: {
      fontSize: '1.5rem', fontWeight: '700', color: '#e8734a',
      marginBottom: '1.5rem', letterSpacing: '-0.5px',
      display: 'flex', alignItems: 'center', gap: '0.4rem'
    },
    card: {
      background: cardBg, border: `1px solid ${border}`, borderRadius: '12px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      width: '100%', maxWidth: '400px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative',
    },
    themeToggle: {
      position: 'absolute', top: '1rem', right: '1rem',
      background: 'none', border: 'none', fontSize: '1.1rem',
      cursor: 'pointer', padding: '0.25rem', lineHeight: 1,
    },
    title: { fontSize: '1.4rem', fontWeight: '600', color: text, marginBottom: '0.25rem' },
    subtitle: { fontSize: '0.9rem', color: subtext, marginBottom: '1.5rem' },
    error: {
      background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
      padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem',
    },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.875rem', fontWeight: '500', color: text, marginBottom: '0.4rem' },
    input: {
      width: '100%', padding: '0.625rem 0.875rem', border: `1px solid ${border}`,
      borderRadius: '8px', fontSize: '0.95rem', color: text, background: cardBg,
      outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
    },
    button: {
      width: '100%', padding: '0.7rem',
      background: dark ? '#e8e8e4' : '#37352f', color: dark ? '#191919' : '#ffffff',
      border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '500',
      cursor: 'pointer', marginTop: '0.5rem', transition: 'opacity 0.15s',
    },
    footer: { textAlign: 'center', fontSize: '0.875rem', color: subtext, marginTop: '1.5rem' },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.name);
      navigate('/');
    } catch {
      setError('Cannot connect to server. Is it running?');
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
       <div style={styles.appName}>
  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e8734a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  </div>
  CollabDocs
</div>
      
      <div style={styles.card}>
        <button style={styles.themeToggle} onClick={() => setDark(d => !d)}>
          {dark ? '✺' : '☾'}
        </button>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required style={styles.input} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
            <Link to="/forgot-password" style={{       fontSize: '0.8rem', color: subtext }}>
            Forgot password?
            </Link>
        </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={styles.footer}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}