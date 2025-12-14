import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRequired,
} from '../../utils/validators';
import '../Login/Login.scss';

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
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!validateRequired(formData.name)) {
      newErrors.name = 'Name is required';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters (alphanumeric and underscore only)';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptPolicies) {
      newErrors.acceptPolicies = 'You must agree to the terms, privacy and refund policies';
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
      const response = await authService.register({
        ...formData,
        acceptPolicies: true,
      });
      // console.log('Registration response:', response);
      
      setRegistrationSuccess(true);
      setRegisteredEmail(formData.email);
      setMessage({
        type: 'success',
        text: 'Registration successful! Verification email sent to your inbox (valid for 5 minutes).',
      });
      
      // setTimeout(() => {
      //   navigate('/login');
      // }, 2000);
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {!registrationSuccess ? (
            <>
              <div className="auth-header">
                <h1>Create Account</h1>
                <p>Start building secure authentication for your apps</p>
              </div>

              {message.text && (
                <div className={`alert alert-${message.type}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              {errors.name && (
                <span className="error-message">{errors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a username"
                autoComplete="username"
              />
              {errors.username && (
                <span className="error-message">{errors.username}</span>
              )}
              <span className="help-text">
                3-20 characters, alphanumeric and underscore only
              </span>
            </div>

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
                placeholder="Create a password"
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
              <span className="help-text">
                Minimum 8 characters
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={acceptPolicies}
                  onChange={(e) => setAcceptPolicies(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span>
                  I agree to the Terms, Privacy Policy and Refund Policy.
                  {' '}
                  <Link to="/terms">View Terms</Link>,{' '}
                  <Link to="/privacy">Privacy</Link>,{' '}
                  <Link to="/refund">Refund Policy</Link>
                </span>
              </label>
              {errors.acceptPolicies && (
                <span className="error-message">{errors.acceptPolicies}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
            </>
          ) : (
            <>
              <div className="auth-header">
                <h1>✅ Check Your Email</h1>
                <p>Verification email sent successfully!</p>
              </div>

              <div className="alert alert-success">
                <p style={{ marginBottom: '1rem' }}>
                  We've sent a verification link to <strong>{registeredEmail}</strong>
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                  The link is valid for <strong>5 minutes</strong>. Please check your inbox and spam folder.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-block btn-lg"
                >
                  Continue to Sign In
                </button>
              </div>

              <div className="auth-footer">
                <p>
                  Didn't receive the email?{' '}
                  <Link to="/login">Go to login</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
