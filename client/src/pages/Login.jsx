import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.name);
      navigate('/');
    } catch (err) {
      setError('Cannot connect to server. Is it running?');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Login</h2>
      {error && (
        <p style={{ color: 'red', marginBottom: '1rem', fontSize: 13 }}>{error}</p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12, fontSize: 14, display: 'block' }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 16, fontSize: 14, display: 'block' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, fontSize: 14, cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}