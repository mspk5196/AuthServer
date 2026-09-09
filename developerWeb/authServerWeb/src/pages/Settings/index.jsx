import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import paymentService from '../../services/paymentService';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
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
  ShieldCheck,
  Check
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

  useEffect(() => {
    if (developer) {
      setProfileForm({
        name: developer.name || '',
        username: developer.username || '',
        email: developer.email || ''
      });
    }
    fetchCurrentPlan();

    const searchParams = new URLSearchParams(window.location.search);
    const paymentParam = searchParams.get('payment');

    if (paymentParam === 'success') {
      setActiveTab('plan');
      setRenewMsg({
        type: 'success',
        text: 'Payment successful and plan updated! Your new validity is now active.',
      });
      paymentService.clearPendingPayment();
      fetchCurrentPlan();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentParam === 'failed') {
      setActiveTab('plan');
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
                  <span>Your plan has expired. Renew now to restore full API quota and features.</span>
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
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Plan Limits</p>
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
                  onClick={() => navigate('/plans')}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
                >
                  Upgrade or Change Plan
                </button>
              </div>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <p className="text-sm text-slate-600 font-medium">You do not have an active plan assigned.</p>
              <button
                onClick={() => navigate('/plans')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Choose a Plan
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
