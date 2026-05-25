import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const API = 'http://localhost:3001';

export default function App() {
  const { docId } = useParams();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('connecting...');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [saving, setSaving] = useState(false);

  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('name') || 'anonymous';
  const initials = userName.slice(0, 2).toUpperCase();

  const t = dark ? darkTheme : lightTheme;

  // ─── Socket + doc load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!docId)  { navigate('/');     return; }

    socketRef.current = io(API, { auth: { token } });

    socketRef.current.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        localStorage.clear();
        navigate('/login');
      }
    });

    socketRef.current.emit('join-doc', { docId });

    socketRef.current.on('load-doc', ({ content, version }) => {
      setContent(content);
      setVersion(version);
      setStatus('synced');
    });

    socketRef.current.on('receive-changes', ({ delta, version }) => {
      setContent(delta);
      setVersion(version);
      setStatus('synced');
    });

    socketRef.current.on('save-confirmed', ({ version }) => {
      setVersion(version);
      setStatus('saved');
    });

    socketRef.current.on('conflict', ({ serverContent }) => {
      const keep = confirm(
        'Someone else edited this document.\n\nClick OK to use their version, Cancel to keep yours.'
      );
      if (keep) setContent(serverContent);
    });

    socketRef.current.on('error', ({ message }) => {
      alert(message);
      navigate('/');
    });

    // Load title from REST API
    fetch(`${API}/docs/${docId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(doc => {
        if (doc?.title) setTitle(doc.title);
      });

    return () => socketRef.current?.disconnect();
  }, [docId]);

  // ─── Persist theme ────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // ─── Content change (debounced socket emit) ──────────────────────────────────
  function handleChange(e) {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('saving...');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socketRef.current.emit('send-changes', { docId, delta: newContent, version });
    }, 500);
  }

  // ─── Title change (local only, saved on Done) ─────────────────────────────────
  function handleTitleChange(e) {
    setTitle(e.target.value);
  }

  // ─── Done: flush content + title, then go back ───────────────────────────────
  async function handleDone() {
    setSaving(true);

    // Flush any pending content save immediately
    clearTimeout(saveTimer.current);
    socketRef.current.emit('send-changes', { docId, delta: content, version });

    // Save title to REST API
    try {
      await fetch(`${API}/docs/${docId}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim() || 'Untitled' })
      });
    } catch (err) {
      console.error('Title save failed:', err);
    }

    setSaving(false);
    navigate('/');
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────
  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  const statusColor =
    status === 'synced' || status === 'saved' ? '#0f7b6c' : '#787774';

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...styles.page, background: t.pageBg }}>

      {/* NAVBAR */}
      <div style={{ ...styles.navbar, background: t.navBg, borderBottom: `1px solid ${t.border}` }}>

        {/* Left: Back + Logo + Title input */}
        <div style={styles.navLeft}>
          <button
            onClick={() => navigate('/')}
            style={{ ...styles.backBtn, color: t.subtext }}
          >
            ← Documents
          </button>

          <span style={styles.navLogo}>📝</span>

          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            style={{
              ...styles.titleInput,
              color: t.text,
              borderBottom: `1px solid ${t.border}`,
            }}
          />
        </div>

        {/* Right: status + version + theme + avatar + Done + signout */}
        <div style={styles.navRight}>

          <span style={{ ...styles.status, color: statusColor }}>
            {status === 'saved' || status === 'synced' ? '✓' : '○'} {status}
          </span>

          <span style={{
            ...styles.versionBadge,
            background: t.badgeBg,
            border: `1px solid ${t.border}`,
            color: t.subtext
          }}>
            v{version}
          </span>

          <button
            onClick={() => setDark(d => !d)}
            style={{ ...styles.iconBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          <div style={{ ...styles.avatar, background: t.avatarBg, color: t.avatarText }}>
            {initials}
          </div>

          <span style={{ ...styles.userName, color: t.text }}>{userName}</span>

          {/* ✅ DONE BUTTON */}
          <button
            onClick={handleDone}
            disabled={saving}
            style={{
              ...styles.doneBtn,
              background: dark ? '#e8e8e4' : '#37352f',
              color: dark ? '#191919' : '#ffffff',
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : '✓ Done'}
          </button>

          <button
            onClick={logout}
            style={{ ...styles.logoutBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.subtext }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* EDITOR */}
      <div style={styles.editorWrap}>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Start writing..."
          style={{ ...styles.editor, color: t.text, caretColor: t.text }}
        />
      </div>

    </div>
  );
}

// ─── Themes ───────────────────────────────────────────────────────────────────
const lightTheme = {
  pageBg: '#ffffff', navBg: '#ffffff', border: '#e8e8e4',
  text: '#37352f', subtext: '#787774', badgeBg: '#f7f7f5',
  btnBg: '#ffffff', avatarBg: '#37352f', avatarText: '#ffffff'
};

const darkTheme = {
  pageBg: '#191919', navBg: '#1f1f1f', border: '#2f2f2f',
  text: '#e8e8e4', subtext: '#9b9b9b', badgeBg: '#2f2f2f',
  btnBg: '#2f2f2f', avatarBg: '#e8e8e4', avatarText: '#191919'
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 0.2s'
  },
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.5rem', height: '52px', position: 'sticky', top: 0, zIndex: 10
  },
  navLeft: {
    display: 'flex', alignItems: 'center', gap: '0.5rem'
  },
  backBtn: {
    fontSize: '0.85rem', cursor: 'pointer',
    padding: '4px 6px', background: 'none', border: 'none'
  },
  navLogo: { fontSize: '1.2rem' },
  titleInput: {
    fontSize: '0.95rem', fontWeight: '500',
    outline: 'none', padding: '2px 6px',
    minWidth: '160px', maxWidth: '320px',
    background: 'transparent', border: 'none',
    fontFamily: 'inherit',
  },
  navRight: {
    display: 'flex', alignItems: 'center', gap: '0.75rem'
  },
  status: { fontSize: '0.8rem' },
  versionBadge: {
    fontSize: '0.75rem', borderRadius: '4px', padding: '2px 6px'
  },
  iconBtn: {
    fontSize: '1rem', padding: '4px 8px',
    borderRadius: '6px', cursor: 'pointer', lineHeight: 1
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: '600'
  },
  userName: { fontSize: '0.875rem' },
  doneBtn: {
    fontSize: '0.85rem', fontWeight: '600',
    padding: '6px 16px', borderRadius: '6px',
    border: 'none', transition: 'opacity 0.15s'
  },
  logoutBtn: {
    fontSize: '0.8rem', padding: '4px 10px',
    borderRadius: '6px', cursor: 'pointer'
  },
  editorWrap: {
    flex: 1, maxWidth: '740px', width: '100%',
    margin: '0 auto', padding: '3rem 1rem'
  },
  editor: {
    width: '100%', minHeight: 'calc(100vh - 120px)',
    border: 'none', outline: 'none', resize: 'none',
    fontSize: '1rem', lineHeight: '1.8', background: 'transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    transition: 'color 0.2s'
  }
};