import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { authService } from '../../services/authService';
import PlanFeatures from '../../components/PlanFeatures/PlanFeatures';
import './Settings.scss';

const Settings = () => {
  const { developer, updateDeveloper, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentPlan, setCurrentPlan] = useState(null);

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
      if (response.data.hasPlan) {
        setCurrentPlan(response.data.plan);
        // console.log        console.log(response.data.plan);
        
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

  const handleCancelPlan = async () => {
    if (!currentPlan) return;

    const confirmCancel = window.confirm('Are you sure you want to cancel your current plan?');
    if (!confirmCancel) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/developer/cancel-plan', {});

      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message || 'Plan cancelled successfully'
        });
        setCurrentPlan(null);
      } else {
        setMessage({
          type: 'error',
          text: response.message || 'Failed to cancel plan'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to cancel plan'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = () => {
    navigate('/plans');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBillingCycleLabel = (plan) => {
    if (!plan) return 'N/A';

    const isFree = !plan.price || Number(plan.price) === 0;
    if (isFree) return 'No Billing (Free plan)';

    const days = plan.duration_days;
    if (!days) return 'Lifetime (no recurring billing)';
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
                    <span className="badge badge-warning">⚠ Not Verified</span>
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
                      {currentPlan.duration_days
                        ? `${currentPlan.duration_days} days (billing cycle matches plan duration)`
                        : (!currentPlan.price || Number(currentPlan.price) === 0)
                          ? 'No fixed duration (free plan)'
                          : 'Lifetime / until cancelled'}
                    </span>
                  </div>

                  <div className="plan-detail">
                    <span className="label">Start Date:</span>
                    <span className="value">{formatDate(currentPlan.start_date)}</span>
                  </div>

                  {currentPlan.end_date && (
                    <div className="plan-detail">
                      <span className="label">Expires On:</span>
                      <span className="value">{formatDate(currentPlan.end_date)}</span>
                    </div>
                  )}

                  {currentPlan.description && (
                    <div className="plan-detail">
                      <span className="label">Description:</span>
                      <span className="value">{currentPlan.description}</span>
                    </div>
                  )}

                  <PlanFeatures
                    features={currentPlan.features}
                    showTitle
                    title="Features:"
                    wrapperClassName="plan-features"
                    listClassName=""
                  />
                </div>

                <div className="plan-info-footer">
                  <button className="btn btn-primary" onClick={handleUpgradePlan}>
                    Upgrade Plan
                  </button>
                  {(!currentPlan.price || Number(currentPlan.price) === 0) && (
                    <button
                      className="btn btn-danger"
                      onClick={handleCancelPlan}
                      disabled={loading}
                    >
                      Cancel Plan
                    </button>
                  )}
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
