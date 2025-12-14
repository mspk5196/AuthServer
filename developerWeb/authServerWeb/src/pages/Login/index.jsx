import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validators';
import { tokenService } from '../../services/tokenService';
import Modal from '../../components/Modal';
import { API_URL } from '../../utils/api';
import './Login.scss';

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
  const { login } = useAuth();

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');
    const policyToken = params.get('token');

    if (error === 'policy_not_accepted' && policyToken) {
      // Show modal for policy acceptance
      setOauthPolicyToken(policyToken);
      setShowOAuthPolicyModal(true);
      setOauthPolicyAccepted(false);
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    } else if (error) {
      const errorMessages = {
        no_code: 'Authentication failed: No authorization code received',
        no_token: 'Authentication failed: No token received',
        no_email: 'Authentication failed: No email provided by Google',
        blocked: 'This account has been blocked. Please contact support.',
        auth_failed: 'Google authentication failed. Please try again.',
        policy_not_accepted: 'Policy acceptance is required. Please try again.',
      };
      setMessage({
        type: 'error',
        text: errorMessages[error] || 'Google authentication failed',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    } else if (token && refreshToken) {
      // Store tokens and redirect
      tokenService.setToken(token);
      tokenService.setRefreshToken(refreshToken);
      
      // Fetch user data and navigate
      authService.getCurrentDeveloper()
        .then(() => {
          navigate('/dashboard');
        })
        .catch((err) => {
          console.error('Failed to fetch user:', err);
          setMessage({
            type: 'error',
            text: 'Authentication successful but failed to load user data',
          });
        });
    }
  }, [location, navigate]);

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
      // Handle specific error codes
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
      }  else if (error.error === 'POLICY_NOT_ACCEPTED') {
        setPendingPolicies(error.data?.policies || []);
        setPolicyAccepted(false);
        setMessage({
          type: 'info',
          text: 'Please review and accept the latest terms, privacy and refund policies to continue.',
        });
      }
      else {
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
      if (error.error === 'POLICY_NOT_ACCEPTED') {
        setMessage({
          type: 'error',
          text: 'Unable to record policy acceptance. Please try again.',
        });
      } else {
        setMessage({
          type: 'error',
          text: error.message || 'Login failed while accepting policies.',
        });
      }
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
      const response = await fetch(`${API_URL}/api/developer/accept-policies-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: oauthPolicyToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to accept policies');
      }

      // Close modal
      setShowOAuthPolicyModal(false);
      setOauthPolicyToken(null);
      setOauthPolicyAccepted(false);

      // Show success message
      setMessage({
        type: 'success',
        text: 'Policies accepted! Redirecting to Google sign-in...',
      });

      // Retry Google OAuth after a short delay
      setTimeout(() => {
        window.location.href = `${API_URL}/api/developer/auth/google`;
      }, 1500);

    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to accept policies. Please try again.',
      });
    } finally {
      setAcceptingOAuthPolicies(false);
    }
  };

  return (
    <div className="auth-page">
      <Modal
        isOpen={showOAuthPolicyModal}
        onClose={() => {
          setShowOAuthPolicyModal(false);
          setOauthPolicyToken(null);
          setOauthPolicyAccepted(false);
        }}
        title="Policy Acceptance Required"
      >
        <div className="oauth-policy-modal">
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            To continue with Google sign-in, you need to review and accept our latest policies.
          </p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <Link 
              to="/policies" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                color: '#4285F4', 
                textDecoration: 'underline',
                fontSize: '0.95rem'
              }}
            >
              View all policies (opens in new tab)
            </Link>
          </div>

          <label className="policy-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={oauthPolicyAccepted}
              onChange={(e) => setOauthPolicyAccepted(e.target.checked)}
              style={{ marginTop: '0.25rem' }}
            />
            <span style={{ lineHeight: '1.5' }}>
              I have read and agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms</Link>,{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>, and{' '}
              <Link to="/refund" target="_blank" rel="noopener noreferrer">Refund Policy</Link>.
            </span>
          </label>

          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={handleAcceptOAuthPolicies}
            disabled={!oauthPolicyAccepted || acceptingOAuthPolicies}
            style={{ marginTop: '1.5rem' }}
          >
            {acceptingOAuthPolicies ? 'Accepting...' : 'Accept & Continue with Google'}
          </button>
        </div>
      </Modal>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your developer account</p>
          </div>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {unverifiedEmail && (
            <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                Your email is not verified yet.
              </p>
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="btn btn-sm"
                style={{ 
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  backgroundColor: '#fff',
                  color: '#856404',
                  border: '1px solid #856404'
                }}
              >
                {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div className="form-footer">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {pendingPolicies && (
              <div className="policy-consent">
                <h3>Policy Update</h3>
                <p className="policy-intro">
                  To continue, please review and accept the following policies. You can also read them any time on the public pages.
                </p>
                <p className="policy-intro" style={{ marginTop: '0.25rem' }}>
                  You can open the full documents here:
                  {' '}
                  <Link to="/policies">All Policies</Link>,{' '}
                  <Link to="/terms">Terms</Link>,{' '}
                  <Link to="/privacy">Privacy</Link>,{' '}
                  <Link to="/refund">Refund Policy</Link>
                  .
                </p>
                <div className="policy-list">
                  {pendingPolicies.map((policy) => (
                    <div key={policy.id} className="policy-item">
                      <h4>{policy.title}</h4>
                      <div className="policy-content">
                        <p>{policy.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="policy-actions">
                  <label className="policy-checkbox">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) => setPolicyAccepted(e.target.checked)}
                    />
                    <span>
                      I have read and agree to the Terms, Privacy Policy and Refund Policy.
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleAcceptPolicies}
                    disabled={!policyAccepted || acceptingPolicies}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {acceptingPolicies ? 'Saving acceptance...' : 'Accept & Continue'}
                  </button>
                </div>
              </div>
            )}

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn btn-google btn-block btn-lg"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL}/api/developer/auth/google`;
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '10px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
