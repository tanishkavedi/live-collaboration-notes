import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(docId, userId, onRemoteChange, onConflict) {
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    socketRef.current.emit('join-doc', { docId, userId });

    socketRef.current.on('receive-changes', ({ delta }) => onRemoteChange(delta));
    socketRef.current.on('conflict', onConflict);

    return () => socketRef.current.disconnect();
  }, [docId]);

  const sendChange = (delta, version) => {
    socketRef.current.emit('send-changes', { docId, delta, version, userId });
  };

  const sendTyping = () => socketRef.current.emit('typing', { docId, userId });

  return { sendChange, sendTyping };
}