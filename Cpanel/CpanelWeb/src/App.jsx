import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_CPANEL_API_BASE_URL || 'http://localhost:5001/api/developer';

const tokenKey = 'cpanel_jwt';
const tokenService = {
  get: () => localStorage.getItem(tokenKey),
  set: (t) => (t ? localStorage.setItem(tokenKey, t) : localStorage.removeItem(tokenKey)),
  clear: () => localStorage.removeItem(tokenKey),
};

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
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const consumedOnceRef = useRef(false);

  const ticket = useMemo(() => {
    const qsTicket = new URLSearchParams(window.location.search).get('ticket');
    if (qsTicket) return qsTicket;
    // Support /sso/:ticket anywhere in the path (e.g., /sso/:ticket or /api/developer/sso/:ticket)
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
        // If a ticket is present, establish SSO
        if (ticket) {
          // Guard against React StrictMode double-invocation consuming the ticket twice
          if (consumedOnceRef.current) return;
          consumedOnceRef.current = true;
          const resp = await apiPost('/sso/consume', { ticket });
          const token = resp?.data?.token || resp?.token;
          const dev = resp?.data?.developer || resp?.developer;
          if (token) tokenService.set(token);
          if (dev) setDeveloper(dev);
          // Remove ticket from URL
          const url = new URL(window.location.href);
          const hadQueryTicket = url.searchParams.has('ticket');
          url.searchParams.delete('ticket');
          let newUrl = url.toString();
          // Also strip /sso/:ticket from any path (e.g., /sso/abc or /api/developer/sso/abc)
          const path = url.pathname || '';
          const marker = '/sso/';
          const idx = path.indexOf(marker);
          if (idx !== -1) {
            // Replace the entire path with root for simplicity after successful SSO
            newUrl = `${url.origin}/`;
          }
          // If only query had the ticket, reflect removal
          if (hadQueryTicket && idx === -1) {
            newUrl = url.toString();
          }
          window.history.replaceState({}, '', newUrl);
        } else {
          // No ticket: only call /me if we already have a cPanel token
          const existing = tokenService.get();
          if (existing) {
            const me = await apiGet('/me');
            setDeveloper(me.developer);
          } else {
            // Not authenticated; show message without triggering a 401 fetch
            setDeveloper(null);
            setMessage('Authentication required');
          }
        }
        setMessage('');
      } catch (err) {
        console.error('Init error:', err);
        tokenService.clear();
        setDeveloper(null);
        setMessage(err?.data?.message || 'Authentication required');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [ticket]);

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
        {message && <p style={{ color: 'crimson' }}>{message}</p>}
        <p>Return to main portal and click "Open cPanel" again.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>cPanel Dashboard</h1>
      <div className="card">
        <p><strong>Name:</strong> {developer.name || developer.username || developer.email}</p>
        <p><strong>Email:</strong> {developer.email}</p>
        <p><strong>Verified:</strong> {(developer.is_verified ?? developer.email_verified ?? true) ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

export default App;
