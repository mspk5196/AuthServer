import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import {
  Layers,
  Plus,
  FolderPlus,
  Copy,
  Check,
  Key,
  ShieldCheck,
  Mail,
  Users,
  Settings as SettingsIcon,
  Eye,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

const Apps = () => {
  const { developer } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupFormName, setGroupFormName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupModalError, setGroupModalError] = useState('');

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newAppCredentials, setNewAppCredentials] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const [formData, setFormData] = useState({
    app_name: '',
    support_email: '',
    allow_google_signin: false,
    allow_email_signin: true,
    group_id: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApps();
    fetchGroups();
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

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      setGroupsError('');
      const token = tokenService.get();
      const data = await api.get('/apps/groups', token);
      if (data.success) {
        setGroups(data.data || []);
      } else {
        setGroupsError(data.message || 'Failed to load app groups');
      }
    } catch (err) {
      console.error('Fetch groups error:', err);
      setGroupsError('Failed to load app groups. Please try again.');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!groupFormName.trim()) {
      setGroupModalError('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);
      setGroupModalError('');
      const token = tokenService.get();
      const data = await api.post('/apps/groups', { name: groupFormName.trim() }, token);
      if (data.success) {
        setGroupFormName('');
        setShowCreateGroupModal(false);
        await fetchGroups();
      } else {
        setGroupModalError(data.message || 'Failed to create group');
      }
    } catch (err) {
      console.error('Create group error:', err);
      setGroupModalError('Failed to create group. Please try again.');
    } finally {
      setCreatingGroup(false);
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
      if (formData.group_id) {
        payload.group_id = formData.group_id;
      }
      const data = await api.post('/apps/createApp', payload, token);
      if (data.success) {
        setNewAppCredentials(data.data);
        setShowCredentialsModal(true);
        setShowCreateModal(false);

        setFormData({
          app_name: '',
          support_email: '',
          allow_google_signin: false,
          allow_email_signin: true,
          group_id: ''
        });

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

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleCloseCredentialsModal = () => {
    setShowCredentialsModal(false);
    setNewAppCredentials(null);
  };

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      (app.app_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.api_key || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !selectedGroupFilter || app.group_id === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading your applications…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-indigo-600" />
            Applications
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            Manage your client applications, generate API credentials, and review user authentication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            Create Group
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Application
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2.5 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search apps by name or API key…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
          >
            <option value="">All Groups (All Apps)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Apps Grid */}
      {filteredApps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No applications match your filter</h2>
          <p className="text-xs text-slate-500 font-medium max-w-sm mt-1">
            {apps.length === 0
              ? 'Get started by creating your first application to generate API keys and configure authentication.'
              : 'Try clearing your search query or selecting a different app group.'}
          </p>
          {apps.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Your First App
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-sm font-black shrink-0">
                      {app.app_name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {app.app_name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium truncate block">
                        {app.group_name ? `Group: ${app.group_name}` : 'Standalone App'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    Active
                  </span>
                </div>

                {/* API Key snippet with copy */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    API Key
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-slate-700 font-medium truncate">
                      {app.api_key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(app.api_key, `key-${app.id}`)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                      title="Copy API Key"
                    >
                      {copiedField === `key-${app.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Features Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                      app.allow_email_signin
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    Email Login
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                      app.allow_google_signin
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Google OAuth
                  </span>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{app.total_users || 0} users</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-medium">
                    Active (30d): {app.active_users || 0}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/apps/${app.id}`)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  View Users
                </button>
                <button
                  onClick={() => navigate(`/apps/${app.id}/settings`)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create App Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create New Application</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">App Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Mobile Portal"
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Support Email *</label>
                <input
                  type="email"
                  placeholder="support@yourdomain.com"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A verification link will be sent to this email to activate API usage.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">App Group (Optional)</label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Standalone App (No Group)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_email_signin}
                    onChange={(e) => setFormData({ ...formData, allow_email_signin: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Enable Email &amp; Password Login</span>
                </label>

                <label className="flex items-center gap-2.5 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_google_signin}
                    onChange={(e) => setFormData({ ...formData, allow_google_signin: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Enable Google Sign-In (OAuth)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? 'Creating…' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create New App Group</h2>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Client Suite"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {groupModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{groupModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  disabled={creatingGroup}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {creatingGroup && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {creatingGroup ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal (Generated Once) */}
      {showCredentialsModal && newAppCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-slate-900">App Created Successfully!</h2>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {newAppCredentials.support_email_verification_pending && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 font-medium">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Email Verification Required:</strong> Check your support email inbox. You must verify the address before these credentials activate.
                  </div>
                </div>
              )}

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 font-medium">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Store Securely:</strong> The API Secret is shown only once and cannot be retrieved again.
                </div>
              </div>

              {/* API Key */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  API Key (Client ID)
                </label>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-xs font-mono font-bold text-slate-900 break-all select-all">
                    {newAppCredentials.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newAppCredentials.api_key, 'modal-key')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    {copiedField === 'modal-key' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  API Secret
                </label>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-xs font-mono font-bold text-slate-900 break-all select-all">
                    {newAppCredentials.api_secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newAppCredentials.api_secret, 'modal-secret')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    {copiedField === 'modal-secret' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick start code */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl overflow-x-auto font-mono text-[11px] leading-relaxed">
                <span className="text-slate-400 font-bold block mb-1 font-sans text-xs">Environment configuration (.env):</span>
                <code>
                  {`AUTH_API_KEY=${newAppCredentials.api_key}\nAUTH_API_SECRET=${newAppCredentials.api_secret}`}
                </code>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCloseCredentialsModal}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  I Have Safely Saved My Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apps;
