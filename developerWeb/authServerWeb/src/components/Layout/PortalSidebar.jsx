import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Activity,
  CreditCard,
  Receipt,
  Settings,
  MessageSquare,
  ShieldCheck,
  BookOpen,
  LogOut,
  X,
  ExternalLink
} from 'lucide-react';

export default function PortalSidebar({ isOpen, onClose }) {
  const { developer, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Usage & Stats', path: '/usage', icon: Activity },
    { label: 'Plans & Billing', path: '/plans', icon: CreditCard },
    { label: 'Transactions', path: '/transactions', icon: Receipt },
    { label: 'Account Settings', path: '/settings', icon: Settings },
    { label: 'Send Feedback', path: '/feedback', icon: MessageSquare },
  ];

  const secondaryNav = [
    { label: 'API Documentation', path: '/docs', icon: BookOpen },
    { label: 'Platform Policies', path: '/policies', icon: ShieldCheck },
  ];

  const isActive = (path) => location.pathname === path;

  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 shadow-xs">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="MSPK"
              className="h-9 w-9 rounded-full object-contain shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                Developer Portal
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">MSPK™ Apps</span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="px-3 py-4">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Main Menu</p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <p className="mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Resources</p>
          <nav className="mt-2 space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
            <a
              href="https://github.com/MSPK-APPS/auth-client-demo.git"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                Demo Client Repo
              </span>
              <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium">GitHub</span>
            </a>
          </nav>
        </div>
      </div>

      {/* Developer Profile Card */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-xs font-black text-white shadow-xs">
              {(developer?.name || developer?.username || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">
                {developer?.name || developer?.username}
              </p>
              <p className="truncate text-[11px] text-slate-500 font-medium">
                {developer?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
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
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-30">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
