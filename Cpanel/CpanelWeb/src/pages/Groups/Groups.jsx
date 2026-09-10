import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import { 
  FolderKanban, 
  Plus, 
  Settings, 
  Trash2, 
  Users, 
  Calendar, 
  X, 
  AlertCircle, 
  ExternalLink,
  Search,
  Clock
} from 'lucide-react';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupFormName, setGroupFormName] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [viewingUsersFor, setViewingUsersFor] = useState(null);
  const [groupUsers, setGroupUsers] = useState([]);
  const [viewUsersLoading, setViewUsersLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const navigate = useNavigate();
  
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const token = tokenService.get();
      const data = await api.get('/apps/groups', token);
      if (data.success) {
        setGroups(data.data || []);
      } else {
        setError(data.message || 'Failed to load groups');
      }
    } catch (err) {
      console.error('Fetch groups error:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!groupFormName.trim()) {
      setModalError('Group name is required');
      return;
    }

    try {
      setCreating(true);
      setModalError('');
      const token = tokenService.get();
      const data = await api.post('/apps/groups', { name: groupFormName.trim() }, token);
      if (data.success) {
        setGroupFormName('');
        setShowCreateModal(false);
        await fetchGroups();
      } else {
        setModalError(data.message || 'Failed to create group');
      }
    } catch (err) {
      console.error('Create group error:', err);
      setModalError('Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!group || !group.id) return;

    const confirmed = window.confirm(
      `Delete group "${group.name}"?\n\nThis cannot be undone. You must delete or reassign apps in this group first.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(group.id);
      const token = tokenService.get();
      const data = await api.delete(`/apps/groups/${group.id}`, token);
      if (data.success) {
        await fetchGroups();
      } else {
        alert(data.message || 'Failed to delete group');
      }
    } catch (err) {
      console.error('Delete group error:', err);
      const msg = err?.data?.message || 'Failed to delete group. Please try again.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewUsers = async (group) => {
    if (!group || !group.id) return;
    setViewingUsersFor(group);
    setViewUsersLoading(true);
    try {
      const token = tokenService.get();
      const data = await api.get(`/apps/groups/${group.id}/users`, token);
      if (data.success) {
        setGroupUsers(data.data || []);
      } else {
        setGroupUsers([]);
        alert(data.message || 'Failed to load group users');
      }
    } catch (err) {
      console.error('Fetch group users error:', err);
      alert('Failed to load group users. Please try again.');
    } finally {
      setViewUsersLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Loading application groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-indigo-600" />
            App Groups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize related applications together to share OAuth credentials, users, or custom profile schemas.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError('');
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium flex-1">{error}</p>
        </div>
      )}

      {/* Search Bar if groups exist */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search groups by name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all placeholder:text-slate-400 text-slate-900"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredGroups.length} of {groups.length} group{groups.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Groups Grid / Empty State */}
      {groups.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Groups Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Create an App Group to link multiple apps together and manage single sign-on or synchronized profiles.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {group.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {group.id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/groups/${group.id}/settings`)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Group Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      disabled={deletingId === group.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Created:
                    </span>
                    <span className="font-medium text-slate-700">
                      {group.created_at ? new Date(group.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Updated:
                    </span>
                    <span className="font-medium text-slate-700">
                      {group.updated_at ? new Date(group.updated_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewUsers(group)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  View Users
                </button>

                <button
                  onClick={() => navigate(`/groups/${group.id}/settings`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Configure Group
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users in Group Modal */}
      {viewingUsersFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Users in Group: {viewingUsersFor.name}
                </h3>
              </div>
              <button
                onClick={() => { setViewingUsersFor(null); setGroupUsers([]); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {viewUsersLoading ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                  Loading group users...
                </div>
              ) : groupUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No users found in this application group.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Email</th>
                        <th className="px-3 py-2.5">Name</th>
                        <th className="px-3 py-2.5">Username</th>
                        <th className="px-3 py-2.5">Origin App</th>
                        <th className="px-3 py-2.5">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {groupUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-sans font-medium text-slate-900">{u.email}</td>
                          <td className="px-3 py-2.5 font-sans text-slate-700">{u.name || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500">{u.username || '—'}</td>
                          <td className="px-3 py-2.5 font-sans text-indigo-600 font-medium">
                            {u.app_name || u.app_id}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 font-sans">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { setViewingUsersFor(null); setGroupUsers([]); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Create New App Group</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Client Suite"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white text-slate-900"
                  required
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{modalError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !groupFormName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
