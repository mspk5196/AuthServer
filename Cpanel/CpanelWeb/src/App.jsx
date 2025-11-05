import { useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { tokenService } from './services/tokenService';
import DashboardLayout from './components/Layout/DashboardLayout';
import Home from './pages/Home/Home';
import Apps from './pages/Apps/Apps';
import Settings from './pages/Settings/Settings';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_CPANEL_API_BASE_URL || 'http://localhost:5001/api/developer';

async function apiGet(path) {
  const token = tokenService.get();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { data });
  return data;
}

async function apiPost(path, body) {
  const token = tokenService.get();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { data });
  return data;
}

function App() {
  const { developer, setDeveloper, loading, setLoading } = useAuth();
  const consumedOnceRef = useRef(false);

  const ticket = useMemo(() => {
    const qsTicket = new URLSearchParams(window.location.search).get('ticket');
    if (qsTicket) return qsTicket;
    // Support /sso/:ticket anywhere in the path
    const path = window.location.pathname || '';
    const marker = '/sso/';
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      const after = path.substring(idx + marker.length);
      const nextSlash = after.indexOf('/');
      return nextSlash === -1 ? after : after.substring(0, nextSlash);
    }
    return null;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (ticket) {
          // Guard against React StrictMode double-invocation
          if (consumedOnceRef.current) return;
          consumedOnceRef.current = true;
          
          const resp = await apiPost('/sso/consume', { ticket });
          const token = resp?.data?.token || resp?.token;
          const dev = resp?.data?.developer || resp?.developer;
          
          if (token) tokenService.set(token);
          if (dev) setDeveloper(dev);
          
          // Clean up URL
          const url = new URL(window.location.href);
          const hadQueryTicket = url.searchParams.has('ticket');
          url.searchParams.delete('ticket');
          let newUrl = url.toString();
          
          const path = url.pathname || '';
          const marker = '/sso/';
          const idx = path.indexOf(marker);
          if (idx !== -1) {
            newUrl = `${url.origin}/`;
          } else if (hadQueryTicket) {
            newUrl = url.toString();
          }
          
          window.history.replaceState({}, '', newUrl);
        } else {
          // Check for existing token
          const existing = tokenService.get();
          if (existing) {
            const me = await apiGet('/me');
            setDeveloper(me.developer);
          }
        }
      } catch (err) {
        console.error('SSO error:', err);
        tokenService.clear();
        setDeveloper(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [ticket, setDeveloper, setLoading]);

  if (loading) {
    return (
      <div className="container">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="container">
        <h2>Not authenticated</h2>
        <p style={{ color: 'var(--danger-color, crimson)' }}>
          Please return to the main portal and click "Open cPanel" to authenticate.
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Home />} />
        <Route path="apps" element={<Apps />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
