import { useState } from 'react';
import Modal from '../Modal';
import { api } from '../../utils/api';
import { validateAppName, validateRequired } from '../../utils/validators';
import './AppCard.scss';

const AppCard = ({ app, onUpdate, onDelete }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: app.name,
    googleClientId: app.google_client_id || '',
    googleClientSecret: app.google_client_secret || '',
  });

  const baseUrl = `https://auth.mspkapps.in/${app.developer_username}/${app.name}`;

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateAppName(formData.name)) {
      setError('App name must be 3-30 characters (alphanumeric, underscore, hyphen)');
      return;
    }

    setLoading(true);
    try {
      const data = await api.put(`/developer/apps/${app.id}`, {
        name: formData.name,
      });
      onUpdate(data.app);
      setShowEditModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update app');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const data = await api.put(`/developer/apps/${app.id}/google-config`, {
        googleClientId: formData.googleClientId || null,
        googleClientSecret: formData.googleClientSecret || null,
      });
      onUpdate(data.app);
      setShowConfigModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update Google configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/developer/apps/${app.id}`);
      onDelete(app.id);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err.message || 'Failed to delete app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3>{app.name}</h3>
            <p className="app-date">
              Created {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="app-actions">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowEditModal(true)}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="app-info">
          <div className="info-item">
            <label>Base URL</label>
            <div className="copy-field">
              <code>{baseUrl}</code>
              <button
                className="copy-btn"
                onClick={() => handleCopy(baseUrl, 'url')}
                title="Copy to clipboard"
              >
                {copied === 'url' ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="info-item">
            <label>API Key</label>
            <div className="copy-field">
              <code>{app.api_key}</code>
              <button
                className="copy-btn"
                onClick={() => handleCopy(app.api_key, 'key')}
                title="Copy to clipboard"
              >
                {copied === 'key' ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="info-item">
            <label>Google Sign-In</label>
            <div className="google-status">
              <span className={`badge ${app.google_client_id ? 'badge-success' : 'badge-secondary'}`}>
                {app.google_client_id ? 'Enabled' : 'Disabled'}
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setFormData({
                    ...formData,
                    googleClientId: app.google_client_id || '',
                    googleClientSecret: app.google_client_secret || '',
                  });
                  setShowConfigModal(true);
                }}
              >
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit App"
      >
        <form onSubmit={handleEditSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label>App Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <span className="help-text">
              3-30 characters, alphanumeric, underscore, and hyphen only
            </span>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update App'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Google Config Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configure Google Sign-In"
      >
        <form onSubmit={handleConfigSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="alert alert-info">
            Enter your Google OAuth credentials to enable Google Sign-In for this app.
            Leave empty to disable.
          </div>

          <div className="form-group">
            <label>Google Client ID</label>
            <input
              type="text"
              value={formData.googleClientId}
              onChange={(e) => setFormData({ ...formData, googleClientId: e.target.value })}
              placeholder="Enter Google Client ID"
            />
          </div>

          <div className="form-group">
            <label>Google Client Secret</label>
            <input
              type="text"
              value={formData.googleClientSecret}
              onChange={(e) => setFormData({ ...formData, googleClientSecret: e.target.value })}
              placeholder="Enter Google Client Secret"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowConfigModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete App"
      >
        <div>
          {error && <div className="alert alert-error">{error}</div>}
          
          <p style={{ marginBottom: '1rem' }}>
            Are you sure you want to delete <strong>{app.name}</strong>? This action cannot be undone.
            All users and data associated with this app will be permanently deleted.
          </p>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete App'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AppCard;
