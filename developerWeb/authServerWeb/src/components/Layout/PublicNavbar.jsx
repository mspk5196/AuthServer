import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ArrowRight, ShieldCheck, BookOpen, CreditCard, LayoutDashboard, LogOut } from 'lucide-react';

const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Pricing', path: '/pricing', icon: CreditCard },
  { name: 'Documentation', path: '/docs', icon: BookOpen },
  { name: 'Policies', path: '/policies', icon: ShieldCheck },
];

export default function PublicNavbar() {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-lg shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="MSPK"
              className="h-9 w-9 rounded-full object-contain shrink-0 group-hover:scale-105 transition-transform"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Auth Platform
              </span>
              <span className="text-[10px] font-semibold text-slate-500">by MSPK™ Apps</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.path);
              const linkClass = active
                ? 'text-indigo-600 bg-indigo-50/80 font-bold rounded-lg px-3 py-2 text-sm transition-colors'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
              return (
                <Link key={link.path} to={link.path} className={linkClass}>
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-xs"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-105 active:scale-95"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pt-2 pb-6 md:hidden shadow-lg">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.path);
              const mLinkClass = active
                ? 'block rounded-lg px-3 py-2 text-base font-bold text-indigo-600 bg-indigo-50'
                : 'block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50';
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mLinkClass}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
