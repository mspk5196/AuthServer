import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FolderGit2,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  Clock,
  Calendar,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const DashboardLayout = () => {
  const { developer, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainPortalUrl = import.meta.env.VITE_MAIN_PORTAL_URL || 'https://authservices.mspkapps.in';

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email ? email[0].toUpperCase() : 'D';
  };

  // Initialize session expiry time (15 minutes from now)
  useEffect(() => {
    const storedExpiry = localStorage.getItem('cpanel_session_expiry');
    if (!storedExpiry) {
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
      localStorage.setItem('cpanel_session_expiry', expiryTime.toISOString());
      setSessionExpiry(expiryTime);
    } else {
      setSessionExpiry(new Date(storedExpiry));
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if session expired
  useEffect(() => {
    if (sessionExpiry && currentTime >= sessionExpiry) {
      logout();
    }
  }, [currentTime, sessionExpiry, logout]);

  // Format time remaining
  const getTimeRemaining = () => {
    if (!sessionExpiry) return '15:00';
    const diff = sessionExpiry - currentTime;
    if (diff <= 0) return '00:00';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format current time in IST
  const getISTTime = () => {
    return currentTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  };

  // Get warning styles based on time remaining
  const getTimerPillClass = () => {
    if (!sessionExpiry) return 'bg-slate-100 text-slate-700 border-slate-200';
    const diff = sessionExpiry - currentTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-black';
    if (minutes < 5) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/apps', label: 'Applications', icon: Layers },
    { to: '/groups', label: 'App Groups', icon: FolderGit2 },
    { to: '/documentation', label: 'API Reference', icon: BookOpen },
    { to: '/settings', label: 'Plan & Quotas', icon: SettingsIcon },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 shadow-xs">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="MSPK"
              className="h-9 w-9 rounded-full object-contain shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                Control Panel
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">MSPK™ Apps</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="px-3 py-4">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Manage</p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <p className="mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">External</p>
          <div className="mt-2 space-y-1">
            <a
              href={mainPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                Main Developer Portal
              </span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">Portal</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer Area: Timers & Profile */}
      <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/50">
        {/* Session Expiry & IST Clock */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Session
            </span>
            <span className={`px-2 py-0.5 rounded-full border text-[11px] ${getTimerPillClass()}`}>
              {getTimeRemaining()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              IST Clock
            </span>
            <span className="font-semibold text-slate-700">{getISTTime()}</span>
          </div>
        </div>

        {/* Developer Profile Card */}
        <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-700 shadow-xs">
              {getInitials(developer?.name, developer?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">
                {developer?.name || developer?.username || 'Developer'}
              </p>
              <p className="truncate text-[10px] text-slate-500 font-medium">
                {developer?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col shrink-0 sticky top-0 h-screen z-30 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl bg-white">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">cPanel Administration</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                Live Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={mainPortalUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Main Portal</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
