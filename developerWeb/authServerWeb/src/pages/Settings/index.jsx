import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { authService } from '../../services/authService';
import paymentService from '../../services/paymentService';
import PlanSelection from '../../components/PlanSelection';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Modal from '../../components/Modal';
import {
  User,
  AtSign,
  Mail,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Receipt,
  Check,
  QrCode,
  Key,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';

const getPlanFeatureLines = (plan) => {
  if (!plan) return [];
  const desc = plan.features_desc;
  if (Array.isArray(desc) && desc.length) return desc;
  const f = plan.features;
  if (!f) return [];
  const unlimited = (v) => v === 0 || v === '0' || Number(v) === 0;
  const fmt = (v, singular, plural) =>
    unlimited(v) ? `Unlimited ${plural}` : `Up to ${v} ${Number(v) === 1 ? singular : plural}`;
  const lines = [];
  if (f.max_apps != null)           lines.push(fmt(f.max_apps, 'app', 'apps'));
  if (f.max_api_calls != null)      lines.push(unlimited(f.max_api_calls) ? 'Unlimited API calls/month' : `${Number(f.max_api_calls).toLocaleString()} API calls/month`);
  if (f.max_app_groups != null)     lines.push(fmt(f.max_app_groups, 'app group', 'app groups'));
  if (f.max_apps_per_group != null) lines.push(fmt(f.max_apps_per_group, 'app per group', 'apps per group'));
  if (f.google_login)               lines.push('Google login');
  if (f.support)                    lines.push(`${f.support} support`);
  return lines;
};

const Settings = () => {
  const { developer, updateDeveloper } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [planViewMode, setPlanViewMode] = useState('overview'); // 'overview' | 'upgrade'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentPlan, setCurrentPlan] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMsg, setRenewMsg] = useState({ type: '', text: '' });

  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: ''
  });

  // MFA States
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, confirmed_at: null, remainingBackupCodes: 0 });
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaConfirmCode, setMfaConfirmCode] = useState('');
  const [mfaActionLoading, setMfaActionLoading] = useState(false);
  const [mfaMsg, setMfaMsg] = useState({ type: '', text: '' });
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (developer) {
      setProfileForm({
        name: developer.name || '',
        username: developer.username || '',
        email: developer.email || ''
      });
      fetchMFAStatus();
    }
    fetchCurrentPlan();

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const actionParam = searchParams.get('action');
    const paymentParam = searchParams.get('payment');

    if (tabParam === 'plan' || tabParam === 'billing' || tabParam === 'plans') {
      setActiveTab('plan');
      if (actionParam === 'upgrade' || actionParam === 'choose') {
        setPlanViewMode('upgrade');
      }
    } else if (tabParam === 'password') {
      setActiveTab('password');
    } else if (tabParam === 'profile') {
      setActiveTab('profile');
    } else if (tabParam === 'mfa' || tabParam === '2fa' || tabParam === 'security') {
      setActiveTab('mfa');
    }

    if (paymentParam === 'success') {
      setActiveTab('plan');
      setPlanViewMode('overview');
      setRenewMsg({
        type: 'success',
        text: 'Payment successful and plan updated! Your new validity is now active.',
      });
      paymentService.clearPendingPayment();
      fetchCurrentPlan();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentParam === 'failed') {
      setActiveTab('plan');
      setPlanViewMode('overview');
      setRenewMsg({
        type: 'error',
        text: 'Payment was not completed or failed. Please try again.',
      });
      paymentService.clearPendingPayment();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [developer]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await api.get('/developer/my-plan');
      const data = response.data?.data || response.data;
      if (data?.hasPlan && data?.plan) {
        setCurrentPlan(data.plan);
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    }
  };

  const fetchMFAStatus = async () => {
    try {
      setMfaLoading(true);
      const res = await authService.getMFAStatus();
      const statusData = res?.data || res;
      if (statusData && typeof statusData.mfa_enabled !== 'undefined') {
        setMfaStatus(statusData);
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleStartMFASetup = async () => {
    try {
      setMfaActionLoading(true);
      setMfaMsg({ type: '', text: '' });
      const res = await authService.setupMFA();
      const setupData = res?.data || res;
      if (setupData?.secret || setupData?.qrCodeUrl) {
        setMfaSetupData(setupData);
        setMfaConfirmCode('');
      } else {
        console.error('Unexpected setup response:', res);
        setMfaMsg({ type: 'error', text: 'Could not load QR code. Please try again.' });
      }
    } catch (err) {
      setMfaMsg({ type: 'error', text: err?.message || 'Failed to initiate MFA setup' });
    } finally {
      setMfaActionLoading(false);
    }
  };

  const handleConfirmMFASetup = async (e) => {
    e.preventDefault();
    if (!mfaConfirmCode.trim()) return;
    try {
      setMfaActionLoading(true);
      setMfaMsg({ type: '', text: '' });
      const res = await authService.confirmMFA(mfaConfirmCode.trim());
      if (res?.success) {
        setMfaMsg({ type: 'success', text: 'Two-factor authentication successfully activated!' });
        setMfaSetupData(null);
        fetchMFAStatus();
        updateDeveloper({ mfa_enabled: true });
      }
    } catch (err) {
      setMfaMsg({ type: 'error', text: err?.message || 'Invalid verification code' });
    } finally {
      setMfaActionLoading(false);
    }
  };

  const handleDisableMFA = async (e) => {
    e.preventDefault();
    if (!disablePassword) return;
    try {
      setMfaActionLoading(true);
      setMfaMsg({ type: '', text: '' });
      const res = await authService.disableMFA(disablePassword);
      if (res?.success) {
        setShowDisableModal(false);
        setDisablePassword('');
        setMfaMsg({ type: 'success', text: 'Two-factor authentication has been disabled.' });
        fetchMFAStatus();
        updateDeveloper({ mfa_enabled: false });
      }
    } catch (err) {
      setMfaMsg({ type: 'error', text: err?.message || 'Failed to disable MFA. Please check your password.' });
    } finally {
      setMfaActionLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    if (!regenPassword) return;
    try {
      setMfaActionLoading(true);
      setMfaMsg({ type: '', text: '' });
      const res = await authService.regenerateBackupCodes(regenPassword);
      const regenData = res?.data || res;
      if (regenData?.backupCodes) {
        setNewBackupCodes(regenData.backupCodes);
        setRegenPassword('');
        fetchMFAStatus();
      }
    } catch (err) {
      setMfaMsg({ type: 'error', text: err?.message || 'Failed to regenerate backup codes' });
    } finally {
      setMfaActionLoading(false);
    }
  };

  const handleCopyBackupCodes = (codes) => {
    if (!codes || !codes.length) return;
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadBackupCodes = (codes) => {
    if (!codes || !codes.length) return;
    const text = `MSPK DEVELOPER PORTAL - 2FA RECOVERY BACKUP CODES\nGenerated: ${new Date().toLocaleString()}\nAccount: ${developer?.email}\n\nEach code can be used once if you lose access to your authenticator app:\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nKeep these codes in a secure, confidential location.\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mspk-2fa-recovery-codes-${developer?.username || 'developer'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/developer/profile', profileForm);
      if (response.success) {
        updateDeveloper(response.data.developer);
        setMessage({ type: 'success', text: response.message || 'Profile updated successfully.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/developer/request-password-change', {});
      setMessage({
        type: 'success',
        text: response.message || 'Password change link sent to your registered email address.'
      });
    } catch (error) {
      console.error('Request password change error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send password change link' });
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (plan) => {
    if (!plan?.end_date) return null;
    return Math.ceil((new Date(plan.end_date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const handleRenewPlan = async () => {
    if (!currentPlan?.plan_id) return;
    setRenewLoading(true);
    setRenewMsg({ type: '', text: '' });
    try {
      const orderResponse = await paymentService.createOrder(currentPlan.plan_id);
      if (!orderResponse.success) throw new Error(orderResponse.message || 'Failed to create order');

      paymentService.initiatePayment(
        orderResponse.data,
        async (razorpayResponse) => {
          try {
            if (razorpayResponse?.registration || razorpayResponse?.alreadyProcessed) {
              setRenewMsg({ type: 'success', text: 'Plan renewed successfully! Your expiry date has been extended.' });
              fetchCurrentPlan();
              return;
            }

            const verifyResponse = await paymentService.verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });
            if (verifyResponse.success) {
              setRenewMsg({ type: 'success', text: 'Plan renewed successfully! Your expiry date has been extended.' });
              fetchCurrentPlan();
            } else {
              setRenewMsg({ type: 'error', text: 'Payment verification failed. Please contact support.' });
            }
          } catch {
            setRenewMsg({ type: 'error', text: 'Payment verification failed. Please contact support with your payment ID.' });
          } finally {
            setRenewLoading(false);
          }
        },
        (err) => {
          if (err?.code !== 'PAYMENT_CANCELLED') {
            setRenewMsg({ type: 'error', text: err?.description || 'Payment failed. Please try again.' });
          }
          setRenewLoading(false);
        },
        () => { setRenewLoading(false); }
      );
    } catch (err) {
      setRenewMsg({ type: 'error', text: err.message || 'Failed to initiate renewal.' });
      setRenewLoading(false);
    }
  };

  const handlePlanSelected = () => {
    fetchCurrentPlan();
    setPlanViewMode('overview');
    setRenewMsg({
      type: 'success',
      text: 'Plan subscription updated successfully! Your new validity and limits are active.',
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isUnlimitedPlan = (plan) =>
    plan && (plan.duration_days === 0 || plan.duration_days === null || plan.duration_days === undefined || plan.duration_days === '0');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 font-medium">
          Manage your developer profile, credentials, and plan subscription.
        </p>
      </div>

      {/* Modern Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'password'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-4 w-4" />
          Password
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'plan'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Plan &amp; Billing
        </button>
        <button
          onClick={() => setActiveTab('mfa')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'mfa'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Two-Factor Auth
        </button>
      </div>

      {/* Feedback Messages */}
      {message.text && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold ${
            message.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <Card className="max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Developer Profile</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Update your public name, username, and account contact.</p>

          <form onSubmit={handleProfileUpdate} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Full Name
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Username
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <AtSign className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
                Changing your email address requires confirmation link verification before updating.
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Email Verification Status
              </label>
              <div className="mt-2">
                {developer?.email_verified ? (
                  <Badge variant="success" size="md">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Email
                  </Badge>
                ) : (
                  <Badge variant="warning" size="md">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Pending Verification
                  </Badge>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Password */}
      {activeTab === 'password' && (
        <Card className="max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security &amp; Password</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Send a secure single-use password reset link to your email to safely update your credentials.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Password Change Link</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  Click the button below to dispatch a secure verification link to <strong>{developer?.email}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestPasswordChange}
              disabled={loading}
              className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Password Reset Link
            </button>
          </div>
        </Card>
      )}

      {/* Tab 3: Plan & Billing */}
      {activeTab === 'plan' && (
        planViewMode === 'upgrade' ? (
          <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setPlanViewMode('overview')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors mb-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to My Subscription
                </button>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {currentPlan ? 'Upgrade or Change Subscription Plan' : 'Choose a Subscription Plan'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select the tier that best matches your application scale and quota requirements.
                </p>
              </div>
              {currentPlan && (
                <div className="shrink-0">
                  <Badge variant="indigo" size="md">
                    Current: {currentPlan.plan_name}
                  </Badge>
                </div>
              )}
            </div>

            <PlanSelection
              currentPlanId={currentPlan?.plan_id}
              onPlanSelected={handlePlanSelected}
            />
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {renewMsg.text && (
              <div
                className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold ${
                  renewMsg.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {renewMsg.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <span>{renewMsg.text}</span>
              </div>
            )}

            {currentPlan && !isUnlimitedPlan(currentPlan) && (() => {
              const days = getDaysRemaining(currentPlan);
              if (days === null) return null;
              if (days < 0) {
                return (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Your plan has expired. Renew or upgrade now to restore full API quota and features.</span>
                  </div>
                );
              }
              if (days <= 7) {
                return (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Your plan expires in <strong>{days} day{days !== 1 ? 's' : ''}</strong>. Renew early to avoid interruption.</span>
                  </div>
                );
              }
              return null;
            })()}

            {currentPlan ? (
              <Card>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{currentPlan.plan_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {currentPlan.price ? `₹${Number(currentPlan.price).toFixed(2)}` : 'Free Tier'}
                    </p>
                  </div>
                  <Badge variant={currentPlan.is_active ? 'success' : 'warning'} size="md">
                    {currentPlan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-slate-500 font-medium">Start Date</span>
                    <p className="mt-1 font-bold text-slate-900">{formatDate(currentPlan.start_date)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-slate-500 font-medium">Expiry Date</span>
                    <p className="mt-1 font-bold text-slate-900">
                      {isUnlimitedPlan(currentPlan) ? 'Unlimited (No Expiry)' : formatDate(currentPlan.end_date)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const lines = getPlanFeatureLines(currentPlan);
                  if (!lines.length) return null;
                  return (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Plan Limits &amp; Entitlements</p>
                      <ul className="space-y-2">
                        {lines.map((line, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                  {!isUnlimitedPlan(currentPlan) && currentPlan.price && Number(currentPlan.price) > 0 && (
                    <button
                      onClick={handleRenewPlan}
                      disabled={renewLoading}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {renewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Renew Plan (+{currentPlan.duration_label || `${currentPlan.duration_days} days`})
                    </button>
                  )}
                  <button
                    onClick={() => setPlanViewMode('upgrade')}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade or Change Plan
                  </button>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  >
                    <Receipt className="h-3.5 w-3.5 text-slate-500" />
                    Invoices &amp; Billing History
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <p className="text-sm text-slate-600 font-medium">You do not have an active plan assigned.</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPlanViewMode('upgrade')}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs cursor-pointer"
                  >
                    Choose a Plan
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5 text-slate-500" />
                    Invoices &amp; Billing History
                  </button>
                </div>
              </Card>
            )}
          </div>
        )
      )}

      {/* Tab 4: Two-Factor Authentication */}
      {activeTab === 'mfa' && (
        <div className="space-y-6 max-w-3xl">
          {mfaMsg.text && (
            <div
              className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold ${
                mfaMsg.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {mfaMsg.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>{mfaMsg.text}</span>
            </div>
          )}

          {mfaStatus.mfa_enabled ? (
            /* Active 2FA State */
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication is Active</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Your account is protected with standard TOTP authenticator verification.
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="md">
                  Enabled
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-slate-500 font-medium">Activated On</span>
                  <p className="mt-1 font-bold text-slate-900">{formatDate(mfaStatus.confirmed_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-slate-500 font-medium">Backup Recovery Codes</span>
                  <p className="mt-1 font-bold text-slate-900">
                    {mfaStatus.remainingBackupCodes} of 8 codes remaining
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegenModal(true);
                    setRegenPassword('');
                    setNewBackupCodes(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  Regenerate Backup Codes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(true);
                    setDisablePassword('');
                  }}
                  className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
                >
                  <Lock className="h-3.5 w-3.5 text-rose-600" />
                  Disable Two-Factor Auth
                </button>
              </div>
            </Card>
          ) : mfaSetupData ? (
            /* Setup Wizard Mode */
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Set Up Two-Factor Authentication</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Follow the 3 steps below to connect your authenticator app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMfaSetupData(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel Setup
                </button>
              </div>

              <div className="mt-6 space-y-6 text-xs">
                {/* Step 1: Scan QR */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">1</span>
                    Scan QR code with your Authenticator app
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Open Google Authenticator, Microsoft Authenticator, Authy, or Apple Passwords on your mobile device and scan the QR code below:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <img
                        src={mfaSetupData.qrCodeUrl}
                        alt="2FA QR Code"
                        className="w-44 h-44 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2 max-w-sm text-center sm:text-left">
                      <p className="text-slate-500 font-medium">Can't scan the QR code? Enter this secret key manually into your app:</p>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 font-mono text-xs font-bold text-slate-800 break-all select-all">
                        <Key className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>{mfaSetupData.secret}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(mfaSetupData.secret);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedKey ? 'Copied to Clipboard!' : 'Copy Key'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Backup Codes */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-xs">2</span>
                    Save your emergency recovery backup codes
                  </div>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    If you lose access to your phone or authenticator app, these one-time recovery codes are the <strong>only way</strong> to regain access to your developer account. Keep them secure!
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs font-bold text-slate-900 bg-white border border-amber-200 rounded-xl p-3 text-center">
                    {mfaSetupData.backupCodes?.map((code, idx) => (
                      <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyBackupCodes(mfaSetupData.backupCodes)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shadow-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedCodes ? 'Copied All Codes!' : 'Copy All Codes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadBackupCodes(mfaSetupData.backupCodes)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download as .TXT
                    </button>
                  </div>
                </div>

                {/* Step 3: Confirm Code */}
                <form onSubmit={handleConfirmMFASetup} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">3</span>
                    Verify code from your Authenticator app
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Enter the 6-digit code currently showing in your authenticator app to verify the setup:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      value={mfaConfirmCode}
                      onChange={(e) => setMfaConfirmCode(e.target.value)}
                      placeholder="123456"
                      className="w-full sm:w-48 text-center tracking-widest font-mono text-xl font-bold py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                    <button
                      type="submit"
                      disabled={mfaActionLoading || mfaConfirmCode.length !== 6}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {mfaActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Activate Two-Factor Authentication
                    </button>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            /* Unenrolled State */
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Two-Factor Authentication (2FA)</h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Two-Factor Authentication adds an extra layer of protection to your developer account. In addition to your password, you will be required to provide a 6-digit code from an Authenticator app (like Google Authenticator or Authy) when logging in.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Benefits</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">Protects API credentials, apps, and billing from unauthorized access.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">Compatible with Google Authenticator, Microsoft Authenticator, and Authy.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">8 emergency recovery backup codes in case you misplace your device.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">Industry-standard RFC 6238 TOTP cryptographic security.</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={handleStartMFASetup}
                  disabled={mfaActionLoading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {mfaActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enable Two-Factor Authentication
                </button>
              </div>
            </Card>
          )}

          {/* Modal: Disable 2FA */}
          <Modal
            isOpen={showDisableModal}
            onClose={() => setShowDisableModal(false)}
            title="Disable Two-Factor Authentication"
          >
            <form onSubmit={handleDisableMFA} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Disabling 2FA makes your developer account less secure. Please enter your account password to confirm:
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Account Password
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mfaActionLoading || !disablePassword}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {mfaActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm &amp; Disable 2FA
                </button>
              </div>
            </form>
          </Modal>

          {/* Modal: Regenerate Backup Codes */}
          <Modal
            isOpen={showRegenModal}
            onClose={() => {
              setShowRegenModal(false);
              setNewBackupCodes(null);
            }}
            title="Regenerate Backup Recovery Codes"
          >
            {newBackupCodes ? (
              <div className="space-y-4">
                <p className="text-xs text-emerald-700 font-semibold">
                  New backup codes generated! Your old recovery codes are now invalid.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  {newBackupCodes.map((code, idx) => (
                    <div key={idx} className="p-1.5 bg-white rounded border border-slate-200">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyBackupCodes(newBackupCodes)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedCodes ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadBackupCodes(newBackupCodes)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download TXT
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegenModal(false);
                      setNewBackupCodes(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegenerateBackupCodes} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Generating new backup codes will invalidate any existing recovery codes. Enter your password to continue:
                </p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Account Password
                  </label>
                  <input
                    type="password"
                    value={regenPassword}
                    onChange={(e) => setRegenPassword(e.target.value)}
                    placeholder="Enter your account password"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegenModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mfaActionLoading || !regenPassword}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {mfaActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Generate New Codes
                  </button>
                </div>
              </form>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
};

export default Settings;
