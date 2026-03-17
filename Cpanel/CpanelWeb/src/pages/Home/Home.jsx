import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { tokenService } from '../../services/tokenService';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { developer } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenService.get();
      const response = await api.get('/apps/dashboard', token);
      
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = () => {
    navigate('/apps/create');
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle error-text">{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const apps = dashboardData?.recentApps || [];
  const planInfo = dashboardData?.planInfo;

  return (
    <div className="home-page">
      <div className="welcome-banner">
        <h2>Welcome back, {developer?.name || developer?.username || 'Developer'}!</h2>
        <p>Manage your applications and monitor your account from your dashboard.</p>
        {planInfo && (
          <div className="plan-badge">
            <span className="plan-name">{planInfo.name}</span>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Apps</div>
            <div className="stat-value">{stats.totalApps || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">App Groups</div>
            <div className="stat-value">{stats.groupsUsed || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">API Calls (Today)</div>
            <div className="stat-value">{stats.todayApiCalls || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">API Calls (This Month)</div>
            <div className="stat-value">{stats.monthApiCalls || 0}</div>
          </div>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <h3>No apps yet</h3>
          <p>Get started by creating your first application. You can manage API keys, configure settings, and monitor usage all in one place.</p>
          <button className="btn btn-primary btn-lg" onClick={handleCreateApp}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Your First App
          </button>
        </div>
      ) : (
        <div className="recent-apps">
          <div className="section-header">
            <h2 className="section-title">Recent Apps</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/apps')}>
              View All
            </button>
          </div>
          <div className="apps-grid">
            {apps.slice(0, 3).map((app) => (
              <div key={app.id} className="app-card" onClick={() => navigate(`/apps/${app.id}`)}>
                <div className="app-card-header">
                  <div>
                    <div className="app-icon">{app.name[0].toUpperCase()}</div>
                  </div>
                  <span className={`badge badge-${app.status === 'active' ? 'success' : 'warning'}`}>
                    {app.status}
                  </span>
                </div>
                <h3 className="app-name">{app.name}</h3>
                <p className="app-description">{app.description || 'No description provided'}</p>
                <div className="app-meta">
                  <div className="app-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Created {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
