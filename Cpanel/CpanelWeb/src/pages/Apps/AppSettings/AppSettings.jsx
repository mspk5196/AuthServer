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
  const [accessTokenTTL, setAccessTokenTTL] = useState('');
  const [extraFields, setExtraFields] = useState([]);
  const [showExtraFieldsPanel, setShowExtraFieldsPanel] = useState(true);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [userEditPermissions, setUserEditPermissions] = useState({ name: true, username: true, email: true });

  useEffect(()=>{ fetchSettings(); fetchUsage(); }, [appId]);

  async function fetchSettings(){
    try {
      const resp = await api.get(`/apps/appDetails/${appId}`, token);
      if (resp.success) {
        const appData = resp.data.app || resp.data;
        setApp(appData);
        setGoogleClientId(appData.google_client_id || '');
        setGoogleClientSecret(appData.google_client_secret || '');
        setExtraFields(appData.extra_fields || []);
        setUserEditPermissions(appData.user_edit_permissions || { name: true, username: true, email: true });
        setAccessTokenTTL(appData.access_token_expires_seconds || '');
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

  // ---------- Custom Extra Fields ----------
  function addField() {
    if (extraFields.length >= 10) return alert('Maximum 10 custom fields allowed');
    setExtraFields(prev => [...prev, { name: '', label: '', type: 'text', editable_by_user: true }]);
    setFieldsDirty(true);
  }

  function removeField(index) {
    setExtraFields(prev => prev.filter((_, i) => i !== index));
    setFieldsDirty(true);
  }

  function updateField(index, key, value) {
    setExtraFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
    setFieldsDirty(true);
  }

  async function saveExtraFields() {
    setSaving(true);
    try {
      // Basic validation
      for (const f of extraFields) {
        if (!f.name || !/^[a-zA-Z0-9_]+$/.test(f.name)) {
          return alert('Each field must have a name (letters, numbers, underscore only)');
        }
        if (!f.type) return alert('Each field must have a type');
      }
      const body = { extra_fields: extraFields, user_edit_permissions: userEditPermissions };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        alert('Custom fields saved');
        await fetchSettings();
        setFieldsDirty(false);
      } else {
        alert(resp.message || 'Failed to save custom fields');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save custom fields');
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

        {/* Access Token TTL */}
        <div className="ttl-config">
          <h4 className="config-title">Access Token TTL</h4>
          <p className="config-info">Set the access token lifetime (in seconds). Leave blank to use server default.</p>
          <div className="config-field">
            <input
              type="number"
              min={60}
              className="config-input"
              value={accessTokenTTL === null ? '' : accessTokenTTL}
              onChange={(e) => setAccessTokenTTL(e.target.value)}
              placeholder="e.g., 604800 (7 days)"
            />
            <button
              className="save-config-btn"
              onClick={async () => {
                setSaving(true);
                try {
                  const body = { access_token_expires_seconds: accessTokenTTL === '' ? null : parseInt(accessTokenTTL, 10) };
                  const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
                  if (resp.success) {
                    alert('Access token TTL saved');
                    await fetchSettings();
                  } else {
                    alert(resp.message || 'Failed to save TTL');
                  }
                } catch (err) {
                  console.error(err);
                  alert('Failed to save TTL');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >Save TTL</button>
          </div>
        </div>
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

      {/* Custom Fields Card */}
      <div className="custom-fields-card">
        <div className="custom-fields-header" onClick={() => setShowExtraFieldsPanel(prev => !prev)}>
          <h3 className="card-title">Custom User Fields</h3>
          <div className="header-actions">
            <span className="fields-count">{extraFields.length} / 10</span>
            <button className="collapse-toggle">{showExtraFieldsPanel ? '−' : '+'}</button>
          </div>
        </div>

        <p className="card-sub">Add extra columns available for users. Control whether each field (and core fields) is editable by the user.</p>

        {!showExtraFieldsPanel && (
          <div className="fields-collapsed-summary">Custom fields are collapsed. Click to expand.</div>
        )}

        {showExtraFieldsPanel && (
          <>
            {extraFields.length === 0 && (
              <div className="no-custom-fields">No custom fields defined.</div>
            )}

            <div className="fields-grid">
              {extraFields.map((f, idx) => (
                <div className="custom-field-row" key={idx}>
                  <div className="field-main">
                    <input
                      className="custom-field-input name"
                      placeholder="field_name"
                      value={f.name}
                      onChange={(e) => updateField(idx, 'name', e.target.value)}
                    />
                    <input
                      className="custom-field-input label"
                      placeholder="Label (optional)"
                      value={f.label || ''}
                      onChange={(e) => updateField(idx, 'label', e.target.value)}
                    />
                  </div>

                  <div className="field-meta">
                    <select
                      className="custom-field-select"
                      value={f.type}
                      onChange={(e) => updateField(idx, 'type', e.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="integer">Integer</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="json">JSON</option>
                    </select>

                    <label className="editable-by-user-label">
                      <input type="checkbox" checked={!!f.editable_by_user} onChange={(e) => updateField(idx, 'editable_by_user', e.target.checked)} />
                      Editable
                    </label>
                  </div>

                  <div className="field-actions">
                    <button className="btn btn-danger small" onClick={() => removeField(idx)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="core-field-permissions">
              <h4>Core field permissions</h4>
              <div className="core-perms-row">
                <label><input type="checkbox" checked={!!userEditPermissions.name} onChange={(e)=>setUserEditPermissions(prev=>({...prev, name: e.target.checked}))} /> Name editable by user</label>
                <label><input type="checkbox" checked={!!userEditPermissions.username} onChange={(e)=>setUserEditPermissions(prev=>({...prev, username: e.target.checked}))} /> Username editable by user</label>
                <label><input type="checkbox" checked={!!userEditPermissions.email} onChange={(e)=>setUserEditPermissions(prev=>({...prev, email: e.target.checked}))} /> Email editable by user</label>
              </div>
            </div>

            <div className="custom-fields-actions">
              <button className="btn btn-secondary" onClick={addField} disabled={extraFields.length >= 10}>+ Add field</button>
              <button className="btn btn-primary" onClick={saveExtraFields} disabled={saving || !fieldsDirty}>Save Fields</button>
              <button className="btn btn-ghost" onClick={async () => { await fetchSettings(); setFieldsDirty(false); }}>Cancel</button>
            </div>

            <div className="fields-preview">
              <h4>Preview (JSON)</h4>
              <pre className="preview-block">{JSON.stringify(extraFields, null, 2)}</pre>
            </div>
          </>
        )}
      </div>

      {/* Saving Indicator (Fixed Position) */}
      {saving && <div className="saving-indicator">💾 Saving changes...</div>}
      
    </div>
  );
}