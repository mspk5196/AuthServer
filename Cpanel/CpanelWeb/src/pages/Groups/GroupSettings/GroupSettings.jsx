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

  // Bulk operations
  const [bulkOperations, setBulkOperations] = useState([]);

  useEffect(() => {
    fetchGroupSettings();
  }, [groupId]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'bulk-ops') {
      fetchBulkOperations();
    }
  }, [activeTab, userPage, userSearch]);

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
      const resp = await api.get(
        `/group-settings/${groupId}/users?page=${userPage}&limit=50&search=${userSearch}`,
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
      return;
    }

    // Check if multiple apps have different OAuth credentials
    const uniqueClientIds = [...new Set(apps.map(a => a.google_client_id).filter(Boolean))];
    
    if (uniqueClientIds.length > 1) {
      // Multiple different credentials exist, ask user to choose
      setShowOAuthPanel(true);
      setSelectedAppForOAuth('');
      setError('Multiple OAuth credentials detected. Please select which one to use for all apps.');
    } else if (uniqueClientIds.length === 1) {
      // One credential exists, use it
      setCommonClientId(uniqueClientIds[0]);
      const appWithCreds = apps.find(a => a.google_client_id === uniqueClientIds[0]);
      if (appWithCreds) {
        setCommonClientSecret(appWithCreds.google_client_secret || '');
      }
      setUseCommonOAuth(true);
      setShowOAuthPanel(true);
    } else {
      // No credentials, just enable
      setUseCommonOAuth(true);
      setShowOAuthPanel(true);
    }
  }

  function selectOAuthFromApp() {
    if (!selectedAppForOAuth) return;
    const selectedApp = apps.find(a => a.id === selectedAppForOAuth);
    if (selectedApp) {
      setCommonClientId(selectedApp.google_client_id || '');
      setCommonClientSecret(selectedApp.google_client_secret || '');
      setError('');
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
        <h1 className="settings-title">⚙️ {group.name} - Group Settings</h1>
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
                      setUseCommonOAuth(false);
                      setShowOAuthPanel(false);
                    }
                  }}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Use Common OAuth for All Apps</span>
              </label>
            </div>

            {useCommonOAuth && (
              <>
                {/* Show app selector if multiple credentials exist */}
                {apps.filter(a => a.google_client_id).length > 1 && !commonClientId && (
                  <div className="oauth-selector">
                    <h3>Select OAuth Credentials to Use</h3>
                    <select
                      value={selectedAppForOAuth}
                      onChange={(e) => setSelectedAppForOAuth(e.target.value)}
                      className="app-select"
                    >
                      <option value="">-- Choose an app --</option>
                      {apps
                        .filter(a => a.google_client_id)
                        .map(app => (
                          <option key={app.id} value={app.id}>
                            {app.app_name} ({app.google_client_id.substring(0, 20)}...)
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn-primary"
                      onClick={selectOAuthFromApp}
                      disabled={!selectedAppForOAuth}
                    >
                      Use Selected Credentials
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
            </p>

            <div className="fields-toggle-section">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={useCommonExtraFields}
                  onChange={(e) => {
                    setUseCommonExtraFields(e.target.checked);
                    setFieldsDirty(true);
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
                <button className="btn-primary" onClick={() => setShowAddUserModal(true)}>
                  + Add User
                </button>
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

      {saving && <div className="saving-indicator">💾 Processing...</div>}
    </div>
  );
}
