import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = '';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [dark] = useState(() => localStorage.getItem('theme') === 'dark');

  const loggedIn = !!localStorage.getItem('token');

  const pageBg = dark ? '#191919' : '#f7f7f5';
  const cardBg = dark ? '#1f1f1f' : '#ffffff';
  const border  = dark ? '#2f2f2f' : '#e8e8e4';
  const text    = dark ? '#e8e8e4' : '#37352f';
  const subtext = dark ? '#9b9b9b' : '#787774';

  useEffect(() => {
    fetch(`${API}/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError('Could not load invite'));
  }, [token]);

  async function accept() {
    setAccepting(true);
    try {
      const res = await fetch(`${API}/invite/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setAccepting(false); return; }
      navigate(`/doc/${data.docId}`);
    } catch {
      setError('Something went wrong');
      setAccepting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pageBg, padding: '1rem' }}>
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>

        {error ? (
          <>
            <h2 style={{ color: text, marginBottom: '0.5rem' }}>Invalid invite</h2>
            <p style={{ color: subtext, fontSize: '0.9rem' }}>{error}</p>
            <button onClick={() => navigate('/')}
              style={{ marginTop: '1.5rem', padding: '0.6rem 1.2rem', background: text, color: cardBg, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
              Go home
            </button>
          </>
        ) : !info ? (
          <p style={{ color: subtext }}>Loading invite...</p>
        ) : (
          <>
            <h2 style={{ color: text, marginBottom: '0.25rem' }}>You've been invited</h2>
            <p style={{ color: subtext, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Document: <strong style={{ color: text }}>"{info.docTitle || 'Untitled'}"</strong>
            </p>
            <p style={{ color: subtext, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Access: <strong style={{ color: text }}>{info.role === 'edit' ? 'Can edit' : 'View only'}</strong>
            </p>

            {!loggedIn ? (
              <>
                <p style={{ color: subtext, fontSize: '0.875rem', marginBottom: '1rem' }}>
                  You need to be signed in to accept this invite.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                    style={{ flex: 1, padding: '0.65rem', background: text, color: cardBg, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    Sign in
                  </button>
                  <button onClick={() => navigate(`/signup?redirect=/invite/${token}`)}
                    style={{ flex: 1, padding: '0.65rem', background: 'none', color: text, border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    Create account
                  </button>
                </div>
              </>
            ) : (
              <button onClick={accept} disabled={accepting}
                style={{ width: '100%', padding: '0.7rem', background: text, color: cardBg, border: 'none', borderRadius: '8px', cursor: accepting ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: accepting ? 0.6 : 1 }}>
                {accepting ? 'Accepting...' : 'Accept invite'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}