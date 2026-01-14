import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import './GroupSettings.css';

export default function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const token = tokenService.get();

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Group data
  const [group, setGroup] = useState(null);
  const [apps, setApps] = useState([]);

  // OAuth settings
  const [useCommonOAuth, setUseCommonOAuth] = useState(false);
  const [commonClientId, setCommonClientId] = useState('');
  const [commonClientSecret, setCommonClientSecret] = useState('');
  const [showOAuthPanel, setShowOAuthPanel] = useState(false);
  const [selectedAppForOAuth, setSelectedAppForOAuth] = useState('');

  // Extra fields
  const [useCommonExtraFields, setUseCommonExtraFields] = useState(false);
  const [commonExtraFields, setCommonExtraFields] = useState([]);
  const [fieldsDirty, setFieldsDirty] = useState(false);

  // User management
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', username: '' });

  // User filters
  const [filters, setFilters] = useState({
    appId: '',
    email: '',
    name: '',
    loginMethod: '',
    status: '',
    lastLoginFrom: '',
    lastLoginTo: ''
  });

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Bulk operations
  const [bulkOperations, setBulkOperations] = useState([]);

  // Data Management (flexible common vs per-app)
  const [dataManagementSettings, setDataManagementSettings] = useState({
    useCommonUsername: false,
    useCommonName: false,
    useCommonPassword: false,
    useCommonExtraFieldsData: false
  });
  const [conflicts, setConflicts] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentField, setCurrentField] = useState('');

  useEffect(() => {
    fetchGroupSettings();
  }, [groupId]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'bulk-ops') {
      fetchBulkOperations();
    }
  }, [activeTab, userPage, userSearch, filters]);

  async function fetchGroupSettings() {
    setLoading(true);
    try {
      const resp = await api.get(`/group-settings/${groupId}`, token);
      if (resp.success) {
        const { group: groupData, apps: appsData } = resp.data;
        setGroup(groupData);
        setApps(appsData);
        setUseCommonOAuth(groupData.use_common_google_oauth || false);
        setCommonClientId(groupData.common_google_client_id || '');
        setCommonClientSecret(groupData.common_google_client_secret || '');
        setUseCommonExtraFields(groupData.use_common_extra_fields || false);
        setCommonExtraFields(groupData.common_extra_fields || []);
        
        // Load data management settings
        setDataManagementSettings({
          useCommonUsername: groupData.use_common_username || false,
          useCommonName: groupData.use_common_name || false,
          useCommonPassword: groupData.use_common_password || false,
          useCommonExtraFieldsData: groupData.use_common_extra_fields_data || false
        });
      } else {
        setError(resp.message || 'Failed to load group settings');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load group settings');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const params = new URLSearchParams({
        page: userPage,
        limit: 50,
        search: userSearch,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const resp = await api.get(
        `/group-settings/${groupId}/users?${params}`,
        token
      );
      if (resp.success) {
        setUsers(resp.data.users);
        setUserTotal(resp.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load users');
    }
  }

  async function fetchBulkOperations() {
    try {
      const resp = await api.get(`/group-settings/${groupId}/bulk-operations`, token);
      if (resp.success) {
        setBulkOperations(resp.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveOAuthSettings() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = {
        use_common_google_oauth: useCommonOAuth,
        common_google_client_id: commonClientId.trim(),
        common_google_client_secret: commonClientSecret.trim()
      };
      const resp = await api.put(`/group-settings/${groupId}`, body, token);
      if (resp.success) {
        setSuccess('OAuth settings saved successfully!');
        await fetchGroupSettings();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to save OAuth settings');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save OAuth settings');
    } finally {
      setSaving(false);
    }
  }

  async function saveExtraFields() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Validation
      for (const f of commonExtraFields) {
        if (!f.name || !/^[a-zA-Z0-9_]+$/.test(f.name)) {
          setError('Each field must have a valid name (letters, numbers, underscore only)');
          setSaving(false);
          return;
        }
      }

      const body = {
        use_common_extra_fields: useCommonExtraFields,
        common_extra_fields: commonExtraFields
      };
      const resp = await api.put(`/group-settings/${groupId}`, body, token);
      if (resp.success) {
        setSuccess('Extra fields saved successfully!');
        setFieldsDirty(false);
        await fetchGroupSettings();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to save extra fields');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save extra fields');
    } finally {
      setSaving(false);
    }
  }

  async function blockUser(userId, reason = '') {
    try {
      const resp = await api.post(`/group-settings/${groupId}/users/${userId}/block`, { reason }, token);
      if (resp.success) {
        setSuccess('User blocked successfully');
        await fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to block user');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to block user');
    }
  }

  async function unblockUser(userId) {
    try {
      const resp = await api.post(`/group-settings/${groupId}/users/${userId}/unblock`, {}, token);
      if (resp.success) {
        setSuccess('User unblocked successfully');
        await fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to unblock user');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to unblock user');
    }
  }

  async function bulkBlockUsers() {
    if (selectedUsers.length === 0) {
      setError('Please select users to block');
      return;
    }
    if (!window.confirm(`Are you sure you want to block ${selectedUsers.length} user(s)?`)) return;

    setSaving(true);
    try {
      const resp = await api.post(
        `/group-settings/${groupId}/users/bulk-block`,
        { user_ids: selectedUsers },
        token
      );
      if (resp.success) {
        setSuccess(`Blocked ${resp.data.blocked_count} users successfully`);
        setSelectedUsers([]);
        await fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to bulk block users');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to bulk block users');
    } finally {
      setSaving(false);
    }
  }

  async function bulkUnblockUsers() {
    if (selectedUsers.length === 0) {
      setError('Please select users to unblock');
      return;
    }
    if (!window.confirm(`Are you sure you want to unblock ${selectedUsers.length} user(s)?`)) return;

    setSaving(true);
    try {
      const resp = await api.post(
        `/group-settings/${groupId}/users/bulk-unblock`,
        { user_ids: selectedUsers },
        token
      );
      if (resp.success) {
        setSuccess(`Unblocked ${resp.data.unblocked_count} users successfully`);
        setSelectedUsers([]);
        await fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to bulk unblock users');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to bulk unblock users');
    } finally {
      setSaving(false);
    }
  }

  async function addUser() {
    if (!newUser.email) {
      setError('Email is required');
      return;
    }

    setSaving(true);
    try {
      const resp = await api.post(`/group-settings/${groupId}/users`, newUser, token);
      if (resp.success) {
        setSuccess('User added to group successfully');
        setShowAddUserModal(false);
        setNewUser({ email: '', name: '', username: '' });
        await fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to add user');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to add user');
    } finally {
      setSaving(false);
    }
  }

  function addField() {
    if (commonExtraFields.length >= 10) {
      setError('Maximum 10 custom fields allowed');
      return;
    }
    setCommonExtraFields(prev => [...prev, { name: '', label: '', type: 'text', editable_by_user: true }]);
    setFieldsDirty(true);
  }

  function removeField(index) {
    setCommonExtraFields(prev => prev.filter((_, i) => i !== index));
    setFieldsDirty(true);
  }

  function updateField(index, key, value) {
    setCommonExtraFields(prev => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
    setFieldsDirty(true);
  }

  function handleUserSelection(userId) {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  function selectAllUsers() {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  }

  function enableCommonOAuth() {
    if (apps.length === 0) {
      setError('No apps in this group');
      setUseCommonOAuth(false);
      return false;
    }

    // Check if multiple apps have different OAuth credentials
    const uniqueClientIds = [...new Set(apps.map(a => a.google_client_id).filter(Boolean))];
    
    if (uniqueClientIds.length > 1) {
      // Multiple different credentials exist, ask user to choose
      setShowOAuthPanel(false);
      setSelectedAppForOAuth('');
      setCommonClientId('');
      setCommonClientSecret('');
      setUseCommonOAuth(true); // Keep toggle on but require selection
      setError('Multiple OAuth credentials detected. Please select which one to use for all apps.');
      return false; // Don't show main panel yet
    } else if (uniqueClientIds.length === 1) {
      // One credential exists, use it
      setCommonClientId(uniqueClientIds[0]);
      const appWithCreds = apps.find(a => a.google_client_id === uniqueClientIds[0]);
      if (appWithCreds) {
        setCommonClientSecret(appWithCreds.google_client_secret || '');
      }
      setUseCommonOAuth(true);
      setShowOAuthPanel(true);
      setError('');
      return true;
    } else {
      // No credentials, just enable
      setUseCommonOAuth(true);
      setShowOAuthPanel(true);
      setError('');
      return true;
    }
  }

  function selectOAuthFromApp() {
    if (!selectedAppForOAuth) return;
    const selectedApp = apps.find(a => a.id === selectedAppForOAuth);
    if (selectedApp) {
      setCommonClientId(selectedApp.google_client_id || '');
      setCommonClientSecret(selectedApp.google_client_secret || '');
      setShowOAuthPanel(true); // Now show the main config panel
      setError('');
      setSuccess('Credentials selected! You can now save or modify them.');
      setTimeout(() => setSuccess(''), 3000);
    }
  }
  async function deleteExtraFieldData() {
    try {
      const resp = await api.delete(`/group-settings/${groupId}/extra-field-data`, {}, token);
      if (resp.success) {
        setSuccess(`Deleted extra field data for ${resp.data.deletedCount} users`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to delete extra field data');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete extra field data');
    }
  }

  function clearFilters() {
    setFilters({
      appId: '',
      email: '',
      name: '',
      loginMethod: '',
      status: '',
      lastLoginFrom: '',
      lastLoginTo: ''
    });
    setUserPage(1);
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setUserPage(1);
  }

  async function exportUsersToCSV() {
    try {
      setLoading(true);
      // Fetch ALL users with current filters (no pagination)
      const params = new URLSearchParams({
        page: 1,
        limit: 999999,
        search: userSearch,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const resp = await api.get(`/group-settings/${groupId}/users?${params}`, token);
      if (!resp.success) {
        setError('Failed to export users');
        return;
      }

      const allUsers = resp.data.users;
      
      // Build CSV content (excluding password)
      const headers = ['ID', 'Email', 'Name', 'Username', 'App', 'Login Method', 'Email Verified', 'Status', 'Last Login', 'Created At'];
      const csvRows = [headers.join(',')];

      allUsers.forEach(user => {
        const status = user.group_blocked || user.app_blocked ? 'Blocked' : 'Active';
        const row = [
          user.id,
          `\"${user.email || ''}\"`,
          `\"${user.name || ''}\"`,
          `\"${user.username || ''}\"`,
          `\"${user.app_name || ''}\"`,
          user.login_method || 'email',
          user.email_verified ? 'Yes' : 'No',
          status,
          user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
          new Date(user.created_at).toLocaleString()
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `group_${groupId}_users_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Exported ${allUsers.length} users to CSV`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to export users');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmAction() {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  }

  function handleCancelAction() {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  }

  // Data Management Functions
  async function detectConflicts(field) {
    try {
      setLoading(true);
      const resp = await api.get(
        `/group-settings/${groupId}/common-mode-conflicts?field=${field}`,
        token
      );
      if (resp.success) {
        setConflicts(resp.data.conflicts);
        setCurrentField(field);
        if (resp.data.has_conflicts && field !== 'password') {
          setShowConflictModal(true);
        } else if (field === 'password') {
          // For password, just confirm that emails will be sent
          setConfirmMessage(
            `Enabling common password will send password reset emails to ${
              resp.data.conflicts.find(c => c.field === 'password')?.conflicts.length || 0
            } users. Continue?`
          );
          setConfirmAction(() => () => enableCommonModeWithResolutions(field, {}));
          setShowConfirmModal(true);
        } else {
          // No conflicts, enable directly
          await enableCommonModeWithResolutions(field, {});
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to check for conflicts');
    } finally {
      setLoading(false);
    }
  }

  async function enableCommonModeWithResolutions(field, resolutionsData) {
    try {
      setSaving(true);
      const resp = await api.post(
        `/group-settings/${groupId}/enable-common-mode`,
        { field, resolutions: resolutionsData },
        token
      );
      if (resp.success) {
        setSuccess(`Common ${field} mode enabled successfully!`);
        await fetchGroupSettings();
        setShowConflictModal(false);
        setResolutions({});
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(resp.message || 'Failed to enable common mode');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to enable common mode');
    } finally {
      setSaving(false);
    }
  }

  async function disableCommonModeWithConfirmation(field) {
    setConfirmMessage(
      `Disabling common ${field} will copy the current common value to each app's user records. Continue?`
    );
    setConfirmAction(() => async () => {
      try {
        setSaving(true);
        const resp = await api.post(
          `/group-settings/${groupId}/disable-common-mode`,
          { field },
          token
        );
        if (resp.success) {
          setSuccess(resp.message);
          await fetchGroupSettings();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(resp.message || 'Failed to disable common mode');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to disable common mode');
      } finally {
        setSaving(false);
      }
    });
    setShowConfirmModal(true);
  }

  function handleDataManagementToggle(field, enabled) {
    if (enabled) {
      // Enabling - check for conflicts first
      detectConflicts(field);
    } else {
      // Disabling - show confirmation
      disableCommonModeWithConfirmation(field);
    }
  }

  if (loading) {
    return <div className="group-settings-loading">Loading group settings...</div>;
  }

  if (!group) {
    return <div className="group-settings-error">Group not found</div>;
  }

  return (
    <div className="group-settings">
      {/* Header */}
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/groups')}>
          ← Back to Groups
        </button>
        <h1 className="settings-title">{group.name} - Group Settings</h1>
        <div className="group-stats">
          <span className="stat-badge">📱 {group.app_count} Apps</span>
          <span className="stat-badge">👥 {group.total_users} Users</span>
          <span className="stat-badge blocked">🚫 {group.blocked_users_count} Blocked</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          ✓ {success}
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          🏠 General
        </button>
        <button
          className={`tab ${activeTab === 'oauth' ? 'active' : ''}`}
          onClick={() => setActiveTab('oauth')}
        >
          🔐 OAuth
        </button>
        <button
          className={`tab ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          📋 Extra Fields
        </button>
        <button
          className={`tab ${activeTab === 'data-mgmt' ? 'active' : ''}`}
          onClick={() => setActiveTab('data-mgmt')}
        >
          🔄 Data Management
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab ${activeTab === 'bulk-ops' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk-ops')}
        >
          ⚡ Bulk Operations
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="general-tab">
            <h2>Group Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Group Name:</span>
                <span className="value">{group.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Created:</span>
                <span className="value">{new Date(group.created_at).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="label">Total Apps:</span>
                <span className="value">{group.app_count}</span>
              </div>
              <div className="info-item">
                <span className="label">Total Users:</span>
                <span className="value">{group.total_users}</span>
              </div>
            </div>

            <h2>Apps in This Group</h2>
            {apps.length === 0 ? (
              <p className="no-data">No apps in this group yet.</p>
            ) : (
              <div className="apps-list">
                {apps.map(app => (
                  <div key={app.id} className="app-item">
                    <span className="app-name">📱 {app.app_name}</span>
                    <span className="app-oauth">
                      {app.allow_google_signin && app.google_client_id ? '🔐 OAuth Configured' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OAuth Tab */}
        {activeTab === 'oauth' && (
          <div className="oauth-tab">
            <h2>Shared Google OAuth Credentials</h2>
            <p className="tab-description">
              Enable this to use the same Google OAuth credentials for all apps in this group.
            </p>

            <div className="oauth-toggle-section">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={useCommonOAuth}
                  onChange={(e) => {
                    if (e.target.checked) {
                      enableCommonOAuth();
                    } else {
                      // Show confirmation before disabling
                      setConfirmMessage('Disabling common OAuth will remove the shared credentials. You will need to configure OAuth separately for each app in their individual app settings. Continue?');
                      setConfirmAction(() => async () => {
                        setUseCommonOAuth(false);
                        setShowOAuthPanel(false);
                        setCommonClientId('');
                        setCommonClientSecret('');
                        // Save the change immediately
                        setSaving(true);
                        try {
                          const body = {
                            use_common_google_oauth: false,
                            common_google_client_id: '',
                            common_google_client_secret: ''
                          };
                          const resp = await api.put(`/group-settings/${groupId}`, body, token);
                          if (resp.success) {
                            setSuccess('Common OAuth disabled. Configure OAuth per app in their settings.');
                            await fetchGroupSettings();
                            setTimeout(() => setSuccess(''), 4000);
                          } else {
                            setError(resp.message || 'Failed to disable OAuth');
                          }
                        } catch (err) {
                          console.error(err);
                          setError('Failed to disable common OAuth');
                        } finally {
                          setSaving(false);
                        }
                      });
                      setShowConfirmModal(true);
                    }
                  }}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Use Common OAuth for All Apps</span>
              </label>
            </div>

            {useCommonOAuth && (
              <>
                {/* Show app selector if multiple credentials exist and none selected yet */}
                {(() => {
                  const appsWithOAuth = apps.filter(a => a.google_client_id);
                  const uniqueClientIds = [...new Set(appsWithOAuth.map(a => a.google_client_id))];
                  return uniqueClientIds.length > 1 && !commonClientId;
                })() && (
                  <div className="oauth-selector">
                    <h3>⚠️ Multiple OAuth Credentials Detected</h3>
                    <p className="selector-info">
                      Your apps in this group are using different OAuth credentials. 
                      Please select which credentials should be used for all apps:
                    </p>
                    <select
                      value={selectedAppForOAuth}
                      onChange={(e) => setSelectedAppForOAuth(e.target.value)}
                      className="app-select"
                    >
                      <option value="">-- Choose which credentials to keep --</option>
                      {apps
                        .filter(a => a.google_client_id)
                        .map(app => (
                          <option key={app.id} value={app.id}>
                            {app.app_name} (Client ID: {app.google_client_id.substring(0, 30)}...)
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn-primary"
                      onClick={selectOAuthFromApp}
                      disabled={!selectedAppForOAuth}
                    >
                      ✓ Use These Credentials for All Apps
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setUseCommonOAuth(false);
                        setShowOAuthPanel(false);
                        setSelectedAppForOAuth('');
                        setError('');
                      }}
                      style={{ marginLeft: '0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {showOAuthPanel && (
                  <div className="oauth-config-panel">
                    <h3>Google OAuth Configuration</h3>
                    <p className="config-info">
                      Get credentials from{' '}
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                        Google Cloud Console
                      </a>
                    </p>

                    <div className="config-field">
                      <label>Client ID</label>
                      <input
                        type="text"
                        value={commonClientId}
                        onChange={(e) => setCommonClientId(e.target.value)}
                        placeholder="e.g., 123456789-abc123.apps.googleusercontent.com"
                        className="config-input"
                      />
                    </div>

                    <div className="config-field">
                      <label>Client Secret</label>
                      <input
                        type="password"
                        value={commonClientSecret}
                        onChange={(e) => setCommonClientSecret(e.target.value)}
                        placeholder="Enter your Google OAuth Client Secret"
                        className="config-input"
                      />
                    </div>

                    <div className="config-actions">
                      <button
                        className="btn-primary"
                        onClick={saveOAuthSettings}
                        disabled={saving || !commonClientId.trim()}
                      >
                        {saving ? '💾 Saving...' : '✓ Save & Apply to All Apps'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setUseCommonOAuth(false);
                          setShowOAuthPanel(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="config-note">
                      <strong>⚠️ Important:</strong>
                      <p>
                        Saving these credentials will update ALL apps in this group to use the same OAuth settings.
                        This cannot be undone automatically.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Extra Fields Tab */}
        {activeTab === 'fields' && (
          <div className="fields-tab">
            <h2>Common Extra Fields</h2>
            <p className="tab-description">
              Define extra user fields that will be shared across all apps in this group.
              <br />
              <strong>Note:</strong> Enabling common extra fields will ADD these fields to all apps without deleting existing data. Only disabling will delete the extra field data.
            </p>

            <div className="fields-toggle-section">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={useCommonExtraFields}
                  onChange={(e) => {
                    if (!e.target.checked && useCommonExtraFields) {
                      // Disabling - show confirmation
                      setConfirmMessage(
                        'Disabling common extra fields will permanently delete ALL extra field data for users in this group. This action cannot be undone. Are you sure?'
                      );
                      setConfirmAction(() => async () => {
                        await deleteExtraFieldData();
                        setUseCommonExtraFields(false);
                        setCommonExtraFields([]);
                        setFieldsDirty(true);
                      });
                      setShowConfirmModal(true);
                    } else {
                      setUseCommonExtraFields(e.target.checked);
                      setFieldsDirty(true);
                    }
                  }}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Use Common Extra Fields for All Apps</span>
              </label>
            </div>

            {useCommonExtraFields && (
              <>
                <div className="fields-header">
                  <span className="fields-count">{commonExtraFields.length} / 10 fields</span>
                  <button className="btn-secondary" onClick={addField} disabled={commonExtraFields.length >= 10}>
                    + Add Field
                  </button>
                </div>

                {commonExtraFields.length === 0 ? (
                  <p className="no-data">No custom fields defined yet.</p>
                ) : (
                  <div className="fields-grid">
                    {commonExtraFields.map((f, idx) => (
                      <div className="field-row" key={idx}>
                        <input
                          className="field-input name"
                          placeholder="field_name"
                          value={f.name}
                          onChange={(e) => updateField(idx, 'name', e.target.value)}
                        />
                        <input
                          className="field-input label"
                          placeholder="Label (optional)"
                          value={f.label || ''}
                          onChange={(e) => updateField(idx, 'label', e.target.value)}
                        />
                        <select
                          className="field-select"
                          value={f.type}
                          onChange={(e) => updateField(idx, 'type', e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="integer">Integer</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="json">JSON</option>
                        </select>
                        <label className="field-checkbox">
                          <input
                            type="checkbox"
                            checked={!!f.editable_by_user}
                            onChange={(e) => updateField(idx, 'editable_by_user', e.target.checked)}
                          />
                          Editable
                        </label>
                        <button className="btn-danger small" onClick={() => removeField(idx)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fields-actions">
                  <button className="btn-primary" onClick={saveExtraFields} disabled={saving || !fieldsDirty}>
                    {saving ? '💾 Saving...' : '✓ Save & Apply to All Apps'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      fetchGroupSettings();
                      setFieldsDirty(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data-mgmt' && (
          <div className="data-mgmt-tab">
            <h2>Flexible User Data Management</h2>
            <p className="tab-description">
              Choose whether users share the same username, name, password, and extra field values 
              across all apps in this group, or have different values for each app.
            </p>

            <div className="data-mgmt-grid">
              {/* Username Setting */}
              <div className="data-mgmt-card">
                <div className="card-header">
                  <h3>👤 Username</h3>
                  <label className="toggle-container-small">
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonUsername}
                      onChange={(e) => handleDataManagementToggle('username', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <p className="card-description">
                  {dataManagementSettings.useCommonUsername ? (
                    <>✓ Users have the <strong>same username</strong> across all apps in this group</>
                  ) : (
                    <>Users can have <strong>different usernames</strong> for each app</>
                  )}
                </p>
              </div>

              {/* Name Setting */}
              <div className="data-mgmt-card">
                <div className="card-header">
                  <h3>📝 Name</h3>
                  <label className="toggle-container-small">
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonName}
                      onChange={(e) => handleDataManagementToggle('name', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <p className="card-description">
                  {dataManagementSettings.useCommonName ? (
                    <>✓ Users have the <strong>same name</strong> across all apps in this group</>
                  ) : (
                    <>Users can have <strong>different names</strong> for each app</>
                  )}
                </p>
              </div>

              {/* Password Setting */}
              <div className="data-mgmt-card">
                <div className="card-header">
                  <h3>🔑 Password</h3>
                  <label className="toggle-container-small">
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonPassword}
                      onChange={(e) => handleDataManagementToggle('password', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <p className="card-description">
                  {dataManagementSettings.useCommonPassword ? (
                    <>✓ Users have the <strong>same password</strong> across all apps in this group</>
                  ) : (
                    <>Users can have <strong>different passwords</strong> for each app</>
                  )}
                </p>
                {dataManagementSettings.useCommonPassword && (
                  <div className="card-note">
                    <strong>Note:</strong> Users with multiple app accounts will receive an email to set a common password.
                  </div>
                )}
              </div>

              {/* Extra Fields Data Setting */}
              <div className="data-mgmt-card">
                <div className="card-header">
                  <h3>📋 Extra Fields Data</h3>
                  <label className="toggle-container-small">
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonExtraFieldsData}
                      onChange={(e) => handleDataManagementToggle('extra_fields_data', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider-small"></span>
                  </label>
                </div>
                <p className="card-description">
                  {dataManagementSettings.useCommonExtraFieldsData ? (
                    <>✓ Users have the <strong>same extra field values</strong> across all apps</>
                  ) : (
                    <>Users can have <strong>different extra field values</strong> for each app</>
                  )}
                </p>
              </div>
            </div>

            <div className="data-mgmt-info">
              <h3>ℹ️ How It Works</h3>
              <ul>
                <li>
                  <strong>Common Mode (Enabled):</strong> When a user registers or logs into any app in this group, 
                  their data is shared across all apps. If conflicts exist (e.g., different usernames), you'll be 
                  asked to choose which value to keep.
                </li>
                <li>
                  <strong>Per-App Mode (Disabled):</strong> Each app maintains its own user data. Users can have 
                  different usernames, names, or passwords for each app (same email).
                </li>
                <li>
                  <strong>Password Syncing:</strong> Enabling common password will send email notifications to users 
                  who are registered in multiple apps, asking them to set a unified password.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <h2>User Management</h2>
              <div className="users-actions">
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 Search users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                />
                <button className="btn-secondary" onClick={exportUsersToCSV}>
                  📥 Export CSV
                </button>
                <button className="btn-primary" onClick={() => setShowAddUserModal(true)}>
                  + Add User
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            <div className="filters-panel">
              <div className="filters-header">
                <h3>🔍 Filters</h3>
                <button className="btn-ghost small" onClick={clearFilters}>
                  Clear All
                </button>
              </div>
              <div className="filters-grid">
                <div className="filter-item">
                  <label>App</label>
                  <select
                    value={filters.appId}
                    onChange={(e) => updateFilter('appId', e.target.value)}
                  >
                    <option value="">All Apps</option>
                    {apps.map(app => (
                      <option key={app.id} value={app.id}>{app.app_name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Email Contains</label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={filters.email}
                    onChange={(e) => updateFilter('email', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label>Name Contains</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={filters.name}
                    onChange={(e) => updateFilter('name', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label>Login Method</label>
                  <select
                    value={filters.loginMethod}
                    onChange={(e) => updateFilter('loginMethod', e.target.value)}
                  >
                    <option value="">All Methods</option>
                    <option value="email">Email/Password</option>
                    <option value="google">Google OAuth</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="verified">Email Verified</option>
                    <option value="unverified">Email Unverified</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Last Login From</label>
                  <input
                    type="date"
                    value={filters.lastLoginFrom}
                    onChange={(e) => updateFilter('lastLoginFrom', e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label>Last Login To</label>
                  <input
                    type="date"
                    value={filters.lastLoginTo}
                    onChange={(e) => updateFilter('lastLoginTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="bulk-actions-bar">
                <span>{selectedUsers.length} user(s) selected</span>
                <div className="bulk-btns">
                  <button className="btn-danger" onClick={bulkBlockUsers} disabled={saving}>
                    🚫 Block Selected
                  </button>
                  <button className="btn-success" onClick={bulkUnblockUsers} disabled={saving}>
                    ✓ Unblock Selected
                  </button>
                  <button className="btn-ghost" onClick={() => setSelectedUsers([])}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" onChange={selectAllUsers} checked={selectedUsers.length === users.length && users.length > 0} />
                    </th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>App</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className={user.group_blocked ? 'blocked-row' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleUserSelection(user.id)}
                          />
                        </td>
                        <td>{user.email}</td>
                        <td>{user.name || '—'}</td>
                        <td>{user.app_name}</td>
                        <td>
                          {user.group_blocked ? (
                            <span className="status-badge blocked">🚫 Blocked</span>
                          ) : user.app_blocked ? (
                            <span className="status-badge app-blocked">⚠️ App Blocked</span>
                          ) : (
                            <span className="status-badge active">✓ Active</span>
                          )}
                        </td>
                        <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : '—'}</td>
                        <td>
                          {user.group_blocked ? (
                            <button className="btn-success small" onClick={() => unblockUser(user.id)}>
                              Unblock
                            </button>
                          ) : (
                            <button
                              className="btn-danger small"
                              onClick={() => {
                                const reason = window.prompt('Reason for blocking (optional):');
                                if (reason !== null) blockUser(user.id, reason);
                              }}
                            >
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {userTotal > 50 && (
              <div className="pagination">
                <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}>
                  Previous
                </button>
                <span>
                  Page {userPage} of {Math.ceil(userTotal / 50)}
                </span>
                <button onClick={() => setUserPage(p => p + 1)} disabled={userPage >= Math.ceil(userTotal / 50)}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Operations Tab */}
        {activeTab === 'bulk-ops' && (
          <div className="bulk-ops-tab">
            <h2>Bulk Operations History</h2>
            <p className="tab-description">View history of bulk operations performed on this group.</p>

            {bulkOperations.length === 0 ? (
              <p className="no-data">No bulk operations performed yet.</p>
            ) : (
              <div className="bulk-ops-list">
                {bulkOperations.map(op => (
                  <div key={op.id} className={`bulk-op-item ${op.status}`}>
                    <div className="op-header">
                      <span className="op-type">{op.operation_type.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={`op-status ${op.status}`}>{op.status}</span>
                    </div>
                    <div className="op-details">
                      <span>Target Count: {op.target_count}</span>
                      <span>Created: {new Date(op.created_at).toLocaleString()}</span>
                      {op.completed_at && <span>Completed: {new Date(op.completed_at).toLocaleString()}</span>}
                    </div>
                    {op.error_message && <div className="op-error">Error: {op.error_message}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add User to Group</h3>
              <button onClick={() => setShowAddUserModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-field">
                <label>Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-field">
                <label>Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>
              <p className="modal-note">
                ℹ️ This will create the user in all apps within this group.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={addUser} disabled={saving || !newUser.email}>
                {saving ? 'Adding...' : 'Add User'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelAction}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Action</h2>
              <button className="modal-close" onClick={handleCancelAction}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">{confirmMessage}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={handleConfirmAction}>
                Yes, Delete Data
              </button>
              <button className="btn-secondary" onClick={handleCancelAction}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
          <div className="modal-content conflict-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔄 Resolve Data Conflicts</h2>
              <button className="modal-close" onClick={() => setShowConflictModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Multiple values found for <strong>{currentField}</strong>. 
                Please select which value to use for each user:
              </p>
              {conflicts.map((conflictGroup) => (
                <div key={conflictGroup.field} className="conflict-group">
                  <h4>{conflictGroup.field}</h4>
                  {conflictGroup.conflicts.map((conflict, idx) => (
                    <div key={idx} className="conflict-item">
                      <div className="conflict-email">
                        📧 <strong>{conflict.email}</strong>
                      </div>
                      <div className="conflict-options">
                        {(conflictGroup.field === 'username' ? conflict.usernames : conflict.names).map((value, vIdx) => (
                          <label key={vIdx} className="conflict-option">
                            <input
                              type="radio"
                              name={`${conflictGroup.field}-${conflict.email}`}
                              value={value}
                              checked={resolutions[conflict.email] === value}
                              onChange={(e) => setResolutions(prev => ({
                                ...prev,
                                [conflict.email]: e.target.value
                              }))}
                            />
                            <span className="option-value">{value}</span>
                          </label>
                        ))}
                      </div>
                      <div className="conflict-apps">
                        <small>Apps: {conflict.apps.join(', ')}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary" 
                onClick={() => enableCommonModeWithResolutions(currentField, resolutions)}
                disabled={Object.keys(resolutions).length === 0}
              >
                ✓ Apply Selected Values
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowConflictModal(false);
                  setResolutions({});
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && <div className="saving-indicator">💾 Processing...</div>}
    </div>
  );
}
