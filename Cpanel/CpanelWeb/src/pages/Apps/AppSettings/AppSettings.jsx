import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import '../AppSettings/appSettingsSty.css';

export default function AppSettings(){
  const { appId } = useParams();
  const navigate = useNavigate();
  const token = tokenService.get();
  const [app, setApp] = useState(null);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');

  useEffect(()=>{ fetchSettings(); fetchUsage(); }, [appId]);

  async function fetchSettings(){
    try {
      const resp = await api.get(`/apps/appDetails/${appId}`, token);
      if (resp.success) {
        const appData = resp.data.app || resp.data;
        setApp(appData);
        setGoogleClientId(appData.google_client_id || '');
        setGoogleClientSecret(appData.google_client_secret || '');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch settings');
    }
  }

  async function fetchUsage(){
    try {
      const resp = await api.get(`/apps/usage/${appId}`, token);
      if (resp.success) setUsage(resp.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch usage');
    }
  }

  async function toggle(field, value){
    setSaving(true);
    try {
      const body = { [field]: value };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        await fetchSettings();
      } else {
        alert(resp.message || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function saveGoogleConfig(){
    setSaving(true);
    setError('');
    try {
      const body = {
        google_client_id: googleClientId.trim(),
        google_client_secret: googleClientSecret.trim()
      };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        alert('Google OAuth credentials saved successfully!');
        setShowGoogleConfig(false);
        await fetchSettings();
      } else {
        setError(resp.message || 'Failed to save Google credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save Google credentials');
    } finally {
      setSaving(false);
    }
  }

  if (!app) {
    return (
      <div className="app-settings">
        <div className="settings-loading">Loading application details...</div>
      </div>
    );
  }

  return (
    <div className="app-settings">
      
      {/* Header Section */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="settings-title">
          Settings — {app.app_name}
        </h1>
      </div>

      {/* Error Display */}
      {error && <div className="settings-error">{error}</div>}

      {/* Authentication Settings Card */}
      <div className="auth-settings-card">
        <h3 className="card-title">Authentication Methods</h3>
        
        {/* Email Toggle */}
        <div className={`setting-toggle ${app.allow_email_signin ? 'active' : ''}`}>
          <label className="toggle-label">
            <input 
              type="checkbox" 
              className="toggle-checkbox" 
              checked={!!app.allow_email_signin} 
              onChange={(e)=>toggle('allow_email_signin', e.target.checked)} 
              disabled={saving}
            />
            <div className="toggle-content">
              <div className="toggle-title">
                <span className="provider-icon">📧</span>
                Email/Password
              </div>
              <p className="toggle-description">Allow users to sign in with email and password credentials.</p>
            </div>
          </label>
        </div>

        {/* Google Toggle */}
        <div className={`setting-toggle ${app.allow_google_signin ? 'active' : ''}`}>
          <label className="toggle-label">
            <input 
              type="checkbox" 
              className="toggle-checkbox" 
              checked={!!app.allow_google_signin} 
              onChange={(e)=>toggle('allow_google_signin', e.target.checked)} 
              disabled={saving}
            />
            <div className="toggle-content">
              <div className="toggle-title">
                <span className="provider-icon">🌐</span>
                Google Sign-in
              </div>
              <p className="toggle-description">Allow users to sign in using their Google accounts via OAuth.</p>
            </div>
          </label>
          
          {/* Google Configuration Button */}
          {app.allow_google_signin && (
            <button 
              className="config-btn"
              onClick={() => setShowGoogleConfig(!showGoogleConfig)}
            >
              {showGoogleConfig ? '✕ Close' : '⚙️ Configure OAuth'}
            </button>
          )}
        </div>

        {/* Google OAuth Configuration Panel */}
        {showGoogleConfig && app.allow_google_signin && (
          <div className="google-config-panel">
            <h4 className="config-title">Google OAuth Configuration</h4>
            <p className="config-info">
              Get your OAuth credentials from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            </p>
            
            <div className="config-field">
              <label>Client ID</label>
              <input 
                type="text"
                className="config-input"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="e.g., 123456789-abc123.apps.googleusercontent.com"
              />
            </div>
            
            <div className="config-field">
              <label>Client Secret</label>
              <input 
                type="password"
                className="config-input"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="Enter your Google OAuth Client Secret"
              />
            </div>
            
            <div className="config-actions">
              <button 
                className="save-config-btn"
                onClick={saveGoogleConfig}
                disabled={saving || !googleClientId.trim()}
              >
                {saving ? '💾 Saving...' : '✓ Save Credentials'}
              </button>
              <button 
                className="cancel-config-btn"
                onClick={() => {
                  setShowGoogleConfig(false);
                  setGoogleClientId(app.google_client_id || '');
                  setGoogleClientSecret(app.google_client_secret || '');
                }}
              >
                Cancel
              </button>
            </div>
            
            <div className="config-note">
              <strong>📋 Setup Instructions:</strong>
              <ol>
                <li>Create OAuth 2.0 credentials in Google Cloud Console</li>
                <li>Add authorized redirect URIs for your app</li>
                <li>Copy Client ID and Client Secret here</li>
                <li>Use the endpoint: <code>POST /api/v1/:apiKey/auth/google</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics Card */}
      <div className="usage-stats-card">
        <div className="usage-header">
          <h3 className="usage-title">API Usage Statistics</h3>
          <div className="total-calls-badge">
            Total Calls: <span className="calls-number">{usage?.total_calls || 0}</span>
          </div>
        </div>
        
        <div className="endpoint-section">
          <h4 className="endpoint-subtitle">Per-endpoint Usage (Last 30 Days)</h4>
          
          {!usage?.per_endpoint || usage.per_endpoint.length === 0 ? (
             <div className="no-data">No usage data recorded yet for this application.</div>
          ) : (
            <ul className="endpoint-list">
              {(usage.per_endpoint).map(p => (
                <li key={p.endpoint} className="endpoint-item">
                  <span className="endpoint-name">{p.endpoint}</span>
                  <span className="endpoint-count">{p.calls} calls</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Saving Indicator (Fixed Position) */}
      {saving && <div className="saving-indicator">💾 Saving changes...</div>}
      
    </div>
  );
}