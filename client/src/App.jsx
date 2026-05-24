import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const DOC_ID = 'doc-001';

export default function App() {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('connecting...');
  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('name') || 'anonymous';

  useEffect(() => {
    if (!token) { navigate('/login'); return; }

    socketRef.current = io('http://localhost:3001', {
      auth: { token }
    });

    socketRef.current.emit('join-doc', { docId: DOC_ID, userId: userName });

    socketRef.current.on('load-doc', ({ content, version }) => {
      setContent(content);
      setVersion(version);
      setStatus('synced');
    });

    socketRef.current.on('receive-changes', ({ delta, version }) => {
      setContent(delta);
      setVersion(version);
    });

    socketRef.current.on('save-confirmed', ({ version }) => {
      setVersion(version);
      setStatus('saved');
    });

    return () => socketRef.current.disconnect();
  }, []);

  function handleChange(e) {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('typing...');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socketRef.current.emit('send-changes', {
        docId: DOC_ID,
        delta: newContent,
        version,
        userId: userName
      });
      setStatus('saving...');
    }, 500);
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: 13 }}>
          Status: <b>{status}</b> | Version: <b>{version}</b> | Logged in as: <b>{userName}</b>
        </span>
        <button onClick={logout} style={{ fontSize: 12, cursor: 'pointer' }}>Logout</button>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        style={{ width: '100%', height: '400px', fontSize: 14, padding: '1rem' }}
        placeholder="Start typing..."
      />
    </div>
  );
}