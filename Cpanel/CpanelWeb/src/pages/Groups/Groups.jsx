import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import '../Apps/AppHome/Apps.css';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupFormName, setGroupFormName] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

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

  if (loading) {
    return (
      <div className="apps-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apps-container">
      <div className="apps-header">
        <div>
          <h1>🧩 App Groups</h1>
          <p>Create and manage groups for your applications</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Group
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧩</div>
          <h2>No Groups Yet</h2>
          <p>Create a group to organize related applications together.</p>
          <button
            className="btn-primary btn-large"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="apps-grid">
          {groups.map(group => (
            <div key={group.id} className="app-card">
              <div className="app-card-header">
                <h3>{group.name}</h3>
              </div>
              <div className="app-card-body">
                <div className="app-info-row">
                  <span className="label">Created At:</span>
                  <span className="value">
                    {group.created_at
                      ? new Date(group.created_at).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="app-info-row">
                  <span className="label">Last Updated:</span>
                  <span className="value">
                    {group.updated_at
                      ? new Date(group.updated_at).toLocaleString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New App Group</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  placeholder="My Customer Group"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  required
                />
              </div>

              {modalError && (
                <div className="alert alert-error">
                  <span>⚠️</span>
                  <p>{modalError}</p>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
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
