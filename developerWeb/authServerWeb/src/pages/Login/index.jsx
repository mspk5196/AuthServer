import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { validateEmail, validatePassword } from '../../utils/validators';
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

    if (!validate()) return;

    setLoading(true);
    try {
      await authService.login(formData);
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

  return (
    <div className="auth-page">
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
