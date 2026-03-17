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

  const getBillingCycleLabel = () => {
    if (!planInfo) return 'N/A';
    if (planInfo.plan_type === 'free') return 'No Billing (Free plan)';

    const days = planInfo.duration_days;
    if (!days) return 'Lifetime (no recurring billing)';
    if (days === 30) return 'Every 30 days (monthly)';
    if (days === 365) return 'Every 365 days (yearly)';
    return `Every ${days} days`;
  };

  const handleUpgradePlanClick = () => {
    window.open('https://authservices.mspkapps.in/plans', '_blank', 'noopener');
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

  const appsPercentage = planInfo && planInfo.max_apps
    ? (planInfo.apps_used / planInfo.max_apps) * 100
    : 0;
  const apiCallsPercentage = planInfo && planInfo.max_api_calls
    ? (planInfo.api_calls_used / planInfo.max_api_calls) * 100
    : 0;

  const groupsUsed = planInfo?.app_groups_used || 0;
  const groupsPercentage = planInfo?.max_app_groups ? (groupsUsed / planInfo.max_app_groups) * 100 : 0;

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
          <button className="btn btn-secondary" onClick={handleUpgradePlanClick}>
            {planInfo?.plan_type === 'free' ? 'Upgrade Plan in Developer Portal' : 'Manage Plan in Developer Portal'}
          </button>
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
              {getBillingCycleLabel()}
            </div>
          </div>
          <div className="plan-detail">
            <div className="plan-detail-label">Plan Duration</div>
            <div className="plan-detail-value">
              {planInfo?.duration_days
                ? `${planInfo.duration_days} days (billing cycle matches plan duration)`
                : planInfo?.plan_type === 'free'
                  ? 'No fixed duration (free plan)'
                  : 'Lifetime / until cancelled'}
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
            <div className="usage-stat-limit">
              {planInfo?.max_apps === null || planInfo?.max_apps === undefined
                ? 'Unlimited apps'
                : `of ${planInfo.max_apps} apps`}
            </div>
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
            <div className="usage-stat-limit">
              {planInfo?.max_api_calls === null || planInfo?.max_api_calls === undefined
                ? 'Unlimited API calls per month'
                : `of ${planInfo.max_api_calls.toLocaleString()} calls`}
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${getProgressColor(apiCallsPercentage)}`}
                style={{ width: `${Math.min(apiCallsPercentage, 100)}%` }}
              />
            </div>
          </div>
          <div className="usage-stat">
            <div className="usage-stat-label">App Groups</div>
            <div className="usage-stat-value">{groupsUsed}</div>
            <div className="usage-stat-limit">
              {planInfo?.max_app_groups === null || planInfo?.max_app_groups === undefined
                ? 'Unlimited groups'
                : `of ${planInfo.max_app_groups} groups`}
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${getProgressColor(groupsPercentage)}`}
                style={{ width: `${Math.min(groupsPercentage, 100)}%` }}
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
          <h2 className="settings-section-title">Developer Credentials</h2>
          <p className="settings-section-subtitle">Use these credentials to access developer-level APIs (fetch all apps, groups, and users)</p>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">Developer ID</div>
            <div className="settings-label-desc">Your unique developer identifier for API authentication</div>
          </div>
          <div className="settings-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <code style={{ 
              background: 'var(--surface-color)', 
              padding: '0.5rem 1rem', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              border: '1px solid var(--border-color)'
            }}>
              {developer?.dev_id || 'Loading...'}
            </code>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => {
                navigator.clipboard.writeText(developer?.dev_id || '');
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = originalText; }, 2000);
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <div className="settings-label-title">API Documentation</div>
            <div className="settings-label-desc">Learn how to use your Developer ID</div>
          </div>
          <div className="settings-value">
            <a 
              href="https://docs.mspkapps.in/developer-api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              View Docs
            </a>
          </div>
        </div>
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
