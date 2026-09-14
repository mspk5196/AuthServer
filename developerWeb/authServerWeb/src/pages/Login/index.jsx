import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validators';
import Modal from '../../components/Modal';
import { API_BASE_URL } from '../../utils/api';
import {
  LogIn,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [pendingPolicies, setPendingPolicies] = useState(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [acceptingPolicies, setAcceptingPolicies] = useState(false);
  const [showOAuthPolicyModal, setShowOAuthPolicyModal] = useState(false);
  const [oauthPolicyToken, setOauthPolicyToken] = useState(null);
  const [oauthPolicyAccepted, setOauthPolicyAccepted] = useState(false);
  const [acceptingOAuthPolicies, setAcceptingOAuthPolicies] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, checkAuth } = useAuth();

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');
    const policyToken = params.get('token');

    if (error === 'policy_not_accepted' && policyToken) {
      setOauthPolicyToken(policyToken);
      setShowOAuthPolicyModal(true);
      setOauthPolicyAccepted(false);
      window.history.replaceState({}, '', '/login');
    } else if (error) {
      const errorMessages = {
        no_code: 'Authentication failed: No authorization code received',
        no_token: 'Authentication failed: No token received',
        no_email: 'Authentication failed: No email provided by Google',
        blocked: 'This account has been blocked. Please contact support.',
        auth_failed: 'Google authentication failed / Session expired. Please try again.',
        policy_not_accepted: 'Policy acceptance is required. Please try again.',
      };
      setMessage({
        type: 'error',
        text: errorMessages[error] || 'Google authentication failed / Session expired. Please try again.',
      });
      window.history.replaceState({}, '', '/login');
    } else if (token && refreshToken) {
      (async () => {
        try {
          const resp = await api.post('/developer/exchange-tokens', { token, refreshToken });
          if (resp.success) {
            try { await checkAuth(); } catch(e) {}
            window.history.replaceState({}, '', '/login');
            navigate('/dashboard');
          } else {
            setMessage({ type: 'error', text: resp.message || 'Failed to establish session' });
            window.history.replaceState({}, '', '/login');
          }
        } catch (err) {
          console.error('Failed to exchange OAuth tokens:', err);
          setMessage({ type: 'error', text: err.message || 'Authentication failed' });
          window.history.replaceState({}, '', '/login');
        }
      })();
    }
  }, [location, navigate, checkAuth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setUnverifiedEmail(null);
    setPendingPolicies(null);
    setPolicyAccepted(false);

    if (!validate()) return;

    setLoading(true);
    try {
      await login(formData);
      navigate('/dashboard');
    } catch (error) {
      if (error.error === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(formData.email);
        setMessage({
          type: 'warning',
          text: 'Please verify your email first. Check your inbox for the verification link.',
        });
      } else if (error.error === 'ACCOUNT_BLOCKED') {
        setMessage({
          type: 'error',
          text: 'This email is blocked. Please contact support.',
        });
      } else if (error.error === 'ACCOUNT_LOCKED') {
        setMessage({
          type: 'error',
          text: error.message || 'Account is temporarily locked due to multiple failed login attempts.',
        });
      } else if (error.error === 'POLICY_NOT_ACCEPTED') {
        setPendingPolicies(error.data?.policies || []);
        setPolicyAccepted(false);
        setMessage({
          type: 'info',
          text: 'Please review and accept the latest platform policies to continue.',
        });
      } else {
        setMessage({
          type: 'error',
          text: error.message || 'Login failed. Please check your credentials.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPolicies = async () => {
    if (!pendingPolicies || !policyAccepted) return;
    setAcceptingPolicies(true);
    setMessage({ type: '', text: '' });

    try {
      await login({ ...formData, acceptPolicies: true });
      navigate('/dashboard');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Login failed while accepting policies.',
      });
    } finally {
      setAcceptingPolicies(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendingEmail(true);
    setMessage({ type: '', text: '' });

    try {
      await authService.resendVerification(unverifiedEmail);
      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox (valid for 5 minutes).',
      });
      setUnverifiedEmail(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to resend verification email. Please try again.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleAcceptOAuthPolicies = async () => {
    if (!oauthPolicyToken || !oauthPolicyAccepted) return;
    setAcceptingOAuthPolicies(true);

    try {
      const response = await fetch(`${API_BASE_URL}/developer/accept-policies-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: oauthPolicyToken }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to accept policies');
      }

      setShowOAuthPolicyModal(false);
      setOauthPolicyToken(null);
      setOauthPolicyAccepted(false);
      setMessage({
        type: 'success',
        text: 'Policies accepted! Redirecting to Google sign-in...',
      });
      setTimeout(() => {
        window.location.href = `${API_BASE_URL}/developer/auth/google`;
      }, 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to accept policies. Please try again.',
      });
    } finally {
      setAcceptingOAuthPolicies(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* OAuth Policy Modal */}
      <Modal
        isOpen={showOAuthPolicyModal}
        onClose={() => {
          setShowOAuthPolicyModal(false);
          setOauthPolicyToken(null);
          setOauthPolicyAccepted(false);
        }}
        title="Policy Acceptance Required"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            To continue with Google sign-in, please review and accept our latest developer platform policies.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Link
              to="/policies"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
            >
              View all platform policies <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={oauthPolicyAccepted}
              onChange={(e) => setOauthPolicyAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-700 font-medium">
              I have read and agree to the{' '}
              <Link to="/terms" target="_blank" className="text-indigo-600 font-bold hover:underline">Terms</Link>,{' '}
              <Link to="/privacy" target="_blank" className="text-indigo-600 font-bold hover:underline">Privacy Policy</Link>, and{' '}
              <Link to="/refund" target="_blank" className="text-indigo-600 font-bold hover:underline">Refund Policy</Link>.
            </span>
          </label>
          <button
            type="button"
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
            onClick={handleAcceptOAuthPolicies}
            disabled={!oauthPolicyAccepted || acceptingOAuthPolicies}
          >
            {acceptingOAuthPolicies ? 'Accepting…' : 'Accept & Continue with Google'}
          </button>
        </div>
      </Modal>

      {/* Main Login Card */}
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Sign in to access your developer portal
          </p>
        </div>

        {/* Alert Messages */}
        {message.text && (
          <div
            className={`mt-6 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-semibold ${
              message.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : message.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : message.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Resend Verification Notice */}
        {unverifiedEmail && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
            <p className="font-semibold">Your email is not verified yet.</p>
            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {resendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {resendingEmail ? 'Sending…' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Email address
            </label>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="developer@example.com"
                autoComplete="email"
                className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                  errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-bold text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.password}</p>}
          </div>

          {/* Pending Policies Acceptance Block */}
          {pendingPolicies && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800">Updated Policies Required</h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Please accept our updated terms to proceed. Review full documents at{' '}
                <Link to="/policies" target="_blank" className="text-indigo-600 underline font-bold">Policies</Link>.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  I agree to the Terms, Privacy Policy, and Refund Policy.
                </span>
              </label>
              <button
                type="button"
                onClick={handleAcceptPolicies}
                disabled={!policyAccepted || acceptingPolicies}
                className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {acceptingPolicies ? 'Saving…' : 'Accept Policies & Proceed'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or continue with
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `${API_BASE_URL}/developer/auth/google`;
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 hover:underline">
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
