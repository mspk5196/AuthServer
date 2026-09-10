import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Download,
  UserPlus,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  Activity,
  Send,
  User,
  ExternalLink
} from 'lucide-react';

export default function AppDetails() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const token = tokenService.get();

  // Data State
  const [app, setApp] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserLogins, setSelectedUserLogins] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Email Management State
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [newSupportEmail, setNewSupportEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');

  useEffect(() => {
    fetchDetails();
    fetchUsers();
  }, [appId]);

  async function fetchDetails() {
    try {
      const resp = await api.get(`/apps/summary/${appId}`, token);
      if (resp.success) {
        setApp(resp.data);
        setNewSupportEmail(resp.data.app?.support_email || '');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch app details');
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      const resp = await api.get(`/apps/users/${appId}?limit=25`, token);
      if (resp.success) {
        const parsedUsers = (resp.data || []).map((user) => {
          if (user.extra && typeof user.extra === 'string') {
            try {
              user.extra = JSON.parse(user.extra);
            } catch (e) {
              console.error('Failed to parse extra field for user:', user.id, e);
            }
          }
          return user;
        });
        setUsers(parsedUsers);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  const getExtraFieldKeys = () => {
    const keysSet = new Set();
    users.forEach((user) => {
      if (user.extra && typeof user.extra === 'object') {
        Object.keys(user.extra).forEach((key) => keysSet.add(key));
      }
    });
    return Array.from(keysSet).sort();
  };

  const extraFieldKeys = getExtraFieldKeys();

  async function viewLogins(userId, email) {
    try {
      setSelectedUserEmail(email);
      const resp = await api.get(`/apps/users/${appId}/${userId}/logins`, token);
      if (resp.success) setSelectedUserLogins(resp.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch login history');
    }
  }

  async function blockUser(userId, block) {
    try {
      await api.put(`/apps/users/${appId}/${userId}/block`, { block }, token);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Failed to update user');
    }
  }

  async function handleCreateUserSubmit(e) {
    e.preventDefault();
    if (!newUser.email || !newUser.password) return;

    setCreatingUser(true);
    try {
      const resp = await api.post(`/apps/users/${appId}`, newUser, token);
      if (resp.success) {
        setShowModal(false);
        setNewUser({ email: '', password: '', name: '' });
        fetchUsers();
      } else {
        alert(resp.message || 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create user request');
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleUpdateSupportEmail(e) {
    e.preventDefault();
    if (!newSupportEmail.trim()) {
      setError('Support email is required');
      return;
    }

    setUpdatingEmail(true);
    setError('');
    try {
      const resp = await api.put(`/apps/support-email/${appId}`, { support_email: newSupportEmail }, token);
      if (resp.success) {
        setEmailUpdateSuccess('Support email updated! Check your new email for a verification link.');
        setShowEditEmailModal(false);
        fetchDetails();
        setTimeout(() => setEmailUpdateSuccess(''), 5000);
      } else {
        setError(resp.message || 'Failed to update support email');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update support email');
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleExportCSV() {
    try {
      const response = await fetch(`${API_BASE_URL}/apps/users/${appId}/export-csv`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export error:', err);
      setError('Failed to export CSV. Please try again.');
    }
  }

  async function handleRequestDeleteApp() {
    if (
      !window.confirm(
        'Are you sure you want to delete this app? A confirmation link will be emailed to your registered developer address.'
      )
    ) {
      return;
    }

    try {
      const resp = await api.post(`/apps/deleteApp/${appId}/request`, {}, token);
      if (resp.success) {
        alert('Deletion link sent to your registered email. Please confirm from your inbox to complete deletion.');
      } else {
        alert(resp.message || 'Failed to initiate app deletion');
      }
    } catch (err) {
      console.error('Request delete app error:', err);
      alert('Failed to initiate app deletion. Please try again.');
    }
  }

  if (loading && !app) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading application details…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Top Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/apps')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Apps</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/apps/${appId}/settings`)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleRequestDeleteApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete App</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2.5 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {emailUpdateSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{emailUpdateSuccess}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-2xl font-black shrink-0 shadow-xs">
            {app?.app?.app_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {app?.app?.app_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              App ID: <code className="font-mono text-slate-700 select-all">{appId}</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                API Calls (Month)
              </span>
              <span className="text-base font-black text-slate-900">
                {Number(app?.usage?.calls_this_month || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <Send className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Mails Sent (Month)
              </span>
              <span className="text-base font-black text-emerald-700">
                {Number(app?.app?.mail_sent_count ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Support Email Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Support Email
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-900">
                {app?.app?.support_email || 'Not configured'}
              </span>
              {app?.app?.support_email_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  Pending Verification
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowEditEmailModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          Edit Support Email
        </button>
      </div>

      {/* Users Section Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Registered Application Users</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing recent users registered under this application.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No users found for this application</h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mt-1">
              Users who sign up via your app or through manual provisioning will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider font-bold text-slate-500 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Username</th>
                  {extraFieldKeys.map((key) => (
                    <th key={key} className="px-4 py-3.5">
                      {key}
                    </th>
                  ))}
                  <th className="px-4 py-3.5">Verified</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{u.username || '—'}</td>
                    {extraFieldKeys.map((key) => {
                      const value = u.extra?.[key];
                      return (
                        <td key={key} className="px-4 py-3 text-slate-600">
                          {value !== undefined && value !== null
                            ? typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)
                            : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.email_verified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {u.email_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.is_blocked
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => viewLogins(u.id, u.email)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Logins
                        </button>
                        <button
                          onClick={() => blockUser(u.id, !u.is_blocked)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            u.is_blocked
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Login History Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {selectedUserEmail ? `Login History for ${selectedUserEmail}` : 'User Login History'}
            </h3>
          </div>
        </div>

        {selectedUserLogins.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {selectedUserLogins.map((l) => (
              <div key={l.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs hover:bg-slate-50/80">
                <span className="font-mono text-slate-800 font-bold">
                  {new Date(l.login_time).toLocaleString()}
                </span>
                <span className="text-slate-500 font-mono">{l.ip_address}</span>
                <span className="text-slate-400 truncate max-w-sm text-[11px]">{l.user_agent}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-medium py-4 text-center">
            Click &quot;Logins&quot; next to any user above to inspect their recent authentication timestamps, IP addresses, and user agents.
          </p>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create New App User</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Strong password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {creatingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {creatingUser ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Support Email Modal */}
      {showEditEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowEditEmailModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Edit Support Email</h2>
              </div>
              <button
                onClick={() => setShowEditEmailModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupportEmail} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Support Email *</label>
                <input
                  type="email"
                  required
                  placeholder="support@example.com"
                  value={newSupportEmail}
                  onChange={(e) => setNewSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  A verification link will be dispatched to this new address.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditEmailModal(false)}
                  disabled={updatingEmail}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEmail}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {updatingEmail && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {updatingEmail ? 'Updating…' : 'Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}