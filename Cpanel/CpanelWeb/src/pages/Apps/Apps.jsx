import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Apps.css';

const Apps = () => {
  const navigate = useNavigate();
  const { tokenService } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.get('/apps', tokenService.get());
      // setApps(response.data.apps || []);
      
      // Mock data for demonstration
      setApps([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching apps:', error);
      setLoading(false);
    }
  };

  const handleCreateApp = () => {
    // Navigate to create app page (to be implemented)
    navigate('/apps/create');
  };

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="apps-page">
        <div className="page-header">
          <h1 className="page-title">Apps</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apps-page">
      <div className="apps-header">
        <div className="page-header">
          <h1 className="page-title">Apps</h1>
          <p className="page-subtitle">Manage and monitor your applications</p>
        </div>
        <div className="apps-actions">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleCreateApp}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create App
          </button>
        </div>
      </div>

      {filteredApps.length === 0 && apps.length === 0 ? (
        <div className="apps-empty">
          <svg className="apps-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <h3>No apps yet</h3>
          <p>Create your first application to get started with our platform. You'll be able to generate API keys, manage settings, and track usage.</p>
          <button className="btn btn-primary btn-lg" onClick={handleCreateApp}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Your First App
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="apps-empty">
          <svg className="apps-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <h3>No apps found</h3>
          <p>No apps match your search query. Try a different search term.</p>
        </div>
      ) : (
        <div className="apps-grid">
          {filteredApps.map((app) => (
            <div key={app.id} className="app-card" onClick={() => navigate(`/apps/${app.id}`)}>
              <div className="app-card-header">
                <div className="app-icon">{app.name[0].toUpperCase()}</div>
                <button className="app-menu-btn" onClick={(e) => e.stopPropagation()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
              </div>
              <h3 className="app-name">{app.name}</h3>
              <p className="app-description">{app.description || 'No description provided'}</p>
              <div className="app-info">
                <div className="app-info-item">
                  <span className="app-info-label">Status</span>
                  <span className={`badge badge-${app.status === 'active' ? 'success' : 'warning'}`}>
                    {app.status}
                  </span>
                </div>
                <div className="app-info-item">
                  <span className="app-info-label">API Calls</span>
                  <span className="app-info-value">{app.api_calls?.toLocaleString() || '0'}</span>
                </div>
              </div>
              <div className="app-footer">
                <span>Created {new Date(app.created_at).toLocaleDateString()}</span>
                <div className="app-actions">
                  <button className="icon-btn" title="Settings" onClick={(e) => e.stopPropagation()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
                    </svg>
                  </button>
                  <button className="icon-btn" title="View Details" onClick={(e) => e.stopPropagation()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Apps;
