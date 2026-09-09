import { useState } from 'react';
import Modal from '../Modal';
import { api } from '../../utils/api';
import { validateAppName } from '../../utils/validators';
import { Copy, Check, Edit2, Trash2, Settings, ExternalLink, Key } from 'lucide-react';

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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{app.name}</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Created {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer text-xs font-semibold"
              onClick={() => setShowEditModal(true)}
              title="Edit App"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer text-xs font-semibold"
              onClick={() => setShowDeleteModal(true)}
              title="Delete App"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">
              Base URL
            </label>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="truncate font-mono text-slate-700">{baseUrl}</code>
              <button
                className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                onClick={() => handleCopy(baseUrl, 'url')}
                title="Copy to clipboard"
              >
                {copied === 'url' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">
              API Key
            </label>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="truncate font-mono text-slate-700">{app.api_key}</code>
              <button
                className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                onClick={() => handleCopy(app.api_key, 'key')}
                title="Copy to clipboard"
              >
                {copied === 'key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Google Sign-In:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                app.google_client_id
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {app.google_client_id ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <button
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer"
              onClick={() => {
                setFormData({
                  ...formData,
                  googleClientId: app.google_client_id || '',
                  googleClientSecret: app.google_client_secret || '',
                });
                setShowConfigModal(true);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit App"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              App Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
            <span className="block mt-1 text-[11px] text-slate-500 font-medium">
              3-30 characters, alphanumeric, underscore, and hyphen only
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
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
        <form onSubmit={handleConfigSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{error}</div>}
          
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-medium leading-relaxed">
            Enter your Google OAuth credentials to enable Google Sign-In for this app. Leave empty to disable.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Google Client ID
            </label>
            <input
              type="text"
              value={formData.googleClientId}
              onChange={(e) => setFormData({ ...formData, googleClientId: e.target.value })}
              placeholder="Enter Google Client ID"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Google Client Secret
            </label>
            <input
              type="text"
              value={formData.googleClientSecret}
              onChange={(e) => setFormData({ ...formData, googleClientSecret: e.target.value })}
              placeholder="Enter Google Client Secret"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setShowConfigModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
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
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">{error}</div>}
          
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Are you sure you want to delete <strong>{app.name}</strong>? This action cannot be undone. All users and data associated with this app will be permanently deleted.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
