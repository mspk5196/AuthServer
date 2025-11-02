import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import './Users.scss';

const Users = () => {
  const { appId } = useParams();
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(appId || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchUsers(selectedApp);
    }
  }, [selectedApp]);

  const fetchApps = async () => {
    try {
      const data = await api.get('/developer/apps');
      setApps(data.apps);
      if (data.apps.length > 0 && !selectedApp) {
        setSelectedApp(data.apps[0].id.toString());
      }
    } catch (err) {
      setError('Failed to fetch apps');
    }
  };

  const fetchUsers = async (appId) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/developer/apps/${appId}/users`);
      setUsers(data.users);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      const action = isBlocked ? 'unblock' : 'block';
      await api.patch(`/developer/apps/${selectedApp}/users/${userId}/${action}`);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_blocked: !isBlocked } : user
      ));
    } catch (err) {
      alert(err.message || `Failed to ${isBlocked ? 'unblock' : 'block'} user`);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAppData = apps.find(app => app.id.toString() === selectedApp);

  return (
    <div className="users-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>User Management</h1>
            <p>View and manage users across your applications</p>
          </div>
        </div>

        <div className="users-controls">
          <div className="app-selector">
            <label htmlFor="appSelect">Select App:</label>
            <select
              id="appSelect"
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              {apps.map(app => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {selectedAppData && (
          <div className="app-info-banner">
            <div>
              <strong>{selectedAppData.name}</strong>
              <span className="app-users-count">{users.length} users</span>
            </div>
            <span className={`badge ${selectedAppData.google_client_id ? 'badge-success' : 'badge-secondary'}`}>
              Google Sign-In: {selectedAppData.google_client_id ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{searchTerm ? 'No users found' : 'No users yet'}</h3>
            <p>
              {searchTerm 
                ? 'Try adjusting your search criteria'
                : 'Users will appear here once they sign up to your app'
              }
            </p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className={user.is_blocked ? 'blocked-row' : ''}>
                    <td>{user.name}</td>
                    <td>@{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge badge-${user.provider === 'google' ? 'info' : 'secondary'}`}>
                        {user.provider === 'google' ? '🔗 Google' : '📧 Email'}
                      </span>
                    </td>
                    <td>
                      <div className="status-badges">
                        {user.is_verified ? (
                          <span className="badge badge-success">✓ Verified</span>
                        ) : (
                          <span className="badge badge-warning">⚠ Unverified</span>
                        )}
                        {user.is_blocked && (
                          <span className="badge badge-danger">🚫 Blocked</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${user.is_blocked ? 'btn-secondary' : 'btn-danger'}`}
                        onClick={() => handleBlockUser(user.id, user.is_blocked)}
                      >
                        {user.is_blocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="users-summary">
          <p>
            Showing {filteredUsers.length} of {users.length} users
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Users;
