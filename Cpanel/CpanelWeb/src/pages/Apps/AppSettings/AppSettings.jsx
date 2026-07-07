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

  function updateCorePermission(key, value) {
    setUserEditPermissions(prev => ({ ...prev, [key]: value }));
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="total-calls-badge">
              Total Calls: <span className="calls-number">{usage?.total_calls || 0}</span>
            </div>
            <div className="total-calls-badge" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderColor: '#34d399', color: '#065f46' }}>
              📧 Mails this month: <span className="calls-number" style={{ color: '#065f46' }}>{usage?.mail_sent_this_month ?? 0}</span>
            </div>
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
          <div className="title-area">
            <h3 className="card-title">Custom User Fields</h3>
            <span className="fields-count">{extraFields.length} / 10 fields</span>
          </div>
          <button className="collapse-toggle-btn" aria-label="Toggle extra fields panel">
            <svg className={`chevron-icon ${showExtraFieldsPanel ? 'expanded' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <p className="card-sub">Define supplementary attributes for your user profiles. Check "Editable" if you want users to modify these values themselves from their account page.</p>

        {!showExtraFieldsPanel && (
          <div className="fields-collapsed-summary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', opacity: 0.7 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Custom fields configuration is collapsed. Click to expand and configure.
          </div>
        )}

        {showExtraFieldsPanel && (
          <>
            {extraFields.length === 0 ? (
              <div className="no-custom-fields">
                <div className="no-fields-icon">✨</div>
                <h4>No Custom Fields Defined</h4>
                <p>Add custom fields like phone number, address, or preferences to enrich your user profiles.</p>
              </div>
            ) : (
              <div className="fields-grid">
                {extraFields.map((f, idx) => (
                  <div className="custom-field-row" key={idx}>
                    <div className="field-index-badge">
                      <span>#{idx + 1}</span>
                    </div>

                    <div className="field-inputs-container">
                      <div className="field-input-wrapper">
                        <label className="field-input-label">Key Name</label>
                        <input
                          className="custom-field-input name"
                          placeholder="e.g., billing_address"
                          value={f.name}
                          onChange={(e) => updateField(idx, 'name', e.target.value)}
                        />
                      </div>

                      <div className="field-input-wrapper flex-grow">
                        <label className="field-input-label">Display Label</label>
                        <input
                          className="custom-field-input label"
                          placeholder="e.g., Billing Address"
                          value={f.label || ''}
                          onChange={(e) => updateField(idx, 'label', e.target.value)}
                        />
                      </div>

                      <div className="field-input-wrapper">
                        <label className="field-input-label">Data Type</label>
                        <select
                          className="custom-field-select"
                          value={f.type}
                          onChange={(e) => updateField(idx, 'type', e.target.value)}
                        >
                          <option value="text">Text (String)</option>
                          <option value="integer">Integer (Number)</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="json">JSON Object</option>
                        </select>
                      </div>

                      <div className="field-switch-wrapper">
                        <label className="field-input-label">User Editable</label>
                        <label className="custom-switch-label">
                          <input 
                            type="checkbox" 
                            className="custom-switch-input"
                            checked={!!f.editable_by_user} 
                            onChange={(e) => updateField(idx, 'editable_by_user', e.target.checked)} 
                          />
                          <span className="custom-switch-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="field-row-actions">
                      <button 
                        className="remove-field-action-btn" 
                        onClick={() => removeField(idx)} 
                        title="Delete custom field"
                        type="button"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="core-field-permissions-section">
              <h4 className="permissions-title">Core User Fields Permissions</h4>
              <p className="permissions-subtext">Toggle whether users can directly modify their default credentials and personal details.</p>
              
              <div className="core-perms-grid">
                <div className="core-perm-card">
                  <div className="perm-info">
                    <span className="perm-icon">👤</span>
                    <div className="perm-details">
                      <span className="perm-label">Display Name</span>
                      <span className="perm-desc">Allow updating full name</span>
                    </div>
                  </div>
                  <label className="custom-switch-label">
                    <input 
                      type="checkbox" 
                      className="custom-switch-input"
                      checked={!!userEditPermissions.name} 
                      onChange={(e)=>updateCorePermission('name', e.target.checked)} 
                    />
                    <span className="custom-switch-slider"></span>
                  </label>
                </div>

                <div className="core-perm-card">
                  <div className="perm-info">
                    <span className="perm-icon">🏷️</span>
                    <div className="perm-details">
                      <span className="perm-label">Username</span>
                      <span className="perm-desc">Allow changing username</span>
                    </div>
                  </div>
                  <label className="custom-switch-label">
                    <input 
                      type="checkbox" 
                      className="custom-switch-input"
                      checked={!!userEditPermissions.username} 
                      onChange={(e)=>updateCorePermission('username', e.target.checked)} 
                    />
                    <span className="custom-switch-slider"></span>
                  </label>
                </div>

                <div className="core-perm-card">
                  <div className="perm-info">
                    <span className="perm-icon">✉️</span>
                    <div className="perm-details">
                      <span className="perm-label">Email Address</span>
                      <span className="perm-desc">Allow changing login email</span>
                    </div>
                  </div>
                  <label className="custom-switch-label">
                    <input 
                      type="checkbox" 
                      className="custom-switch-input"
                      checked={!!userEditPermissions.email} 
                      onChange={(e)=>updateCorePermission('email', e.target.checked)} 
                    />
                    <span className="custom-switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="custom-fields-footer-actions">
              <button className="app-btn-secondary" onClick={addField} disabled={extraFields.length >= 10}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.375rem' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Custom Field
              </button>
              
              <div className="save-cancel-group">
                <button className="app-btn-ghost" onClick={async () => { await fetchSettings(); setFieldsDirty(false); }}>
                  Cancel
                </button>
                <button className="app-btn-primary" onClick={saveExtraFields} disabled={saving || !fieldsDirty}>
                  Save Configuration
                </button>
              </div>
            </div>

            <div className="fields-schema-preview">
              <div className="schema-preview-header">
                <div className="header-tabs">
                  <span className="preview-indicator-dot"></span>
                  <span className="tab-title">App User Schema (JSON)</span>
                </div>
              </div>
              <pre className="schema-preview-block">{JSON.stringify(extraFields, null, 2)}</pre>
            </div>
          </>
        )}
      </div>

      {/* Saving Indicator (Fixed Position) */}
      {saving && <div className="saving-indicator">💾 Saving changes...</div>}
      
    </div>
  );
}