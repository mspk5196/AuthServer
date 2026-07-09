import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { authService } from '../../services/authService';
import paymentService from '../../services/paymentService';
import './Settings.scss';

/** Build display feature lines from features_desc (preferred) or features JSONB fallback */
const getPlanFeatureLines = (plan) => {
  if (!plan) return [];
  const desc = plan.features_desc;
  if (Array.isArray(desc) && desc.length) return desc;
  const f = plan.features;
  if (!f) return [];
  const unlimited = (v) => v === 0 || v === '0' || Number(v) === 0;
  const fmt = (v, singular, plural) =>
    unlimited(v) ? `Unlimited ${plural || singular}` : `Up to ${v} ${Number(v) === 1 ? singular : (plural || singular)}`;
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
  const { developer, updateDeveloper, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentPlan, setCurrentPlan] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMsg, setRenewMsg] = useState({ type: '', text: '' });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: ''
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
  }, [developer]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await api.get('/developer/my-plan');
      // Support both v1 and v2 response shapes
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
        setMessage({ 
          type: 'success', 
          text: response.message 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/developer/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // Logout after 3 seconds
        setTimeout(() => {
          logout().finally(() => navigate('/login', { replace: true }));
        }, 3000);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password' 
      });
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
        text: response.message || 'Password change link sent to your email. Please check your inbox.' 
      });
    } catch (error) {
      console.error('Request password change error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to send password change link' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = () => {
    navigate('/plans');
  };

  /** Days remaining until plan end_date (negative = already expired) */
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

  const getBillingCycleLabel = (plan) => {
    if (!plan) return 'N/A';
    const isFree = !plan.price || Number(plan.price) === 0;
    if (isFree) return 'No Billing (Free plan)';
    if (isUnlimitedPlan(plan)) return 'One-time (unlimited)';
    const days = plan.duration_days;
    if (days === 30) return 'Every 30 days (monthly)';
    if (days === 365) return 'Every 365 days (yearly)';
    return `Every ${days} days`;
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">Account Settings</h1>

        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
          <button 
            className={`tab ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            Plan & Billing
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="settings-content">
            <h2>Profile Information</h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
                <small className="form-hint">
                  Changing your email will require verification before it takes effect.
                </small>
              </div>

              <div className="form-group">
                <label>Email Verification Status</label>
                <div className="verification-badge">
                  {developer?.email_verified ? (
                    <span className="badge badge-success">✓ Verified</span>
                  ) : (
                    <span className="badge badge-warning">⚠️ Not Verified</span>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="settings-content">
            <h2>Change Password</h2>
            
            <div className="password-options">
              <div className="option-card">
                <h3>Change Password via Email</h3>
                <p>We'll send you a secure link to your registered email address. Click the link to change your password.</p>
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={handleRequestPasswordChange}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Password Change Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="settings-content">
            <h2>Current Plan</h2>
            
            {renewMsg.text && (
              <div className={`alert alert-${renewMsg.type}`}>{renewMsg.text}</div>
            )}

            {currentPlan && !isUnlimitedPlan(currentPlan) && (() => {
              const days = getDaysRemaining(currentPlan);
              if (days === null) return null;
              if (days < 0) return (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  ⚠️ Your plan has expired. Renew now to continue using API features.
                </div>
              );
              if (days <= 7) return (
                <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                  ⚠️ Your plan expires in <strong>{days} day{days !== 1 ? 's' : ''}</strong>. Renew before it runs out to avoid any interruption.
                </div>
              );
              return null;
            })()}

            {currentPlan ? (
              <div className="plan-info-card">
                <div className="plan-info-header">
                  <h3>{currentPlan.plan_name}</h3>
                  <span className={`badge badge-${currentPlan.is_active ? 'success' : 'warning'}`}>
                    {currentPlan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="plan-info-body">
                  <div className="plan-detail">
                    <span className="label">Price:</span>
                    <span className="value">
                      {currentPlan.price ? `₹${parseFloat(currentPlan.price).toFixed(2)}` : 'Free'}
                    </span>
                  </div>

                  <div className="plan-detail">
                    <span className="label">Billing Cycle:</span>
                    <span className="value">{getBillingCycleLabel(currentPlan)}</span>
                  </div>

                  <div className="plan-detail">
                    <span className="label">Plan Duration:</span>
                    <span className="value">
                      {isUnlimitedPlan(currentPlan)
                        ? 'Unlimited (no expiry)'
                        : currentPlan.duration_label || `${currentPlan.duration_days} days`}
                    </span>
                  </div>

                  <div className="plan-detail">
                    <span className="label">Start Date:</span>
                    <span className="value">{formatDate(currentPlan.start_date)}</span>
                  </div>

                  <div className="plan-detail">
                    <span className="label">Expires On:</span>
                    <span className="value">
                      {isUnlimitedPlan(currentPlan) ? 'Unlimited' : formatDate(currentPlan.end_date)}
                    </span>
                  </div>

                  {currentPlan.description && (
                    <div className="plan-detail">
                      <span className="label">Description:</span>
                      <span className="value">{currentPlan.description}</span>
                    </div>
                  )}

                  {(() => {
                    const lines = getPlanFeatureLines(currentPlan);
                    if (!lines.length) return null;
                    return (
                      <div className="plan-features">
                        <span className="label">Features:</span>
                        <ul>
                          {lines.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                <div className="plan-info-footer">
                  {!isUnlimitedPlan(currentPlan) && currentPlan.price && Number(currentPlan.price) > 0 && (
                    <button
                      className="btn btn-success"
                      onClick={handleRenewPlan}
                      disabled={renewLoading}
                      style={{ marginRight: '10px' }}
                    >
                      {renewLoading ? 'Processing...' : `Renew Plan (+${currentPlan.duration_label || currentPlan.duration_days + ' days'})`}
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={handleUpgradePlan}>
                    Upgrade Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-plan">
                <p>You don't have an active plan.</p>
                <button className="btn btn-primary" onClick={handleUpgradePlan}>
                  Select a Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
