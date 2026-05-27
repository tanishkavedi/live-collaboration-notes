import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { authFetch, clearSession } from './utils/auth.js';

const API = import.meta.env.VITE_API_URL || '';

export default function App() {
  const { docId } = useParams();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('connecting...');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const typingTimer = useRef(null);
  const versionRef = useRef(0);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('name') || 'anonymous';
  const initials = userName.slice(0, 2).toUpperCase();
  const t = dark ? darkTheme : lightTheme;

  useEffect(() => {
    if (!docId) { navigate('/'); return; }

    socketRef.current = io(API, { auth: { token } });

    socketRef.current.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        clearSession();
        navigate('/login');
      }
    });

    socketRef.current.on('load-doc', ({ content, version }) => {
      setContent(content); setVersion(version); versionRef.current = version; setStatus('saved');
    });
    socketRef.current.on('receive-changes', ({ delta, version }) => {
      setContent(delta); setVersion(version); versionRef.current = version; setStatus('saved');
    });
    socketRef.current.on('save-confirmed', ({ version }) => {
      setVersion(version); versionRef.current = version; setStatus('saved');
    });
    socketRef.current.on('conflict', ({ serverContent }) => {
      const keep = confirm('Someone else edited this document.\n\nOK = use their version. Cancel = keep yours.');
      if (keep) setContent(serverContent);
    });
    socketRef.current.on('error', ({ message }) => { alert(message); navigate('/'); });

    socketRef.current.on('user-joined', ({ userId }) => {
      setActiveUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
    });
    socketRef.current.on('user-left', ({ userId }) => {
      setActiveUsers(prev => prev.filter(u => u !== userId));
      setTypingUsers(prev => prev.filter(u => u !== userId));
    });
    socketRef.current.on('user-typing', ({ userId }) => {
      setTypingUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== userId)), 2000);
    });

    socketRef.current.emit('join-doc', { docId });

    authFetch(`${API}/docs/${docId}`, {}, navigate)
      .then(r => r.json())
      .then(doc => setTitle(doc?.title === 'Untitled' ? '' : (doc?.title || '')))
      .catch(() => {});

    return () => {
      socketRef.current?.disconnect();
      clearTimeout(titleTimer.current);
      clearTimeout(typingTimer.current);
    };
  }, [docId]);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!showHistory) { setVersions([]); setPreviewContent(null); return; }
    setLoadingVersions(true);
    authFetch(`${API}/docs/${docId}/versions`, {}, navigate)
      .then(r => r.json())
      .then(data => { setVersions(data); setLoadingVersions(false); })
      .catch(() => setLoadingVersions(false));
  }, [showHistory]);

  async function saveTitleToServer(newTitle) {
    try {
      await authFetch(`${API}/docs/${docId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle || 'Untitled' })
      }, navigate);
    } catch {}
  }

  function handleTitleChange(e) {
    const val = e.target.value;
    setTitle(val);
    setStatus('saving...');
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => { saveTitleToServer(val.trim()); setStatus('saved'); }, 800);
  }

  function handleChange(e) {
    const val = e.target.value;
    setContent(val);
    setStatus('saving...');
    clearTimeout(typingTimer.current);
    socketRef.current.emit('typing', { docId });
    typingTimer.current = setTimeout(() => {}, 1500);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socketRef.current.emit('send-changes', { docId, delta: val, version: versionRef.current });
    }, 500);
  }

  async function handleDone() {
    if (saving) return;
    setSaving(true);
    setStatus('saving...');
    clearTimeout(saveTimer.current);
    clearTimeout(titleTimer.current);
    try {
      await Promise.all([
        saveTitleToServer(title.trim()),
        authFetch(`${API}/docs/${docId}/content`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }, navigate)
      ]);
    } catch {}
    setSaving(false);
    navigate('/');
  }

  function restoreVersion(v) {
    if (!confirm(`Restore to version ${v.version} by ${v.editedBy}?\n\nThis will overwrite current content.`)) return;
    setContent(v.content);
    setPreviewContent(null);
    setShowHistory(false);
    setStatus('saving...');
    socketRef.current.emit('send-changes', { docId, delta: v.content, version: versionRef.current });
  }

  function logout() { clearSession(); navigate('/login'); }

  const othersTyping = typingUsers.filter(u => u !== userName);
  const typingText = othersTyping.length === 1
    ? `${othersTyping[0]} is typing...`
    : othersTyping.length > 1
    ? `${othersTyping.slice(0, 2).join(', ')} are typing...`
    : '';

  const statusIcon = status === 'saved' ? '✓' : '○';

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ ...s.page, background: t.pageBg, color: t.text }}>
      <div style={{ ...s.topbar, background: t.navBg, borderBottom: `1px solid ${t.border}` }}>
        <div style={s.topLeft}>
          <div style={s.logoBox}><div style={{ width: '34px', height: '34 px', borderRadius: '6px', background: '#e8734a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  </div></div>
          <span style={{ fontSize: '1 rem', fontWeight: '600', color: t.text }}>CollabDocs</span>
        </div>
        <div style={s.topRight}>
          {activeUsers.length > 0 && (
            <div style={s.presenceRow}>
              {activeUsers.slice(0, 4).map(u => (
                <div key={u} title={u} style={{ ...s.presenceAvatar, background: stringToColor(u) }}>
                  {u.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {activeUsers.length > 4 && (
                <div style={{ ...s.presenceAvatar, background: '#666', fontSize: '0.65rem' }}>
                  +{activeUsers.length - 4}
                </div>
              )}
            </div>
          )}
          <button onClick={() => setDark(d => !d)}
            style={{ ...s.squareBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
            {dark ? '☀' : '☽'}
          </button>
          <div style={{ ...s.avatar, background: '#4a7fa5' }}>{initials}</div>
          <span style={{ fontSize: '0.9rem', color: t.text }}>{userName}</span>
          <button onClick={logout}
            style={{ ...s.signoutBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ ...s.toolbar, background: t.toolbarBg, borderBottom: `1px solid ${t.border}` }}>
        <div style={s.toolLeft}>
          <button onClick={() => navigate('/')}
            style={{ ...s.toolBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
            ◻ Documents
          </button>
          <div style={s.toolDivider} />
          <span style={{ fontSize: '0.82rem', color: t.subtext }}>{statusIcon} {status}</span>
          {typingText && (
            <>
              <div style={s.toolDivider} />
              <span style={{ fontSize: '0.78rem', color: t.subtext, fontStyle: 'italic' }}>{typingText}</span>
            </>
          )}
        </div>
        <div style={s.toolRight}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{
              ...s.toolBtn,
              background: showHistory ? t.text : t.btnBg,
              border: `1px solid ${t.border}`,
              color: showHistory ? t.pageBg : t.text
            }}>
            ◻ History
          </button>
          <button onClick={handleDone} disabled={saving}
            style={{
              ...s.doneBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text,
              opacity: saving ? 0.55 : 1, cursor: saving ? 'not-allowed' : 'pointer'
            }}>
            ◻ {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>

      <div style={s.mainArea}>
        <div style={{ ...s.editorBody, maxWidth: showHistory ? '100%' : '860px' }}>
          <input
            value={title}
            onChange={handleTitleChange}
            onKeyDown={e => e.key === 'Enter' && handleDone()}
            placeholder="Untitled"
            style={{ ...s.titleBox, background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text }}
          />
          <textarea
            value={previewContent !== null ? previewContent : content}
            onChange={previewContent !== null ? undefined : handleChange}
            readOnly={previewContent !== null}
            placeholder="Start writing…"
            style={{
              ...s.contentBox,
              background: previewContent !== null ? t.toolbarBg : t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              color: previewContent !== null ? t.subtext : t.text,
              caretColor: t.text,
              cursor: previewContent !== null ? 'default' : 'text'
            }}
          />
          {previewContent !== null && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPreviewContent(null)}
                style={{ ...s.toolBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
                ← Back to editing
              </button>
            </div>
          )}
        </div>

        {showHistory && (
          <div style={{ ...s.historySidebar, background: t.navBg, borderLeft: `1px solid ${t.border}` }}>
            <div style={s.historyHeader}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: t.text }}>Version history</span>
              <button onClick={() => { setShowHistory(false); setPreviewContent(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.subtext, fontSize: '1rem' }}>
                ✕
              </button>
            </div>
            {loadingVersions ? (
              <p style={{ color: t.subtext, fontSize: '0.85rem', padding: '1rem' }}>Loading...</p>
            ) : versions.length === 0 ? (
              <p style={{ color: t.subtext, fontSize: '0.85rem', padding: '1rem' }}>No versions yet.</p>
            ) : (
              <div style={s.versionList}>
                {versions.map(v => (
                  <div key={v.id} style={{ ...s.versionItem, background: t.toolbarBg, border: `1px solid ${t.border}` }}>
                    <div style={s.versionMeta}>
                      <span style={{ fontWeight: '600', fontSize: '0.82rem', color: t.text }}>v{v.version}</span>
                      <span style={{ fontSize: '0.75rem', color: t.subtext }}>{formatDate(v.createdAt)}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: t.subtext, marginBottom: '8px' }}>by {v.editedBy}</span>
                    <div style={s.versionActions}>
                      <button
                        onClick={() => setPreviewContent(previewContent === v.content ? null : v.content)}
                        style={{ ...s.versionBtn, background: t.btnBg, border: `1px solid ${t.border}`, color: t.text }}>
                        {previewContent === v.content ? 'Close' : 'Preview'}
                      </button>
                      <button onClick={() => restoreVersion(v)}
                        style={{ ...s.versionBtn, background: t.text, border: 'none', color: t.pageBg }}>
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#4a7fa5', '#6a9e6a', '#a56a4a', '#7a4aa5', '#a54a7a', '#4aa5a0'];
  return colors[Math.abs(hash) % colors.length];
}

const lightTheme = {
  pageBg: '#f0f0f0', navBg: '#ffffff', toolbarBg: '#f7f7f7',
  border: '#ddd', text: '#1a1a1a', subtext: '#888',
  btnBg: '#ffffff', inputBg: '#ffffff', inputBorder: '#ccc',
};
const darkTheme = {
  pageBg: '#111111', navBg: '#1e1e1e', toolbarBg: '#1a1a1a',
  border: '#333', text: '#e8e8e8', subtext: '#888',
  btnBg: '#2a2a2a', inputBg: '#2a2a2a', inputBorder: '#3a3a3a',
};

const s = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', transition: 'background 0.2s'
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: '56px', position: 'sticky', top: 0, zIndex: 20
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: {
    width: '38px', height: '38px', borderRadius: '8px', background: '#e8734a',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  avatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.78rem', fontWeight: '600', color: '#fff'
  },
  presenceRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  presenceAvatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.68rem', fontWeight: '600', color: '#fff', cursor: 'default'
  },
  squareBtn: {
    width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  signoutBtn: { padding: '6px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: '52px', position: 'sticky', top: '56px', zIndex: 19
  },
  toolLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  toolRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  toolBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer'
  },
  toolDivider: { width: '1px', height: '20px', background: '#444', opacity: 0.4 },
  doneBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 20px',
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', transition: 'opacity 0.15s'
  },
  mainArea: { display: 'flex', flex: 1, overflow: 'hidden' },
  editorBody: {
    display: 'flex', flexDirection: 'column', gap: '16px',
    width: '100%', margin: '32px auto', padding: '0 20px',
    maxWidth: '860px', transition: 'max-width 0.2s'
  },
  titleBox: {
    width: '100%', padding: '14px 18px', borderRadius: '10px', outline: 'none',
    fontSize: '1rem', fontWeight: '400', transition: 'border-color 0.15s', boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  contentBox: {
    width: '100%', minHeight: '500px', padding: '14px 18px', borderRadius: '10px',
    outline: 'none', resize: 'none', fontSize: '1rem', lineHeight: '1.75',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  historySidebar: {
    width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column',
    height: 'calc(100vh - 108px)', position: 'sticky', top: '108px', overflowY: 'auto'
  },
  historyHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px', borderBottom: '1px solid #333', position: 'sticky', top: 0
  },
  versionList: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' },
  versionItem: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '8px' },
  versionMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  versionActions: { display: 'flex', gap: '6px', marginTop: '4px' },
  versionBtn: {
    flex: 1, padding: '5px 8px', borderRadius: '6px',
    fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', textAlign: 'center'
  }
};