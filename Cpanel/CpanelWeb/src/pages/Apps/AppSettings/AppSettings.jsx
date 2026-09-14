import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import { 
  ArrowLeft, 
  Mail, 
  Globe, 
  Settings, 
  Clock, 
  KeyRound, 
  BarChart3, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Code2,
  Lock,
  UserCheck,
  Send
} from 'lucide-react';

export default function AppSettings() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const token = tokenService.get();

  const [app, setApp] = useState(null);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [accessTokenTTL, setAccessTokenTTL] = useState('');
  const [extraFields, setExtraFields] = useState([]);
  const [showExtraFieldsPanel, setShowExtraFieldsPanel] = useState(true);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [userEditPermissions, setUserEditPermissions] = useState({ name: true, username: true, email: true });

  useEffect(() => {
    fetchSettings();
    fetchUsage();
  }, [appId]);

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  async function fetchSettings() {
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

  async function fetchUsage() {
    try {
      const resp = await api.get(`/apps/usage/${appId}`, token);
      if (resp.success) setUsage(resp.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch usage');
    }
  }

  async function toggle(field, value) {
    setSaving(true);
    try {
      const body = { [field]: value };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        await fetchSettings();
        showNotification('Settings updated successfully');
      } else {
        showNotification(resp.message || 'Failed to save setting', true);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to save setting', true);
    } finally {
      setSaving(false);
    }
  }

  async function saveGoogleConfig() {
    setSaving(true);
    setError('');
    try {
      const body = {
        google_client_id: googleClientId.trim(),
        google_client_secret: googleClientSecret.trim()
      };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        showNotification('Google OAuth credentials saved successfully!');
        setShowGoogleConfig(false);
        await fetchSettings();
      } else {
        showNotification(resp.message || 'Failed to save Google credentials', true);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to save Google credentials', true);
    } finally {
      setSaving(false);
    }
  }

  // ---------- Custom Extra Fields ----------
  function addField() {
    if (extraFields.length >= 10) {
      showNotification('Maximum 10 custom fields allowed', true);
      return;
    }
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
      for (const f of extraFields) {
        if (!f.name || !/^[a-zA-Z0-9_]+$/.test(f.name)) {
          showNotification('Each field must have a valid name (letters, numbers, underscore only)', true);
          setSaving(false);
          return;
        }
        if (!f.type) {
          showNotification('Each field must have a type', true);
          setSaving(false);
          return;
        }
      }
      const body = { extra_fields: extraFields, user_edit_permissions: userEditPermissions };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        showNotification('Custom fields configuration saved successfully');
        await fetchSettings();
        setFieldsDirty(false);
      } else {
        showNotification(resp.message || 'Failed to save custom fields', true);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to save custom fields', true);
    } finally {
      setSaving(false);
    }
  }

  async function saveTTL() {
    setSaving(true);
    try {
      const body = { access_token_expires_seconds: accessTokenTTL === '' ? null : parseInt(accessTokenTTL, 10) };
      const resp = await api.put(`/apps/updateApp/${appId}`, body, token);
      if (resp.success) {
        showNotification('Access token TTL saved');
        await fetchSettings();
      } else {
        showNotification(resp.message || 'Failed to save TTL', true);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to save TTL', true);
    } finally {
      setSaving(false);
    }
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Loading application settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Settings — {app.app_name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure authentication providers, token lifetimes, and user profile schemas.
            </p>
          </div>
        </div>
      </div>

      {/* Error & Success Banners */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium flex-1">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium flex-1">{successMsg}</p>
        </div>
      )}

      {/* Grid: Auth Settings & Usage Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Authentication Methods & TTL (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Authentication Methods</h3>
                <p className="text-xs text-slate-500">Enable or disable sign-in mechanisms for your users</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Email / Password Toggle */}
              <div className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                app.allow_email_signin 
                  ? 'bg-indigo-50/40 border-indigo-200/80' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${app.allow_email_signin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Email & Password</h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                      Allow users to register and sign in using standard email and password authentication.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={!!app.allow_email_signin}
                    onChange={(e) => toggle('allow_email_signin', e.target.checked)}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Google OAuth Toggle */}
              <div className={`flex flex-col p-4 rounded-xl border transition-all ${
                app.allow_google_signin 
                  ? 'bg-indigo-50/40 border-indigo-200/80' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${app.allow_google_signin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">Google OAuth Sign-In</h4>
                        {app.google_client_id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            Configured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                        Allow users to securely sign in using their verified Google identity credentials.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={!!app.allow_google_signin}
                        onChange={(e) => toggle('allow_google_signin', e.target.checked)}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Configure Button if enabled */}
                {app.allow_google_signin && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {app.google_client_id ? `Client ID: ${app.google_client_id.slice(0, 24)}...` : 'Credentials not configured'}
                    </span>
                    <button
                      onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shadow-2xs"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {showGoogleConfig ? 'Close Configuration' : 'Configure Credentials'}
                    </button>
                  </div>
                )}
              </div>

              {/* Google OAuth Configuration Drawer / Panel */}
              {showGoogleConfig && app.allow_google_signin && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      Google OAuth Credentials
                    </h4>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Google Cloud Console
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        OAuth 2.0 Client ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                        placeholder="e.g. 123456789-abc123xyz.apps.googleusercontent.com"
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        OAuth 2.0 Client Secret
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                        placeholder="Enter Client Secret"
                        value={googleClientSecret}
                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveGoogleConfig}
                        disabled={saving || !googleClientId.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save Credentials'}
                      </button>
                      <button
                        onClick={() => {
                          setShowGoogleConfig(false);
                          setGoogleClientId(app.google_client_id || '');
                          setGoogleClientSecret(app.google_client_secret || '');
                        }}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900 space-y-1">
                    <p className="font-semibold text-indigo-950">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-indigo-800">
                      <li>Create OAuth 2.0 Web Client credentials in Google Cloud Console</li>
                      <li>Add your authorized JavaScript origins and redirect URIs</li>
                      <li>Paste Client ID and Client Secret above</li>
                      <li>Use the backend endpoint: <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-[11px]">POST /api/v1/:apiKey/auth/google</code></li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Token Lifetime / TTL */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Access Token TTL</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Configure access token validity lifetime (in seconds). Default is 604,800 seconds (7 days).
                </p>
                
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="number"
                    min={60}
                    value={accessTokenTTL === null ? '' : accessTokenTTL}
                    onChange={(e) => setAccessTokenTTL(e.target.value)}
                    placeholder="e.g. 604800 (7 days)"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                  />
                  <button
                    onClick={saveTTL}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                  >
                    Save TTL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: API Usage Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">API Usage Statistics</h3>
                <p className="text-xs text-slate-500">Real-time metrics for this app</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">Total API Calls</span>
                <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                  {(usage?.total_calls || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  Mails This Month
                </span>
                <p className="text-xl font-bold text-emerald-800 mt-1 font-mono">
                  {(usage?.mail_sent_this_month ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Per-Endpoint Usage (Last 30 Days)
              </h4>

              {!usage?.per_endpoint || usage.per_endpoint.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No endpoint activity recorded yet
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {usage.per_endpoint.map((p) => {
                    const pct = usage.total_calls ? Math.round((p.calls / usage.total_calls) * 100) : 0;
                    return (
                      <div key={p.endpoint} className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-colors">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono text-slate-700 font-medium truncate max-w-[180px]" title={p.endpoint}>
                            {p.endpoint}
                          </span>
                          <span className="font-semibold text-slate-900 font-mono">
                            {p.calls.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Width: Custom Extra Fields Builder */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div 
          className="flex items-center justify-between p-6 cursor-pointer select-none bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 transition-colors"
          onClick={() => setShowExtraFieldsPanel(!showExtraFieldsPanel)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Custom User Profile Fields</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                  {extraFields.length} / 10 fields
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Define supplementary schema fields (e.g. phone, address, role) stored with registered users.
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {showExtraFieldsPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showExtraFieldsPanel && (
          <div className="p-6 space-y-6">
            {extraFields.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-sm font-semibold text-slate-700">No Custom Fields Defined</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Extend your user models with custom attributes like department, subscription_tier, or billing address.
                </p>
                <button
                  onClick={addField}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Field
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {extraFields.map((f, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                    <span className="px-2 py-1 text-xs font-mono font-bold bg-white text-slate-500 border border-slate-200 rounded-md">
                      #{idx + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Key Name (code identifier)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. phone_number"
                          value={f.name}
                          onChange={(e) => updateField(idx, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Display Label
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Phone Number"
                          value={f.label || ''}
                          onChange={(e) => updateField(idx, 'label', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Data Type
                        </label>
                        <select
                          value={f.type}
                          onChange={(e) => updateField(idx, 'type', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-medium"
                        >
                          <option value="text">Text (String)</option>
                          <option value="integer">Integer (Number)</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="json">JSON Object</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!f.editable_by_user}
                          onChange={(e) => updateField(idx, 'editable_by_user', e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="text-xs font-medium text-slate-700">Editable by User</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete custom field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Core User Fields Permissions Card */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-semibold text-slate-900">Core Profile Permissions</h4>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Choose whether end-users are allowed to update their core registration attributes directly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Display Name</span>
                    <p className="text-[11px] text-slate-500">Allow updating full name</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!userEditPermissions.name}
                    onChange={(e) => updateCorePermission('name', e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Username</span>
                    <p className="text-[11px] text-slate-500">Allow changing handle</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!userEditPermissions.username}
                    onChange={(e) => updateCorePermission('username', e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Email Address</span>
                    <p className="text-[11px] text-slate-500">Allow updating email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!userEditPermissions.email}
                    onChange={(e) => updateCorePermission('email', e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={addField}
                disabled={extraFields.length >= 10}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs w-full sm:w-auto justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                Add Custom Field
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={async () => {
                    await fetchSettings();
                    setFieldsDirty(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={saveExtraFields}
                  disabled={saving || !fieldsDirty}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>

            {/* Schema Preview */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-2">
                <Code2 className="w-3.5 h-3.5" />
                <span>Current Schema Payload (JSON)</span>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-200 text-xs font-mono rounded-xl overflow-x-auto">
                {JSON.stringify(extraFields, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Saving Indicator Overlay / Floating Toast */}
      {saving && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Saving changes...
        </div>
      )}
    </div>
  );
}