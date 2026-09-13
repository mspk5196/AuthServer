import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import { 
  CreditCard, 
  BarChart3, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Key, 
  User, 
  Mail, 
  Info, 
  Check, 
  FolderKanban, 
  Smartphone, 
  Activity,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const Settings = () => {
  const { developer } = useAuth();
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedDevId, setCopiedDevId] = useState(false);

  useEffect(() => {
    fetchPlanInfo();
  }, []);

  const fetchPlanInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const token = tokenService.get();
      const response = await api.get('/settings/plan', token);
      setPlanInfo(response);
    } catch (err) {
      console.error('Error fetching plan info:', err);
      setError(err.message || 'Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-indigo-600';
  };

  const getBillingCycleLabel = () => {
    if (!planInfo) return 'N/A';
    if (planInfo.plan_type === 'free') return 'No Billing (Free plan)';
    const days = planInfo.duration_days;
    if (!days) return 'Lifetime (no recurring billing)';
    if (days === 30) return 'Every 30 days (monthly)';
    if (days === 365) return 'Every 365 days (yearly)';
    return `Every ${days} days`;
  };

  const handleUpgradePlanClick = () => {
    window.open('https://authservices.mspk.in/plans', '_blank', 'noopener');
  };

  const copyDevId = () => {
    if (developer?.dev_id) {
      navigator.clipboard.writeText(developer.dev_id);
      setCopiedDevId(true);
      setTimeout(() => setCopiedDevId(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Loading plan & account settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage subscription limits and developer credentials</p>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium flex-1">{error}</p>
        </div>

        <button
          onClick={fetchPlanInfo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const appsPercentage = planInfo && planInfo.max_apps
    ? Math.min((planInfo.apps_used / planInfo.max_apps) * 100, 100)
    : 0;
  const apiCallsPercentage = planInfo && planInfo.max_api_calls
    ? Math.min((planInfo.api_calls_used / planInfo.max_api_calls) * 100, 100)
    : 0;
  const groupsUsed = planInfo?.app_groups_used || 0;
  const groupsPercentage = planInfo?.max_app_groups
    ? Math.min((groupsUsed / planInfo.max_app_groups) * 100, 100)
    : 0;

  const featuresArray = planInfo?.features ? Object.values(planInfo.features) : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Subscription</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor your quota limits, subscription tier, and developer API credentials.
        </p>
      </div>

      <div className="info-banner">
        <svg className="info-banner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className="info-banner-content">
          <div className="info-banner-title">Account Management</div>
          <div className="info-banner-text">
            To edit your profile, enable two-factor authentication, or reset your password,
            please visit the <a href="https://authservices.mspk.in/" target="_blank" rel="noopener noreferrer">main developer portal</a>.
          </div>
        </div>
      </div>

      {/* Subscription Plan Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-300">Active Tier</span>
            <h2 className="text-2xl font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              {planInfo?.plan_name || 'Free'} Plan
            </h2>
          </div>

          <button
            onClick={handleUpgradePlanClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <CreditCard className="w-4 h-4 text-indigo-600" />
            {planInfo?.plan_type === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 bg-slate-50/50">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Status / Expiry</span>
            <p className="text-sm font-semibold text-slate-800">
              {planInfo?.expiry_date ? (
                new Date(planInfo.expiry_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              ) : (
                <span className="text-emerald-600 font-bold">Active (Lifetime)</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Billing Cycle</span>
            <p className="text-sm font-semibold text-slate-800">
              {getBillingCycleLabel()}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Duration</span>
            <p className="text-sm font-semibold text-slate-800">
              {planInfo?.duration_days
                ? `${planInfo.duration_days} Days`
                : planInfo?.plan_type === 'free'
                  ? 'No fixed duration'
                  : 'Lifetime'}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Usage Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Plan Usage & Limits
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Track your resource consumption against subscription limits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Apps Quota */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                Applications
              </span>
              <span className="text-xs font-bold text-slate-700">
                {Math.round(appsPercentage)}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{planInfo?.apps_used || 0}</span>
              <span className="text-xs text-slate-400 font-mono">
                / {planInfo?.max_apps ?? 'Unlimited'} apps
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor(appsPercentage)}`}
                style={{ width: `${appsPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* API Calls Quota */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                API Calls (Month)
              </span>
              <span className="text-xs font-bold text-slate-700">
                {Math.round(apiCallsPercentage)}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {(planInfo?.api_calls_used || 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {planInfo?.max_api_calls ? planInfo.max_api_calls.toLocaleString() : 'Unlimited'}
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor(apiCallsPercentage)}`}
                style={{ width: `${apiCallsPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Groups Quota */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4 text-indigo-600" />
                App Groups
              </span>
              <span className="text-xs font-bold text-slate-700">
                {Math.round(groupsPercentage)}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{groupsUsed}</span>
              <span className="text-xs text-slate-400 font-mono">
                / {planInfo?.max_app_groups ?? 'Unlimited'} groups
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressColor(groupsPercentage)}`}
                style={{ width: `${groupsPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Features Included */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Plan Features</h3>

        {featuresArray.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuresArray.map((feature, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5 text-xs text-slate-800 font-medium"
              >
                <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No specific features listed for this tier.</p>
        )}
      </div>

      {/* Developer API Credentials */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Developer Credentials
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Use your developer identifier to authenticate developer-level management APIs.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">Developer ID</span>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900">
                {developer?.dev_id || 'Loading...'}
              </code>
              <button
                onClick={copyDevId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                {copiedDevId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">API Documentation</div>
            <div className="settings-label-desc">Learn how to use your Developer ID</div>
          </div>
          <div className="settings-value">
            <a 
              href="https://docs.mspk.in/developer-api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              View Docs
            </a>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Account Profile Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-medium">Registered Email</span>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {developer?.email || '—'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-medium">Full Name</span>
            <p className="text-sm font-semibold text-slate-900">
              {developer?.name || developer?.username || '—'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-xs text-slate-400 font-medium">Account Verification</span>
            <div>
              {developer?.is_verified || developer?.email_verified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
