import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import './Settings.css';

const Settings = () => {
  const { developer } = useAuth();
  // console.log(developer);

  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const reloaded = sessionStorage.getItem("reloaded");
    if (!reloaded) {
      sessionStorage.setItem("reloaded", "true");
      location.reload();
    } else {
      fetchPlanInfo();
    }
  }, []);

  const fetchPlanInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const token = tokenService.get();
      const response = await api.get('/settings/plan', token);
      setPlanInfo(response);
      // console.log(response);

    } catch (error) {
      console.error('Error fetching plan info:', error);
      setError(error.message || 'Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return '';
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and subscription</p>
        </div>
        <div className="alert alert-error">
          {error}
        </div>
        <button className="btn btn-primary" onClick={fetchPlanInfo}>
          Retry
        </button>
      </div>
    );
  }

  const appsPercentage = planInfo ? (planInfo.apps_used / planInfo.max_apps) * 100 : 0;
  const apiCallsPercentage = planInfo ? (planInfo.api_calls_used / planInfo.max_api_calls) * 100 : 0;

  // Convert features object to array for display
  const featuresArray = planInfo?.features
    ? Object.values(planInfo.features)
    : [];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and subscription</p>
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
            please visit the <a href="https://authservices.mspkapps.in/" target="_blank" rel="noopener noreferrer">main developer portal</a>.
          </div>
        </div>
      </div>

      <div className="plan-card">
        <div className="plan-header">
          <div>
            <div className="plan-name">{planInfo?.plan_name || 'Free'} Plan</div>
          </div>
          {planInfo?.plan_type !== 'free' && (
            <button className="btn btn-secondary">
              Upgrade Plan
            </button>
          )}
        </div>
        <div className="plan-details">
          {planInfo?.expiry_date ? (
            <div className="plan-detail">
              <div className="plan-detail-label">Expires On</div>
              <div className="plan-detail-value">
                {new Date(planInfo.expiry_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          ) : (
            <div className="plan-detail">
              <div className="plan-detail-label">Status</div>
              <div className="plan-detail-value">Active</div>
            </div>
          )}
          <div className="plan-detail">
            <div className="plan-detail-label">Billing Cycle</div>
            <div className="plan-detail-value">
              {planInfo?.plan_type === 'free' ? 'No Billing' : 'Monthly'}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Plan Usage</h2>
          <p className="settings-section-subtitle">Monitor your current usage and limits</p>
        </div>

        <div className="usage-stats">
          <div className="usage-stat">
            <div className="usage-stat-label">Apps</div>
            <div className="usage-stat-value">{planInfo?.apps_used || 0}</div>
            <div className="usage-stat-limit">of {planInfo?.max_apps || 0} apps</div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${getProgressColor(appsPercentage)}`}
                style={{ width: `${Math.min(appsPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="usage-stat">
            <div className="usage-stat-label">API Calls (This Month)</div>
            <div className="usage-stat-value">{(planInfo?.api_calls_used || 0).toLocaleString()}</div>
            <div className="usage-stat-limit">of {(planInfo?.max_api_calls || 0).toLocaleString()} calls</div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${getProgressColor(apiCallsPercentage)}`}
                style={{ width: `${Math.min(apiCallsPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Plan Features</h2>
          <p className="settings-section-subtitle">What's included in your current plan</p>
        </div>

        {featuresArray.length > 0 ? (
          featuresArray.map((feature, index) => (
            <div key={index} className="settings-row">
              <div className="settings-label">
                <div className="settings-label-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--success-color)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {feature}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="settings-row">
            <div className="settings-label">
              <div className="settings-label-desc">No features available</div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Account Information</h2>
          <p className="settings-section-subtitle">Your account details</p>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">Email</div>
            <div className="settings-label-desc">Your registered email address</div>
          </div>
          <div className="settings-value">{developer?.email}</div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">Name</div>
            <div className="settings-label-desc">Your display name</div>
          </div>
          <div className="settings-value">{developer?.name || developer?.username}</div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">Account Status</div>
            <div className="settings-label-desc">Current account verification status</div>
          </div>
          <div className="settings-value">
            <span className={`badge badge-${developer?.is_verified || developer?.email_verified ? 'success' : 'warning'}`}>
              {developer?.is_verified || developer?.email_verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
