import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Code2,
  Terminal,
  Globe2,
  Users,
  Copy,
  Check
} from 'lucide-react';

const Home = () => {
  const { developer, loading } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && developer) {
      navigate('/dashboard', { replace: true });
    }
  }, [developer, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (developer) return null;

  const sampleCode = `// 1. Verify access token in your backend API
const response = await fetch('http://localhost:5000/api/v1/auth/verify-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + userAccessToken,
    'x-api-key': YOUR_APP_API_KEY
  }
});
const { valid, user } = await response.json();
console.log('Authenticated User:', user.email);`;

  const copySnippet = () => {
    navigator.clipboard.writeText(sampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      {/* Region Notification Ribbon */}
      <div className="border-b border-indigo-100 bg-indigo-50/80 px-4 py-2 text-center text-xs font-semibold text-indigo-800">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Developer platform is currently active and optimized for India region (IN-BLR) 🇮🇳
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-32">
        {/* Subtle ambient gradients */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/4 -z-10 h-[300px] w-[500px] rounded-full bg-purple-100/40 blur-[80px]" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Next-Gen Auth Infrastructure for Modern Developers
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Authentication for your apps,{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              without the headache.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Complete developer-first authentication solution. Manage users, issue high-security JWTs, enable Google Sign-In, and manage application controls from one unified dashboard.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            >
              View Pricing &amp; Quotas
            </Link>
            <Link
              to="/docs"
              className="rounded-xl px-5 py-3.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Read Docs →
            </Link>
          </div>

          {/* Value Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Bcrypt &amp; JWT Security
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Google OAuth Built-in
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Sub-millisecond Token Verification
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Dedicated cPanel Manager
            </span>
          </div>
        </div>

        {/* Code Snippet Terminal Preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="ml-2 font-mono text-xs text-slate-400">verify-token.js</span>
              </div>
              <button
                onClick={copySnippet}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <div className="p-5 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed">
              <pre><code>{sampleCode}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-slate-200/80 bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Core Capabilities</h2>
            <p className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Everything required to secure your user accounts
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Military-Grade Security</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Bcrypt password hashing, AES token encryption, httpOnly cookies, and strict CORS handling protect user credentials against threats.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <Globe2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Google OAuth Integration</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Configure your own Google Client ID and Secret in cPanel to allow seamless Google Sign-In with automated token exchange.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Dedicated cPanel</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                A dedicated control panel gives you complete visibility into app secrets, active sessions, user verification, and token lifetime configs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Flexible User Models</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Define custom extra fields (JSON/text), group user logins, and enforce account verification workflows with automated email triggers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Open Source Client</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Clone our pre-built React/Node.js client starter repository to get end-to-end authentication working in under five minutes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Strict Compliance</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Explicit developer policy acceptance, audit logs, login history tracking, and GDPR-friendly account deletion endpoints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to start CTA banner */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-8 sm:p-12 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-4xl">Ready to secure your application?</h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-xl mx-auto font-medium">
            Create your free developer account today and get full API credentials immediately.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95"
            >
              Sign Up for Free
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
