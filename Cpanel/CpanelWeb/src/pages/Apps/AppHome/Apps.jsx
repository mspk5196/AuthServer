import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import '../AppHome/Apps.css';
import app from '../../../../../auth-server/src/app';

const Apps = () => {
  const { developer } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newAppCredentials, setNewAppCredentials] = useState(null);
  const [formData, setFormData] = useState({
    app_name: '',
    support_email: '',
    allow_google_signin: false,
    allow_email_signin: true
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError('');
      const token = tokenService.get();
      const data = await api.get('/apps/getApps', token);
      if (data.success) {
        setApps(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch apps');
      }
    } catch (err) {
      console.error('Fetch apps error:', err);
      setError('Failed to load apps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    
    if (!formData.app_name.trim()) {
      setError('App name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');

      const token = tokenService.get();
      const payload = {
        app_name: formData.app_name,
        support_email: formData.support_email,
        allow_google_signin: formData.allow_google_signin,
        allow_email_signin: formData.allow_email_signin
      };
      const data = await api.post('/apps/createApp', payload, token);
      if (data.success) {
        // Show credentials modal
        setNewAppCredentials(data.data);
        setShowCredentialsModal(true);
        setShowCreateModal(false);

        // Reset form
        setFormData({
          app_name: '',
          support_email: '',
          allow_google_signin: false,
          allow_email_signin: true
        });

        // Refresh apps list
        fetchApps();
      } else {
        setError(data.message || 'Failed to create app');
      }
    } catch (err) {
      console.error('Create app error:', err);
      setError('Failed to create app. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
    alert(`${label} copied to clipboard!`);
  };

  const handleCloseCredentialsModal = () => {
    setShowCredentialsModal(false);
    setNewAppCredentials(null);
  };

  if (loading) {
    return (
      <div className="apps-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your apps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apps-container">
      <div className="apps-header">
        <div>
          <h1>📱 My Applications</h1>
          <p>Create and manage your applications</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create New App
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <h2>No Apps Yet</h2>
          <p>Create your first application to get started with authentication</p>
          <button 
            className="btn-primary btn-large"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First App
          </button>
        </div>
      ) : (
        <div className="apps-grid">
          {apps.map(app => (
            <div key={app.id} className="app-card">
              <div className="app-card-header">
                <h3>{app.app_name}</h3>
                <span className="app-status active">Active</span>
              </div>
              
              <div className="app-card-body">
                
                <div className="app-info-row">
                  <span className="label">API Key:</span>
                  <div className="copy-group">
                    <code className="api-key">{app.api_key.substring(0, 20)}...</code>
                    <button 
                      className="btn-icon"
                      onClick={() => handleCopyToClipboard(app.api_key, 'API Key')}
                      title="Copy API Key"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className="app-features">
                  <span className={`feature-badge ${app.allow_email_signin ? 'enabled' : 'disabled'}`}>
                    📧 Email Login
                  </span>
                  <span className={`feature-badge ${app.allow_google_signin ? 'enabled' : 'disabled'}`}>
                    🔐 Google OAuth
                  </span>
                </div>

                <div className="app-stats">
                  <div className="stat-item">
                    <div className="stat-value">{app.total_users || 0}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{app.active_users || 0}</div>
                    <div className="stat-label">Active (30d)</div>
                  </div>
                </div>
              </div>

              <div className="app-card-footer">
                <button 
                  className="btn-secondary btn-small"
                  onClick={() => window.location.href = `/apps/${app.id}`}
                >
                  View Details
                </button>
                <button 
                  className="btn-secondary btn-small"
                  onClick={() => window.location.href = `/apps/${app.id}/settings`}
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create App Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Application</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateApp}>
              <div className="form-group">
                <label>App Name *</label>
                <input
                  type="text"
                  placeholder="My Awesome App"
                  value={formData.app_name}
                  onChange={(e) => setFormData({...formData, app_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Support Email *</label>
                <input
                  type="email"
                  placeholder="support@example.com"
                  value={formData.support_email}
                  onChange={(e) => setFormData({...formData, support_email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.allow_email_signin}
                    onChange={(e) => setFormData({...formData, allow_email_signin: e.target.checked})}
                  />
                  <span>Enable Email/Password Login</span>
                </label>
              </div>

              <div className="form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.allow_google_signin}
                    onChange={(e) => setFormData({...formData, allow_google_signin: e.target.checked})}
                  />
                  <span>Enable Google OAuth Login</span>
                </label>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && newAppCredentials && (
        <div className="modal-overlay">
          <div className="modal-content credentials-modal">
            <div className="modal-header">
              <h2>🎉 App Created Successfully!</h2>
            </div>

            {newAppCredentials.support_email_verification_pending && (
              <div className="credentials-warning email-verification">
                <span className="warning-icon">📧</span>
                <p><strong>Email Verification Required:</strong> Check your support email for a verification link. You must verify the email before using these API credentials.</p>
              </div>
            )}

            <div className="credentials-warning">
              <span className="warning-icon">⚠️</span>
              <p><strong>Important:</strong> Save these credentials securely. The API secret will not be shown again!</p>
            </div>

            <div className="credentials-display">
              <div className="credential-item">
                <label>API Key</label>
                <div className="credential-value">
                  <code>{newAppCredentials.api_key}</code>
                  <button 
                    className="btn-icon"
                    onClick={() => handleCopyToClipboard(newAppCredentials.api_key, 'API Key')}
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="credential-item">
                <label>API Secret</label>
                <div className="credential-value">
                  <code>{newAppCredentials.api_secret}</code>
                  <button 
                    className="btn-icon"
                    onClick={() => handleCopyToClipboard(newAppCredentials.api_secret, 'API Secret')}
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="integration-guide">
              <h3>Quick Start</h3>
              <p>Add these credentials to your app's environment variables:</p>
              <pre>
{`AUTH_API_KEY=${newAppCredentials.api_key}
AUTH_API_SECRET=${newAppCredentials.api_secret}
AUTH_SERVER_URL=http://localhost:5001/api`}
              </pre>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-primary btn-large"
                onClick={handleCloseCredentialsModal}
              >
                I've Saved My Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apps;
