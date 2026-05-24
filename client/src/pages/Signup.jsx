import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState('');
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
      const res = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
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
      <h2 style={{ marginBottom: '1.5rem' }}>Create account</h2>
      {error && (
        <p style={{ color: 'red', marginBottom: '1rem', fontSize: 13 }}>{error}</p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 12, fontSize: 14, display: 'block' }}
        />
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
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
        Have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}