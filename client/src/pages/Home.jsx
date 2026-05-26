import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile'; // ADDED

const API = '';

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile(); // ADDED
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

      {/* Navbar — MOBILE: hide username, tighten padding */}
      <div style={{
        ...s.navbar,
        background: t.navBg,
        borderBottom: `1px solid ${t.border}`,
        padding: isMobile ? '0 1rem' : '0 1.5rem', // MOBILE
      }}>
        <div style={s.navLeft}>
          <span style={s.navLogo}>📝</span>
          <span style={{ ...s.navTitle, color: t.text }}>My Notes</span>
        </div>
        <div style={s.navRight}>
          <button
            onClick={() => setDark(d => !d)}
            style={{ ...s.iconBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <div style={{ ...s.avatar, background: t.avatarBg, color: t.avatarText }}>
            {initials}
          </div>
          {/* MOBILE: hide username to save space */}
          {!isMobile && (
            <span style={{ ...s.userName, color: t.text }}>{userName}</span>
          )}
          <button
            onClick={logout}
            style={{ ...s.logoutBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.subtext }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        ...s.content,
        padding: isMobile ? '1.5rem 1rem' : '2.5rem 1rem', // MOBILE
      }}>
        {/* MOBILE: stack title and button vertically */}
        <div style={{
          ...s.header,
          flexDirection: isMobile ? 'column' : 'row', // MOBILE
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '0.75rem' : '0',
          marginBottom: '1.5rem',
        }}>
          <h1 style={{ ...s.pageTitle, color: t.text }}>Documents</h1>
          <button
            onClick={createDoc}
            disabled={creating}
            style={{
              ...s.newBtn,
              background: t.text,
              color: t.pageBg,
              opacity: creating ? 0.6 : 1,
              width: isMobile ? '100%' : 'auto', // MOBILE: full-width button
            }}
          >
            {creating ? 'Creating...' : '+ New document'}
          </button>
        </div>

        {!loading && docs.length > 0 && (
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              ...s.searchBar,
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              color: t.text,
            }}
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
            // MOBILE: 2 columns on mobile instead of auto-fill 220px
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {filteredDocs.map(doc => {
              const displayTitle = doc.title && doc.title.trim() !== '' ? doc.title : 'Untitled';
              const isUntitled = displayTitle === 'Untitled';

              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/doc/${doc.id}`)}
                  style={{
                    ...s.docCard,
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                    padding: isMobile ? '1rem' : '1.25rem', // MOBILE
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = t.text}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <div style={s.docCardTop}>
                    <span style={s.docIcon}>📄</span>
                    <button
                      onClick={e => deleteDoc(e, doc.id)}
                      style={{ ...s.deleteBtn, color: t.subtext }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{
                    ...s.docTitle,
                    color: isUntitled ? t.subtext : t.text,
                    fontStyle: isUntitled ? 'italic' : 'normal',
                    fontSize: isMobile ? '0.875rem' : '0.95rem', // MOBILE
                  }}>
                    {displayTitle}
                  </p>
                  <p style={{ ...s.docMeta, color: t.subtext }}>
                    Edited {formatDate(doc.updatedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    height: '52px', position: 'sticky', top: 0, zIndex: 10
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  navLogo: { fontSize: '1.2rem' },
  navTitle: { fontSize: '0.95rem', fontWeight: '600' },
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
  pageTitle: { fontSize: '1.4rem', fontWeight: '600', margin: 0 },
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
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.8rem', padding: '2px 4px', borderRadius: '4px', opacity: 0.6
  },
  docTitle: { fontWeight: '500', marginBottom: '0.4rem', wordBreak: 'break-word' },
  docMeta: { fontSize: '0.78rem' }
};