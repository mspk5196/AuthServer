import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { authService } from './services/authService';
import DashboardLayout from './components/Layout/DashboardLayout';
import Home from './pages/Home/Home';
import Apps from './pages/Apps/AppHome/Apps';
import AppDetails from './pages/Apps/AppDetails/AppDetails';
import AppSettings from './pages/Apps/AppSettings/AppSettings';
import Settings from './pages/Settings/Settings';
import Documentation from './pages/Documentation/Documentation';
import Groups from './pages/Groups/Groups';
import GroupSettings from './pages/Groups/GroupSettings/GroupSettings';
import VerifyAppEmail from './pages/Apps/VerifyAppEmail/VerifyAppEmail';
import { Loader2, ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';
import './App.css';

function App() {
  const { developer, setDeveloper, loading, setLoading } = useAuth();
  const consumedOnceRef = useRef(false);
  const [ssoDebug, setSsoDebug] = useState(null);
  const mainPortalUrl = import.meta.env.VITE_MAIN_PORTAL_URL || 'https://authservices.mspk.in';

  const ticket = useMemo(() => {
    const qsTicket = new URLSearchParams(window.location.search).get('ticket');
    if (qsTicket) return qsTicket;
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
          if (consumedOnceRef.current) return;
          consumedOnceRef.current = true;
          
          const resp = await api.post('/sso/consume', { ticket });
          const dev = resp?.data?.developer || resp?.developer;
          if (dev) setDeveloper(dev);

          setSsoDebug(resp);
          
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
          try {
            const dev = await authService.getCurrentDeveloper();
            if (dev) setDeveloper(dev);
          } catch (e) {
            console.error('Auth check failed:', e);
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
      const base = mainPortalUrl || 'https://authservices.mspk.in';
      const delay = ticket ? 10000 : 3000;
      const timer = setTimeout(() => {
        window.location.href = base;
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [loading, developer, mainPortalUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-sm w-full text-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Authenticating cPanel Session…</h2>
          <p className="text-xs text-slate-500 font-medium">Validating credentials and permissions</p>
        </div>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs max-w-md w-full space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Session Expired or Required</h2>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Your cPanel ticket has expired or you are not signed in. You will be redirected to the main developer portal momentarily.
          </p>
          <div className="pt-2">
            <a
              href={mainPortalUrl}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Go to Developer Portal Now
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          {ssoDebug && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs">
              <span className="font-bold text-slate-700 block mb-1">SSO Diagnostics:</span>
              <pre className="max-h-36 overflow-auto text-[11px] text-slate-600 font-mono">{JSON.stringify(ssoDebug, null, 2)}</pre>
            </div>
          )}
        </div>
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
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:groupId/settings" element={<GroupSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="documentation" element={<Documentation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/verify-app-email/:token" element={<VerifyAppEmail />} />
    </Routes>
  );
}

export default App;
