import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

const API = '';

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareModal, setShareModal] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('view');
  const [shareStatus, setShareStatus] = useState('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('name') || 'User';
  const initials = userName.slice(0, 2).toUpperCase();
  const t = dark ? darkTheme : lightTheme;

  const filteredDocs = docs.filter(doc =>
    (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchDocs();
  }, []);

  useEffect(() => {
    function onFocus() { fetchDocs(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  async function fetchDocs() {
    try {
      const res = await fetch(`${API}/docs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      setDocs(data);
    } catch {
      console.error('Failed to load docs');
    } finally {
      setLoading(false);
    }
  }

  async function createDoc() {
    setCreating(true);
    try {
      const res = await fetch(`${API}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: '' })
      });
      const doc = await res.json();
      navigate(`/doc/${doc.id}`);
    } catch {
      console.error('Failed to create doc');
      setCreating(false);
    }
  }

  async function deleteDoc(e, docId) {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await fetch(`${API}/docs/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      console.error('Failed to delete doc');
    }
  }

  function openShareModal(e, docId) {
    e.stopPropagation();
    setShareModal(docId);
    setShareEmail('');
    setShareRole('view');
    setShareStatus('');
  }

  async function submitShare() {
    if (!shareEmail.trim()) return;
    setShareStatus('sending');
    try {
      const res = await fetch(`${API}/docs/${shareModal}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: shareEmail.trim(), role: shareRole })
      });
      const data = await res.json();
      if (!res.ok) { setShareStatus(data.error || 'Something went wrong'); return; }
      setShareStatus('sent');
    } catch {
      setShareStatus('Something went wrong');
    }
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  return (
    <div style={{ ...s.page, background: t.pageBg }}>

      {/* Navbar */}
      <div style={{
        ...s.navbar, background: t.navBg, borderBottom: `1px solid ${t.border}`,
        padding: isMobile ? '0 1rem' : '0 1.5rem',
      }}>
        <div style={s.navLeft}>
           <div style={s.logoBox}><div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#e8734a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  </div></div>
         <span style={{ fontSize: '1 rem', fontWeight: '600', color: t.text }}>CollabDocs</span>
        </div>
        <div style={s.navRight}>
          <button onClick={() => setDark(d => !d)}
            style={{ ...s.iconBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
            {dark ? '✺' : '☾'}
          </button>
          <div style={{ ...s.avatar, background: t.avatarBg, color: t.avatarText }}>{initials}</div>
          {!isMobile && <span style={{ ...s.userName, color: t.text }}>{userName}</span>}
          <button onClick={logout}
            style={{ ...s.logoutBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.subtext }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ ...s.content, padding: isMobile ? '1.5rem 1rem' : '2.5rem 1rem' }}>
        <div style={{
          ...s.header,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '0.75rem' : '0',
          marginBottom: '1.5rem',
        }}>
          <h1 style={{ ...s.pageTitle, color: t.text }}>Documents</h1>
          <button onClick={createDoc} disabled={creating}
            style={{
              ...s.newBtn, background: t.text, color: t.pageBg,
              opacity: creating ? 0.6 : 1, width: isMobile ? '100%' : 'auto',
            }}>
            {creating ? 'Creating...' : '+ New document'}
          </button>
        </div>

        {!loading && docs.length > 0 && (
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...s.searchBar, background: t.cardBg, border: `1px solid ${t.border}`, color: t.text }}
          />
        )}

        {loading ? (
          <p style={{ ...s.empty, color: t.subtext }}>Loading...</p>
        ) : docs.length === 0 ? (
          <div style={s.emptyState}>
            <p style={{ ...s.emptyTitle, color: t.text }}>No documents yet</p>
            <p style={{ ...s.emptySubtitle, color: t.subtext }}>Create your first document to get started</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={s.emptyState}>
            <p style={{ ...s.emptyTitle, color: t.text }}>No results for "{searchQuery}"</p>
            <p style={{ ...s.emptySubtitle, color: t.subtext }}>Try a different title</p>
          </div>
        ) : (
          <div style={{
            ...s.grid,
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {filteredDocs.map(doc => {
              const displayTitle = doc.title && doc.title.trim() !== '' ? doc.title : 'Untitled';
              const isUntitled = displayTitle === 'Untitled';

              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/doc/${doc.id}`)}
                  style={{
                    ...s.docCard, background: t.cardBg, border: `1px solid ${t.border}`,
                    padding: isMobile ? '1rem' : '1.25rem',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = t.text}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <div style={s.docCardTop}>
                    <span style={s.docIcon}>📄</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!doc.shared && (
                        <button onClick={e => openShareModal(e, doc.id)}
                          style={{ ...s.actionBtn, color: t.subtext }} title="Share">
                          ↗
                        </button>
                      )}
                      {!doc.shared && (
                        <button onClick={e => deleteDoc(e, doc.id)}
                          style={{ ...s.actionBtn, color: t.subtext }} title="Delete">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{
                    ...s.docTitle,
                    color: isUntitled ? t.subtext : t.text,
                    fontStyle: isUntitled ? 'italic' : 'normal',
                    fontSize: isMobile ? '0.875rem' : '0.95rem',
                  }}>
                    {displayTitle}
                  </p>

                  <p style={{ ...s.docMeta, color: t.subtext }}>
                    Edited {formatDate(doc.updatedAt)}
                  </p>

                  {doc.shared && (
                    <span style={{ fontSize: '0.7rem', color: t.subtext, marginTop: '4px', display: 'block' }}>
                      {doc.role === 'edit' ? '✏️ Shared with you' : '👁 View only'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1rem'
          }}
          onClick={() => setShareModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '12px',
              padding: '2rem', width: '100%', maxWidth: '400px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
            }}
          >
            <h3 style={{ color: t.text, marginBottom: '1.25rem', fontSize: '1rem', fontWeight: '600', margin: '0 0 1.25rem' }}>
              Share document
            </h3>

            {shareStatus === 'sent' ? (
              <>
                <p style={{ color: t.text, marginBottom: '1rem' }}>✓ Invite sent to {shareEmail}</p>
                <button onClick={() => setShareModal(null)}
                  style={{ width: '100%', padding: '0.65rem', background: t.text, color: t.cardBg, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  Done
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: t.text, marginBottom: '0.4rem' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={e => setShareEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitShare()}
                    placeholder="colleague@example.com"
                    style={{
                      width: '100%', padding: '0.6rem 0.875rem', border: `1px solid ${t.border}`,
                      borderRadius: '8px', fontSize: '0.9rem', color: t.text, background: t.pageBg,
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: t.text, marginBottom: '0.4rem' }}>
                    Permission
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['view', 'edit'].map(r => (
                      <button key={r} onClick={() => setShareRole(r)}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
                          border: `1px solid ${shareRole === r ? t.text : t.border}`,
                          background: shareRole === r ? t.text : 'none',
                          color: shareRole === r ? t.cardBg : t.text,
                          fontSize: '0.875rem', fontWeight: '500'
                        }}>
                        {r === 'view' ? '👁 View' : '✏️ Edit'}
                      </button>
                    ))}
                  </div>
                </div>

                {shareStatus && shareStatus !== 'sending' && (
                  <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    {shareStatus}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setShareModal(null)}
                    style={{ flex: 1, padding: '0.65rem', background: 'none', color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    Cancel
                  </button>
                  <button
                    onClick={submitShare}
                    disabled={shareStatus === 'sending' || !shareEmail.trim()}
                    style={{
                      flex: 1, padding: '0.65rem', background: t.text, color: t.cardBg,
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                      opacity: (shareStatus === 'sending' || !shareEmail.trim()) ? 0.6 : 1
                    }}>
                    {shareStatus === 'sending' ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const lightTheme = {
  pageBg: '#f7f7f5', navBg: '#ffffff', border: '#e8e8e4',
  text: '#37352f', subtext: '#787774', cardBg: '#ffffff',
  btnBg: '#ffffff', avatarBg: '#37352f', avatarText: '#ffffff'
};

const darkTheme = {
  pageBg: '#191919', navBg: '#1f1f1f', border: '#2f2f2f',
  text: '#e8e8e4', subtext: '#9b9b9b', cardBg: '#1f1f1f',
  btnBg: '#2f2f2f', avatarBg: '#e8e8e4', avatarText: '#191919'
};

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
navbar: {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  height: '64px', // was 52px
  position: 'sticky', top: 0, zIndex: 10
},
navTitle: { fontSize: '1rem', fontWeight: '700', color: '#e8734a' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  navLogo: { fontSize: '1.2rem' },
 
  navRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  iconBtn: { fontSize: '1rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', lineHeight: 1 },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: '600'
  },
  userName: { fontSize: '0.875rem' },
  logoutBtn: { fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  content: { maxWidth: '860px', width: '100%', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: '2rem', fontWeight: '700', margin: 0 },
  newBtn: {
    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
    fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'opacity 0.15s'
  },
  searchBar: {
    width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px',
    fontSize: '0.875rem', marginBottom: '1.5rem', outline: 'none', boxSizing: 'border-box',
  },
  empty: { textAlign: 'center', marginTop: '4rem' },
  emptyState: { textAlign: 'center', marginTop: '5rem' },
  emptyTitle: { fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' },
  emptySubtitle: { fontSize: '0.9rem' },
  grid: { display: 'grid', gap: '1rem' },
  docCard: { borderRadius: '10px', cursor: 'pointer', transition: 'border-color 0.15s', userSelect: 'none' },
  docCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  docIcon: { fontSize: '1.5rem' },
  actionBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.8rem', padding: '2px 4px', borderRadius: '4px', opacity: 0.6
  },
  docTitle: { fontWeight: '500', marginBottom: '0.4rem', wordBreak: 'break-word' },
  docMeta: { fontSize: '0.78rem' }
};