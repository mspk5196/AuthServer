import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import { 
  FolderKanban, 
  ArrowLeft, 
  Settings, 
  KeyRound, 
  Layers, 
  RefreshCw, 
  Users, 
  Zap, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  ShieldAlert, 
  Lock, 
  UserPlus,
  Search,
  Filter,
  Calendar,
  Smartphone,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

  // Data Management
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
        setApps(appsData || []);
        setUseCommonOAuth(groupData.use_common_google_oauth || false);
        setCommonClientId(groupData.common_google_client_id || '');
        setCommonClientSecret(groupData.common_google_client_secret || '');
        setUseCommonExtraFields(groupData.use_common_extra_fields || false);
        setCommonExtraFields(groupData.common_extra_fields || []);
        
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
      
      const resp = await api.get(`/group-settings/${groupId}/users?${params}`, token);
      if (resp.success) {
        setUsers(resp.data.users || []);
        setUserTotal(resp.data.pagination.total || 0);
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
        setBulkOperations(resp.data || []);
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

    const uniqueClientIds = [...new Set(apps.map(a => a.google_client_id).filter(Boolean))];
    
    if (uniqueClientIds.length > 1) {
      setShowOAuthPanel(false);
      setSelectedAppForOAuth('');
      setCommonClientId('');
      setCommonClientSecret('');
      setUseCommonOAuth(true);
      setError('Multiple OAuth credentials detected. Please select which one to use for all apps.');
      return false;
    } else if (uniqueClientIds.length === 1) {
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
      setShowOAuthPanel(true);
      setError('');
      setSuccess('Credentials selected! You can now save or modify them.');
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function deleteExtraFieldData() {
    try {
      const resp = await api.delete(`/group-settings/${groupId}/extra-field-data`, token);
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

      const allUsers = resp.data.users || [];
      const headers = ['ID', 'Email', 'Name', 'Username', 'App', 'Login Method', 'Email Verified', 'Status', 'Last Login', 'Created At'];
      const csvRows = [headers.join(',')];

      allUsers.forEach(user => {
        const status = user.group_blocked || user.app_blocked ? 'Blocked' : 'Active';
        const row = [
          user.id,
          `"${user.email || ''}"`,
          `"${user.name || ''}"`,
          `"${user.username || ''}"`,
          `"${user.app_name || ''}"`,
          user.login_method || 'email',
          user.email_verified ? 'Yes' : 'No',
          status,
          user.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
          new Date(user.created_at).toLocaleString()
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
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
        setConflicts(resp.data.conflicts || []);
        setCurrentField(field);
        if (resp.data.has_conflicts && field !== 'password') {
          setShowConflictModal(true);
        } else if (field === 'password') {
          const passConflicts = resp.data.conflicts.find(c => c.field === 'password')?.conflicts || [];
          setConfirmMessage(
            `Enabling common password will send password reset emails to ${passConflicts.length} users. Continue?`
          );
          setConfirmAction(() => () => enableCommonModeWithResolutions(field, {}));
          setShowConfirmModal(true);
        } else {
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
      detectConflicts(field);
    } else {
      disableCommonModeWithConfirmation(field);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Loading group settings...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Group Not Found</h3>
        <p className="text-xs text-slate-500">The requested application group does not exist.</p>
        <button
          onClick={() => navigate('/groups')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
        >
          Return to Groups
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: FolderKanban },
    { id: 'oauth', label: 'OAuth', icon: KeyRound },
    { id: 'fields', label: 'Extra Fields', icon: Layers },
    { id: 'data-mgmt', label: 'Data Management', icon: RefreshCw },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'bulk-ops', label: 'Bulk Operations', icon: Zap },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/groups')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Groups"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FolderKanban className="w-6 h-6 text-indigo-600" />
              {group.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Group ID: {group.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            {group.app_count} Apps
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            {group.total_users} Users
          </span>
          {group.blocked_users_count > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              {group.blocked_users_count} Blocked
            </span>
          )}
        </div>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}
      <div className="space-y-6">
        
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
                Group Overview
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Group Name</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{group.name}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Created Date</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Associated Applications</span>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{group.app_count}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium">Total Registered Users</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">{group.total_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
                Member Applications ({apps.length})
              </h3>

              {apps.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No applications assigned to this group yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{app.app_name}</p>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {app.id.slice(0, 8)}...</span>
                        </div>
                      </div>

                      {app.allow_google_signin && app.google_client_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          OAuth Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                          Standard
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. OAUTH TAB */}
        {activeTab === 'oauth' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Shared Google OAuth Configuration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Share a single Google OAuth 2.0 Web Client configuration across all applications in this group.
              </p>
            </div>

            {/* Toggle switch */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Enable Group-Wide Common OAuth</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, all member apps inherit these credentials for Google sign-in.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={useCommonOAuth}
                  onChange={(e) => {
                    if (e.target.checked) {
                      enableCommonOAuth();
                    } else {
                      setConfirmMessage('Disabling common OAuth will clear the shared credentials from this group. Individual app settings will apply. Continue?');
                      setConfirmAction(() => async () => {
                        setUseCommonOAuth(false);
                        setShowOAuthPanel(false);
                        setCommonClientId('');
                        setCommonClientSecret('');
                        setSaving(true);
                        try {
                          const body = {
                            use_common_google_oauth: false,
                            common_google_client_id: '',
                            common_google_client_secret: ''
                          };
                          const resp = await api.put(`/group-settings/${groupId}`, body, token);
                          if (resp.success) {
                            setSuccess('Common OAuth disabled successfully');
                            await fetchGroupSettings();
                            setTimeout(() => setSuccess(''), 3000);
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
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {useCommonOAuth && (
              <div className="space-y-4 pt-2">
                {/* Conflict selector if multiple credentials */}
                {(() => {
                  const appsWithOAuth = apps.filter(a => a.google_client_id);
                  const uniqueClientIds = [...new Set(appsWithOAuth.map(a => a.google_client_id))];
                  return uniqueClientIds.length > 1 && !commonClientId;
                })() && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Multiple OAuth Credentials Detected
                    </div>
                    <p className="text-xs text-amber-800">
                      Member apps in this group currently have different credentials. Choose which app's credentials to adopt group-wide:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={selectedAppForOAuth}
                        onChange={(e) => setSelectedAppForOAuth(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white text-slate-800 outline-hidden"
                      >
                        <option value="">-- Select credentials to keep --</option>
                        {apps.filter(a => a.google_client_id).map(app => (
                          <option key={app.id} value={app.id}>
                            {app.app_name} ({app.google_client_id.slice(0, 24)}...)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={selectOAuthFromApp}
                        disabled={!selectedAppForOAuth}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        Adopt Credentials
                      </button>
                      <button
                        onClick={() => {
                          setUseCommonOAuth(false);
                          setShowOAuthPanel(false);
                          setSelectedAppForOAuth('');
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showOAuthPanel && (
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-indigo-600" />
                        Common Credentials
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
                          value={commonClientId}
                          onChange={(e) => setCommonClientId(e.target.value)}
                          placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          OAuth 2.0 Client Secret
                        </label>
                        <input
                          type="password"
                          value={commonClientSecret}
                          onChange={(e) => setCommonClientSecret(e.target.value)}
                          placeholder="Enter Client Secret"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={saveOAuthSettings}
                        disabled={saving || !commonClientId.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save & Apply to All Member Apps'}
                      </button>
                      <button
                        onClick={() => {
                          setShowOAuthPanel(false);
                          setUseCommonOAuth(false);
                        }}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. EXTRA FIELDS TAB */}
        {activeTab === 'fields' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Group-Wide Custom Extra Fields</h3>
              <p className="text-xs text-slate-500 mt-1">
                Define shared user profile schema fields synced across all member applications.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Use Common Extra Fields for All Apps</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronize profile attribute definitions across all apps in this group.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={useCommonExtraFields}
                  onChange={(e) => {
                    if (!e.target.checked && useCommonExtraFields) {
                      setConfirmMessage('Disabling common extra fields will delete shared field schema data for this group. Are you sure?');
                      setConfirmAction(() => async () => {
                        try {
                          setSaving(true);
                          await deleteExtraFieldData();
                          const body = { use_common_extra_fields: false, common_extra_fields: [] };
                          const resp = await api.put(`/group-settings/${groupId}`, body, token);
                          if (resp.success) {
                            setUseCommonExtraFields(false);
                            setCommonExtraFields([]);
                            setFieldsDirty(false);
                            setSuccess('Common extra fields disabled');
                            await fetchGroupSettings();
                            setTimeout(() => setSuccess(''), 3000);
                          } else {
                            setError(resp.message || 'Failed to disable common extra fields');
                          }
                        } catch (err) {
                          console.error(err);
                          setError('Failed to disable common extra fields');
                        } finally {
                          setSaving(false);
                        }
                      });
                      setShowConfirmModal(true);
                    } else {
                      setUseCommonExtraFields(e.target.checked);
                      setFieldsDirty(true);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {useCommonExtraFields && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                    {commonExtraFields.length} / 10 fields defined
                  </span>
                  <button
                    onClick={addField}
                    disabled={commonExtraFields.length >= 10}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Shared Field
                  </button>
                </div>

                {commonExtraFields.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                    <p className="text-sm font-semibold text-slate-700">No Shared Fields Defined</p>
                    <p className="text-xs text-slate-400">Click "Add Shared Field" above to configure your schema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commonExtraFields.map((f, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="px-2 py-1 text-xs font-mono font-bold bg-white text-slate-500 border border-slate-200 rounded-md">
                          #{idx + 1}
                        </span>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                              Key Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. employee_id"
                              value={f.name}
                              onChange={(e) => updateField(idx, 'name', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white text-slate-900 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                              Display Label
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Employee ID"
                              value={f.label || ''}
                              onChange={(e) => updateField(idx, 'label', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                              Data Type
                            </label>
                            <select
                              value={f.type}
                              onChange={(e) => updateField(idx, 'type', e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white text-slate-900"
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
                            <span className="text-xs font-medium text-slate-700">Editable</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => removeField(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      fetchGroupSettings();
                      setFieldsDirty(false);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={saveExtraFields}
                    disabled={saving || !fieldsDirty}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save & Sync Schema'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. DATA MANAGEMENT TAB */}
        {activeTab === 'data-mgmt' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Synchronized User Data Management</h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure whether user attributes (username, display name, password) are unified across member apps or managed independently per-app.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Username Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">👤</span>
                      Username
                    </h4>
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonUsername}
                      onChange={(e) => handleDataManagementToggle('username', e.target.checked)}
                      disabled={saving}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    {dataManagementSettings.useCommonUsername ? (
                      <span className="text-indigo-700 font-semibold">✓ Unified across all member apps</span>
                    ) : (
                      <span className="text-slate-500">Different usernames allowed per app</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">Changing mode will detect and prompt for conflict resolution.</span>
              </div>

              {/* Name Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">📝</span>
                      Full Name
                    </h4>
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonName}
                      onChange={(e) => handleDataManagementToggle('name', e.target.checked)}
                      disabled={saving}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    {dataManagementSettings.useCommonName ? (
                      <span className="text-indigo-700 font-semibold">✓ Unified across all member apps</span>
                    ) : (
                      <span className="text-slate-500">Independent display names per app</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">Changing mode will detect and prompt for conflict resolution.</span>
              </div>

              {/* Password Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">🔑</span>
                      Password
                    </h4>
                    <input
                      type="checkbox"
                      checked={dataManagementSettings.useCommonPassword}
                      onChange={(e) => handleDataManagementToggle('password', e.target.checked)}
                      disabled={saving}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    {dataManagementSettings.useCommonPassword ? (
                      <span className="text-indigo-700 font-semibold">✓ Unified password across group</span>
                    ) : (
                      <span className="text-slate-500">Unique password per app</span>
                    )}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">Users in multiple apps will receive a password unification reset email.</span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1.5">
              <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                How Data Unification Works
              </h4>
              <ul className="list-disc list-inside space-y-1 text-indigo-800">
                <li><strong>Unified Mode:</strong> Signing in to any app accesses the exact same profile data across all member apps.</li>
                <li><strong>Per-App Mode:</strong> Each application operates its own silo of user profile data under the same email identity.</li>
                <li><strong>Conflict Handling:</strong> If existing users have different data across member apps, a dialog will ask you to select which value to preserve.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 5. USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search group users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden placeholder:text-slate-400 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportUsersToCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter Users
                </span>
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <select
                  value={filters.appId}
                  onChange={(e) => updateFilter('appId', e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden text-slate-700"
                >
                  <option value="">All Applications</option>
                  {apps.map(app => (
                    <option key={app.id} value={app.id}>{app.app_name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Email contains..."
                  value={filters.email}
                  onChange={(e) => updateFilter('email', e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden text-slate-700"
                />

                <select
                  value={filters.loginMethod}
                  onChange={(e) => updateFilter('loginMethod', e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden text-slate-700"
                >
                  <option value="">All Login Methods</option>
                  <option value="email">Email/Password</option>
                  <option value="google">Google OAuth</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden text-slate-700"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="verified">Email Verified</option>
                  <option value="unverified">Email Unverified</option>
                </select>
              </div>
            </div>

            {/* Bulk actions strip */}
            {selectedUsers.length > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
                <span className="font-semibold text-indigo-900">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={bulkBlockUsers}
                    disabled={saving}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-2xs"
                  >
                    Block Selected
                  </button>
                  <button
                    onClick={bulkUnblockUsers}
                    disabled={saving}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-2xs"
                  >
                    Unblock Selected
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={selectAllUsers}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-3">Email Address</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Application</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Login</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        No users found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const isBlocked = user.group_blocked || user.app_blocked;
                      return (
                        <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${isBlocked ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserSelection(user.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900">{user.email}</td>
                          <td className="px-3 py-3 text-slate-700">{user.name || '—'}</td>
                          <td className="px-3 py-3 font-medium text-indigo-600">{user.app_name}</td>
                          <td className="px-3 py-3">
                            {user.group_blocked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                                Group Blocked
                              </span>
                            ) : user.app_blocked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                                App Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-500 font-mono">
                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {user.group_blocked ? (
                              <button
                                onClick={() => unblockUser(user.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const reason = window.prompt('Reason for blocking (optional):');
                                  if (reason !== null) blockUser(user.id, reason);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              >
                                Block
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {userTotal > 50 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Page {userPage} of {Math.ceil(userTotal / 50)} ({userTotal} total users)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setUserPage(p => p + 1)}
                    disabled={userPage >= Math.ceil(userTotal / 50)}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. BULK OPERATIONS TAB */}
        {activeTab === 'bulk-ops' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Bulk Operations Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-1">
                Review historical batch operations performed across member applications.
              </p>
            </div>

            {bulkOperations.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No bulk operations recorded for this group.
              </p>
            ) : (
              <div className="space-y-3">
                {bulkOperations.map(op => (
                  <div
                    key={op.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                          {op.operation_type.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          op.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : op.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {op.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Target count: {op.target_count} user(s) | Initiated: {new Date(op.created_at).toLocaleString()}
                      </p>
                      {op.error_message && (
                        <p className="text-xs text-rose-600 mt-1">Error: {op.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Add User to Group
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="johndoe"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                />
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                ℹ️ This will synchronize the user profile across all member applications in this group.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                disabled={saving || !newUser.email}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Confirm Action
              </h3>
              <button onClick={handleCancelAction} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {confirmMessage}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={handleCancelAction}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                Resolve Data Conflicts ({currentField})
              </h3>
              <button onClick={() => setShowConflictModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Multiple differing values were detected for <strong>{currentField}</strong> across member applications. Choose which value to adopt for each user:
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {conflicts.map((conflictGroup) => (
                <div key={conflictGroup.field} className="space-y-3">
                  {conflictGroup.conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                      <div className="font-semibold text-slate-900">User: {conflict.email}</div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {(conflictGroup.field === 'username' ? conflict.usernames : conflict.names).map((val, vIdx) => (
                          <label key={vIdx} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <input
                              type="radio"
                              name={`${conflictGroup.field}-${conflict.email}`}
                              value={val}
                              checked={resolutions[conflict.email] === val}
                              onChange={(e) => setResolutions(prev => ({
                                ...prev,
                                [conflict.email]: e.target.value
                              }))}
                              className="text-indigo-600"
                            />
                            <span className="font-mono text-slate-800">{val}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400">Apps: {conflict.apps.join(', ')}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setResolutions({});
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => enableCommonModeWithResolutions(currentField, resolutions)}
                disabled={Object.keys(resolutions).length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                Apply Values
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in">
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Processing group settings...
        </div>
      )}
    </div>
  );
}
