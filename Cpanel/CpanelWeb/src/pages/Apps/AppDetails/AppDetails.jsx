import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { tokenService } from '../../../services/tokenService';
import './appDetailsSty.css';

export default function AppDetails(){
  const { appId } = useParams();
  const navigate = useNavigate();
  const token = tokenService.get();

  // Data State
  const [app, setApp] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserLogins, setSelectedUserLogins] = useState([]);
  
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

  useEffect(()=>{ fetchDetails(); fetchUsers(); }, [appId]);

  async function fetchDetails(){
    try {
      const resp = await api.get(`/apps/summary/${appId}`, token);
      if (resp.success) {
        setApp(resp.data);
        setNewSupportEmail(resp.data.app?.support_email || '');
        // console.log(resp.data);
        
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch app details');
    }
  }

  async function fetchUsers(){
    try {
      setLoading(true);
      const resp = await api.get(`/apps/users/${appId}?limit=25`, token);
      if (resp.success) setUsers(resp.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function viewLogins(userId){
    try {
      const resp = await api.get(`/apps/users/${appId}/${userId}/logins`, token);
      if (resp.success) setSelectedUserLogins(resp.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch login history');
    }
  }

  async function blockUser(userId, block){
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
    if(!newUser.email || !newUser.password) return;

    setCreatingUser(true);
    try {
      const resp = await api.post(`/apps/users/${appId}`, newUser, token);
      if (resp.success) {
        setShowModal(false);
        setNewUser({ email: '', password: '', name: '' }); // Reset form
        fetchUsers();
        alert('User created successfully');
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
        setEmailUpdateSuccess('Support email updated! Check your new email for verification link.');
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
      const response = await fetch(`/api/developer/apps/users/${appId}/export-csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  if (loading && !app) return <div className="details-loading">Loading...</div>;

  return (
    <div className="app-details">
      {/* Header */}
      <div className="details-header">
        <div className="details-header-top">
          <button className="details-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
        
        <h2 className="details-title">{app?.app?.app_name} — Details</h2>
        
        <div className="details-stats-row">
          <div className="stat-badge">
            <strong>API Usage (this month):</strong>
            <span className="stat-number">{app?.usage?.calls_this_month || 0}</span>
          </div>
          <button 
            className="details-settings-btn" 
            onClick={() => navigate(`/apps/${appId}/settings`)}
          >
            Open Settings
          </button>
        </div>
      </div>

      {/* Support Email Section */}
      <div className="support-email-section">
        <h3 className="section-title">Support Email</h3>
        <div className="email-display">
          <div className="email-info">
            <p className="email-label">Current Support Email:</p>
            <p className="email-value">{app?.app?.support_email}</p>
            {app?.app?.support_email_verified ? (
              <span className="status-badge status-verified">✅ Verified</span>
            ) : (
              <span className="status-badge status-pending">⏳ Pending Verification</span>
            )}
          </div>
          <button 
            className="btn-edit-email"
            onClick={() => setShowEditEmailModal(true)}
          >
            Edit Email
          </button>
        </div>
      </div>

      {/* Export CSV Section */}
      <div className="export-section">
        <h3 className="section-title">Export User Data</h3>
        <p className="export-description">Download all user information as CSV (password excluded)</p>
        <button 
          className="btn-export-csv"
          onClick={handleExportCSV}
        >
          📥 Export Users to CSV
        </button>
      </div>

      {/* Add User Button Section */}
      <div className="add-user-section">
        <button className="add-user-btn" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

      {/* Users List */}
      <div className="users-section">
        <h3 className="section-title">Users</h3>
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Username</th>
              <th>Verified</th>
              <th>Blocked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.username || '-'}</td>
                <td>
                  <span className={u.email_verified ? 'status-badge status-verified' : 'status-badge status-unverified'}>
                    {u.email_verified ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={u.is_blocked ? 'status-badge status-blocked' : 'status-badge status-active'}>
                    {u.is_blocked ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <button 
                    className="action-btn action-btn-view" 
                    onClick={()=>viewLogins(u.id)}
                  >
                    View Logins
                  </button>
                  <button 
                    className={`action-btn ${u.is_blocked ? 'action-btn-unblock' : 'action-btn-block'}`}
                    onClick={()=>blockUser(u.id, !u.is_blocked)}
                  >
                    {u.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Login History */}
      <div className="login-history-section">
        <h3 className="section-title">Selected User Logins</h3>
        {selectedUserLogins.length > 0 ? (
          <ul className="login-list">
            {selectedUserLogins.map(l => (
              <li key={l.id}>
                <span className="login-time">{new Date(l.login_time).toLocaleString()}</span>
                <span className="login-ip">{l.ip_address}</span>
                <span className="login-agent">{l.user_agent}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-logins">Select a user to view their login history</div>
        )}
      </div>

      {error && <div className="details-error">{error}</div>}
      {emailUpdateSuccess && <div className="details-success">{emailUpdateSuccess}</div>}

      {/* Custom Modal for Adding User */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 className="modal-title">Create New User</h3>
            <form className="modal-form" onSubmit={handleCreateUserSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  required
                  className="form-input" 
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  required
                  className="form-input" 
                  placeholder="Secure password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="John Doe"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Support Email Modal */}
      {showEditEmailModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 className="modal-title">Edit Support Email</h3>
            <form className="modal-form" onSubmit={handleUpdateSupportEmail}>
              <div className="form-group">
                <label className="form-label">Support Email</label>
                <input 
                  type="email" 
                  required
                  className="form-input" 
                  placeholder="support@example.com"
                  value={newSupportEmail}
                  onChange={e => setNewSupportEmail(e.target.value)}
                />
              </div>
              <p className="modal-info">A verification link will be sent to the new email address.</p>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowEditEmailModal(false)}
                  disabled={updatingEmail}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={updatingEmail}
                >
                  {updatingEmail ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}