import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AppCard from '../../components/AppCard';
import Modal from '../../components/Modal';
import { validateAppName } from '../../utils/validators';
import './Apps.scss';

const Apps = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');
  const [appName, setAppName] = useState('');
  const [appNameError, setAppNameError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await api.get('/developer/apps');
      setApps(data.apps);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    setError('');
    setAppNameError('');

    if (!appName.trim()) {
      setAppNameError('App name is required');
      return;
    }

    if (!validateAppName(appName)) {
      setAppNameError('App name must be 3-30 characters (alphanumeric, underscore, hyphen only)');
      return;
    }

    setCreateLoading(true);
    try {
      const data = await api.post('/developer/apps', { name: appName });
      setApps([...apps, data.app]);
      setShowCreateModal(false);
      setAppName('');
    } catch (err) {
      setError(err.message || 'Failed to create app');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateApp = (updatedApp) => {
    setApps(apps.map(app => app.id === updatedApp.id ? updatedApp : app));
  };

  const handleDeleteApp = (appId) => {
    setApps(apps.filter(app => app.id !== appId));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="apps-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>My Applications</h1>
            <p>Manage your apps and their authentication settings</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Create New App
          </button>
        </div>

        {apps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No apps yet</h3>
            <p>Create your first app to get started with authentication</p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First App
            </button>
          </div>
        ) : (
          <div className="apps-grid">
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onUpdate={handleUpdateApp}
                onDelete={handleDeleteApp}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setAppName('');
          setError('');
          setAppNameError('');
        }}
        title="Create New App"
      >
        <form onSubmit={handleCreateApp}>
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="appName">App Name</label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                setAppNameError('');
              }}
              className={appNameError ? 'error' : ''}
              placeholder="my-awesome-app"
              autoFocus
            />
            {appNameError && (
              <span className="error-message">{appNameError}</span>
            )}
            <span className="help-text">
              3-30 characters, alphanumeric, underscore, and hyphen only
            </span>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShowCreateModal(false);
                setAppName('');
                setError('');
                setAppNameError('');
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createLoading}
            >
              {createLoading ? 'Creating...' : 'Create App'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Apps;
