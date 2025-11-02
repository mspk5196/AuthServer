import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import './Dashboard.scss';

const Dashboard = () => {
  const { developer } = useAuth();
  const [stats, setStats] = useState({
    totalApps: 0,
    totalUsers: 0,
    verifiedUsers: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/developer/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {developer?.name}!</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📱</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalApps}</div>
              <div className="stat-label">Total Apps</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.verifiedUsers}</div>
              <div className="stat-label">Verified Users</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.totalUsers > 0
                  ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
                  : 0}%
              </div>
              <div className="stat-label">Verification Rate</div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <h2>Account Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Name</label>
                <div className="info-value">{developer?.name}</div>
              </div>
              <div className="info-item">
                <label>Username</label>
                <div className="info-value">@{developer?.username}</div>
              </div>
              <div className="info-item">
                <label>Email</label>
                <div className="info-value">{developer?.email}</div>
              </div>
              <div className="info-item">
                <label>Status</label>
                <div className="info-value">
                  <span className={`badge ${developer?.is_verified ? 'badge-success' : 'badge-warning'}`}>
                    {developer?.is_verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <a href="/apps" className="action-button">
                <span className="action-icon">➕</span>
                <div>
                  <div className="action-title">Create New App</div>
                  <div className="action-desc">Start a new application</div>
                </div>
              </a>
              <a href="/apps" className="action-button">
                <span className="action-icon">📋</span>
                <div>
                  <div className="action-title">View All Apps</div>
                  <div className="action-desc">Manage your applications</div>
                </div>
              </a>
              <a href="/apps" className="action-button">
                <span className="action-icon">👥</span>
                <div>
                  <div className="action-title">Manage Users</div>
                  <div className="action-desc">View and manage app users</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {!developer?.is_verified && (
          <div className="alert alert-warning">
            <strong>Email verification pending!</strong> Please check your email and verify
            your account to access all features.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
