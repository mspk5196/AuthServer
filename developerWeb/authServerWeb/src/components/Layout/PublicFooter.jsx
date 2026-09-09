import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="MSPK"
                className="h-8 w-8 rounded-full object-contain shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-lg font-bold tracking-tight text-slate-900">Auth Platform</span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-500 font-medium">
              High-performance, secure authentication infrastructure built specifically for developers.
              Manage users, Google OAuth, session cookies, and developer apps with zero setup friction.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 w-fit">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational in India region (IN-BLR)
            </div>
          </div>

          {/* Col 2: Resources */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Developers</h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium">
              <li>
                <Link to="/docs" className="hover:text-indigo-600 transition-colors">API Documentation</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-indigo-600 transition-colors">Pricing &amp; Plans</Link>
              </li>
              <li>
                <a
                  href="https://github.com/MSPK-APPS/auth-client-demo.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                >
                  GitHub Demo Client ↗
                </a>
              </li>
              <li>
                <Link to="/contact" className="hover:text-indigo-600 transition-colors">Developer Support</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Policies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Legal &amp; Trust</h3>
            <ul className="mt-4 space-y-2.5 text-sm font-medium">
              <li>
                <Link to="/policies" className="hover:text-indigo-600 transition-colors">Platform Policies</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-indigo-600 transition-colors">Refund Policy</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} MSPK™ Apps. All rights reserved.</p>
          <div className="flex items-center gap-1">
            Built for developers with precision and security
          </div>
        </div>
      </div>
    </footer>
  );
}
