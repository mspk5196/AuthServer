import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRequired,
} from '../../utils/validators';
import {
  UserPlus,
  User,
  AtSign,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!validateRequired(formData.name)) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = '3-20 chars (alphanumeric and underscore only)';
    }

    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptPolicies) {
      newErrors.acceptPolicies = 'You must agree to the platform policies to register';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validate()) return;

    setLoading(true);
    try {
      await authService.register({
        ...formData,
        acceptPolicies: true,
      });
      setRegisteredEmail(formData.email);
      setRegistrationSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        {!registrationSuccess ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <UserPlus className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Create Developer Account
              </h1>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                Start securing authentication for your apps in minutes
              </p>
            </div>

            {message.text && (
              <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      autoComplete="name"
                      className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                        errors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.name}</p>}
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
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="janedev"
                      autoComplete="username"
                      className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                        errors.username ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.username}</p>}
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                        errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Confirm Password
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className={`block w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium ${
                        errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Policy Checkbox */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptPolicies}
                    onChange={(e) => setAcceptPolicies(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I agree to the platform{' '}
                    <Link to="/terms" target="_blank" className="font-bold text-indigo-600 hover:underline">Terms of Service</Link>,{' '}
                    <Link to="/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">Privacy Policy</Link>, and{' '}
                    <Link to="/refund" target="_blank" className="font-bold text-indigo-600 hover:underline">Refund Policy</Link>.
                  </span>
                </label>
                {errors.acceptPolicies && (
                  <p className="mt-2 text-xs text-rose-600 font-semibold">{errors.acceptPolicies}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:underline">
                Sign in
              </Link>
            </div>
          </>
        ) : (
          /* Registration Success Screen */
          <div className="text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-900">Check Your Email</h2>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              We've sent a verification link to <strong className="text-indigo-600">{registeredEmail}</strong>
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed text-left font-medium">
              <p>• The verification link is valid for <strong>5 minutes</strong>.</p>
              <p className="mt-1">• Please check your inbox and spam folder.</p>
              <p className="mt-1">• After confirming your email, you can sign in to your developer portal.</p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Continue to Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
