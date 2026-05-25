import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: pageBg,
      padding: '1rem',
    },
    card: {
      background: cardBg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      padding: '2.5rem',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      position: 'relative',
    },
    themeToggle: {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      fontSize: '1.1rem',
      cursor: 'pointer',
      padding: '0.25rem',
      lineHeight: 1,
    },
    logo: { fontSize: '2rem', marginBottom: '1rem' },
    title: { fontSize: '1.5rem', fontWeight: '600', color: text, marginBottom: '0.25rem' },
    subtitle: { fontSize: '0.9rem', color: subtext, marginBottom: '1.5rem' },
    error: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '0.75rem',
      borderRadius: '8px',
      fontSize: '0.875rem',
      marginBottom: '1rem',
    },
    field: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.875rem', fontWeight: '500', color: text, marginBottom: '0.4rem' },
    input: {
      width: '100%',
      padding: '0.625rem 0.875rem',
      border: `1px solid ${border}`,
      borderRadius: '8px',
      fontSize: '0.95rem',
      color: text,
      background: cardBg,
      outline: 'none',
      boxSizing: 'border-box',
    },
    button: {
      width: '100%',
      padding: '0.7rem',
      background: dark ? '#e8e8e4' : '#37352f',
      color: dark ? '#191919' : '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '500',
      cursor: 'pointer',
      marginTop: '0.5rem',
    },
    footer: { textAlign: 'center', fontSize: '0.875rem', color: subtext, marginTop: '1.5rem' },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed'); setLoading(false); return; }
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
      <div style={styles.card}>
        <button style={styles.themeToggle} onClick={() => setDark(d => !d)}>
          {dark ? '☀️' : '🌙'}
        </button>

        <div style={styles.logo}>📝</div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Start collaborating for free</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Your name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tanishka"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}