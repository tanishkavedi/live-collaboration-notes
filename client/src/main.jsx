import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';
import { isTokenValid } from './utils/auth.js';

function Guard({ children }) {
  if (!isTokenValid()) {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    return <Navigate to="/login" replace />;
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Guard><Home /></Guard>} />
        <Route path="/doc/:docId" element={<Guard><App /></Guard>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);