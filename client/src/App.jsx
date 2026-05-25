import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const DOC_ID = 'doc-001';

export default function App() {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('connecting...');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('name') || 'anonymous';
  const initials = userName.slice(0, 2).toUpperCase();

  const t = dark ? darkTheme : lightTheme;

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    socketRef.current = io('http://localhost:3001', { auth: { token } });
    socketRef.current.emit('join-doc', { docId: DOC_ID, userId: userName });
    socketRef.current.on('load-doc', ({ content, version }) => {
      setContent(content); setVersion(version); setStatus('synced');
    });
    socketRef.current.on('receive-changes', ({ delta, version }) => {
      setContent(delta); setVersion(version); setStatus('synced');
    });
    socketRef.current.on('save-confirmed', ({ version }) => {
      setVersion(version); setStatus('saved');
    });
    return () => socketRef.current.disconnect();
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function handleChange(e) {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('saving...');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socketRef.current.emit('send-changes', {
        docId: DOC_ID, delta: newContent, version, userId: userName
      });
    }, 500);
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  const statusColor = status === 'synced' || status === 'saved' ? '#0f7b6c' : '#787774';

  return (
    <div style={{ ...styles.page, background: t.pageBg }}>
      <div style={{ ...styles.navbar, background: t.navBg, borderBottom: `1px solid ${t.border}` }}>
        <div style={styles.navLeft}>
          <span style={styles.navLogo}>📝</span>
          <span style={{ ...styles.navTitle, color: t.text }}>Project Notes</span>
        </div>
        <div style={styles.navRight}>
          <span style={{ ...styles.status, color: statusColor }}>
            {status === 'saved' || status === 'synced' ? '✓' : '○'} {status}
          </span>
          <span style={{ ...styles.versionBadge, background: t.badgeBg, border: `1px solid ${t.border}`, color: t.subtext }}>
            v{version}
          </span>
          <button onClick={toggleDark} style={{ ...styles.iconBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <div style={{ ...styles.avatar, background: t.avatarBg, color: t.avatarText }}>
            {initials}
          </div>
          <span style={{ ...styles.userName, color: t.text }}>{userName}</span>
          <button onClick={logout} style={{ ...styles.logoutBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.subtext }}>
            Sign out
          </button>
        </div>
      </div>

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

const lightTheme = {
  pageBg: '#ffffff',
  navBg: '#ffffff',
  border: '#e8e8e4',
  text: '#37352f',
  subtext: '#787774',
  badgeBg: '#f7f7f5',
  btnBg: '#ffffff',
  avatarBg: '#37352f',
  avatarText: '#ffffff'
};

const darkTheme = {
  pageBg: '#191919',
  navBg: '#1f1f1f',
  border: '#2f2f2f',
  text: '#e8e8e4',
  subtext: '#9b9b9b',
  badgeBg: '#2f2f2f',
  btnBg: '#2f2f2f',
  avatarBg: '#e8e8e4',
  avatarText: '#191919'
};

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'background 0.2s' },
  navbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.5rem', height: '52px', position: 'sticky', top: 0, zIndex: 10, transition: 'background 0.2s'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  navLogo: { fontSize: '1.2rem' },
  navTitle: { fontSize: '0.95rem', fontWeight: '500' },
  navRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  status: { fontSize: '0.8rem' },
  versionBadge: { fontSize: '0.75rem', borderRadius: '4px', padding: '2px 6px' },
  iconBtn: {
    fontSize: '1rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', lineHeight: 1
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: '600'
  },
  userName: { fontSize: '0.875rem' },
  logoutBtn: { fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  editorWrap: { flex: 1, maxWidth: '740px', width: '100%', margin: '0 auto', padding: '3rem 1rem' },
  editor: {
    width: '100%', minHeight: 'calc(100vh - 120px)', border: 'none', outline: 'none',
    resize: 'none', fontSize: '1rem', lineHeight: '1.8', background: 'transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', transition: 'color 0.2s'
  }
};