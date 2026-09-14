import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import PlanSelection from '../../components/PlanSelection';
import StatCard from '../../components/UI/StatCard';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import {
  Layers,
  Activity,
  CreditCard,
  ExternalLink,
  Loader2,
  Code2,
  Zap,
  ShieldCheck,
  ArrowUpRight,
  Terminal,
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const { developer, checkAuth } = useAuth();
  const [openingCpanel, setOpeningCpanel] = useState(false);
  const [cpanelError, setCpanelError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [stats, setStats] = useState({ totalApps: 0, monthApiCalls: 0 });

  useEffect(() => {
    checkDeveloperPlan();
  }, []);

  const checkDeveloperPlan = async () => {
    try {
      setLoadingPlan(true);
      const response = await api.get('/developer/my-plan');
      setHasPlan(response.data.hasPlan);
      setCurrentPlan(response.data.plan);

      if (response.data.hasPlan) {
        await fetchDashboardStats();
      }
    } catch (error) {
      console.error('Failed to check plan:', error);
      setHasPlan(false);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/developer/dashboard/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const handlePlanSelected = async () => {
    try {
      await checkAuth();
    } catch (e) {}
    await checkDeveloperPlan();
  };

  const handleOpenCpanel = async () => {
    setCpanelError('');
    setOpeningCpanel(true);
    try {
      const res = await api.post('/cpanel/cpanel-ticket', {});
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error('No cPanel URL returned');
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Open cPanel failed:', err);
      setCpanelError(err?.message || 'Failed to open cPanel. Please try again.');
    } finally {
      setOpeningCpanel(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading your developer portal…</p>
        </div>
      </div>
    );
  }

  // Show plan selection if no active plan
  if (!hasPlan) {
    return <PlanSelection onPlanSelected={handlePlanSelected} />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Welcome Back</span>
              <Badge variant="primary" size="sm">
                <Sparkles className="h-3 w-3" />
                {currentPlan?.plan_name || 'Active Plan'}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
              {developer?.name || developer?.username}!
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-xl font-medium">
              Manage your apps, view API analytics, and access the dedicated Control Panel.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenCpanel}
              disabled={openingCpanel}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {openingCpanel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting cPanel…
                </>
              ) : (
                <>
                  Open cPanel
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {cpanelError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {cpanelError}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Apps"
          value={stats.totalApps || 0}
          label="Registered Applications"
          icon={Layers}
          color="indigo"
        />
        <StatCard
          title="API Calls This Month"
          value={stats.monthApiCalls?.toLocaleString?.() || stats.monthApiCalls || 0}
          label="Processed requests"
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Current Plan"
          value={currentPlan?.plan_name || 'Standard'}
          label={currentPlan?.is_active ? 'Status: Active' : 'Status: Inactive'}
          icon={CreditCard}
          color="purple"
        />
        <StatCard
          title="Platform Status"
          value="Healthy"
          label="All services operational"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Main Content 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Control Panel & Quick Actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* CPanel Feature Highlight Card */}
          <Card className="relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Application Control Panel (cPanel)
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Configure OAuth client credentials, custom user attributes, CORS domains, and view live user registries.
                </p>
              </div>
              <button
                onClick={handleOpenCpanel}
                disabled={openingCpanel}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
              >
                Launch cPanel
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                <span className="font-bold text-slate-900">🔐 App Credentials</span>
                <p className="mt-1 text-slate-600">Manage API Keys and Client Secrets for each app.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                <span className="font-bold text-slate-900">👥 User Directory</span>
                <p className="mt-1 text-slate-600">Inspect registered users, email verifications, and logins.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                <span className="font-bold text-slate-900">⚙️ App Settings</span>
                <p className="mt-1 text-slate-600">Configure redirect URIs, policies, and token lifetimes.</p>
              </div>
            </div>
          </Card>

          {/* Demo Client Starter Card */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <Code2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Open Source Demo Client</h3>
                  <Badge variant="default" size="sm">Starter Kit</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Ready-to-use reference client integrated with this platform. Test registration, login, and Google Sign-In in minutes.
                </p>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5 border border-slate-800 text-xs font-mono text-slate-200">
                  <span className="truncate">git clone https://github.com/MSPK-APPS/auth-client-demo.git</span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <a
                    href="https://github.com/MSPK-APPS/auth-client-demo.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    View Repository on GitHub
                  </a>
                  <Link
                    to="/docs"
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Read API Integration Docs →
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Links & Plan Info */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Subscription &amp; Quota
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Plan Tier:</span>
                <span className="font-bold text-slate-900">{currentPlan?.plan_name || 'Free Tier'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Monthly Limit:</span>
                <span className="font-bold text-slate-900">
                  {currentPlan?.max_api_calls_per_month ? currentPlan.max_api_calls_per_month.toLocaleString() : 'Unlimited'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Apps Allowed:</span>
                <span className="font-bold text-slate-900">
                  {currentPlan?.max_apps ? currentPlan.max_apps : '5'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/plans"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Change or Upgrade Plan
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Developer Support &amp; Legal
            </h3>
            <div className="mt-3 space-y-2 text-sm font-medium">
              <Link to="/docs" className="flex items-center justify-between py-1.5 text-slate-700 hover:text-indigo-600 transition-colors">
                <span>API Documentation</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link to="/policies" className="flex items-center justify-between py-1.5 text-slate-700 hover:text-indigo-600 transition-colors">
                <span>Platform Policies</span>
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link to="/feedback" className="flex items-center justify-between py-1.5 text-slate-700 hover:text-indigo-600 transition-colors">
                <span>Submit Feedback</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
