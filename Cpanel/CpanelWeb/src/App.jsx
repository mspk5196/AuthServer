import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import DashboardLayout from './components/Layout/DashboardLayout';
import Home from './pages/Home/Home';
import Apps from './pages/Apps/AppHome/Apps';
import AppDetails from './pages/Apps/AppDetails/AppDetails';
import AppSettings from './pages/Apps/AppSettings/AppSettings';
import Settings from './pages/Settings/Settings';
import Documentation from './pages/Documentation/Documentation';
import './App.css';
import VerifyAppEmail from './pages/Apps/VerifyAppEmail/VerifyAppEmail';

// use shared api service imported above

function App() {
  const { developer, setDeveloper, loading, setLoading } = useAuth();
  const consumedOnceRef = useRef(false);
  const [ssoDebug, setSsoDebug] = useState(null);
  const mainPortalUrl = import.meta.env.VITE_MAIN_PORTAL_URL || 'https://authservices.mspkapps.in';

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
          
          const resp = await api.post('/sso/consume', { ticket });
          const dev = resp?.data?.developer || resp?.developer;
          if (dev) setDeveloper(dev);

          // expose response for debugging in the UI so user can inspect
          setSsoDebug(resp);
          
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
          // Check current session via backend (httpOnly cookies)
          try {
            const me = await api.get('/me');
            if (me && (me.developer || me.data?.developer)) {
              setDeveloper(me.developer || me.data.developer);
            }
          } catch (e) {
            // no session
          }
        }
      } catch (err) {
        console.error('SSO error:', err);
        setDeveloper(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [ticket, setDeveloper, setLoading]);

  // If not authenticated after initialization, redirect back to main developer portal
  useEffect(() => {
    if (!loading && !developer) {
      // If we arrived via SSO ticket, give a longer delay so the
      // on-screen debug panel can be read. Otherwise use a short delay.
      const base = mainPortalUrl || 'https://authservices.mspkapps.in';
      const delay = ticket ? 10000 : 3000;
      const timer = setTimeout(() => {
        window.location.href = base;
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [loading, developer, mainPortalUrl]);

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
          <h2>Redirecting...</h2>
          <p style={{ color: 'var(--danger-color, crimson)' }}>
            Your session has expired or you are not authenticated. You will be redirected to the main portal shortly.
          </p>
          <p style={{ marginTop: '1rem' }}>
            If you want to stay and inspect the SSO response, the redirect will occur shortly. You can also <a href={mainPortalUrl}>click here</a> to go now.
          </p>
          {ssoDebug && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <h4>SSO Debug Response</h4>
              <pre style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(ssoDebug, null, 2)}</pre>
            </div>
          )}
        </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Home />} />
        <Route path="apps" element={<Apps />} />
        <Route path="apps/:appId" element={<AppDetails />} />
        <Route path="apps/:appId/settings" element={<AppSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="documentation" element={<Documentation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/verify-app-email/:token" element={<VerifyAppEmail />} />
    </Routes>
  );
}

export default App;
