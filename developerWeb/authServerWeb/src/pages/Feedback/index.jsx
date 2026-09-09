import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquarePlus, 
  Bug, 
  Sparkles, 
  Paperclip, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  HelpCircle
} from 'lucide-react';
import feedbackService from '../../services/feedbackService';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const Feedback = () => {
  const [form, setForm] = useState({
    type: 'feedback',
    title: '',
    description: '',
    app_id: '',
    group_id: '',
  });
  const [apps, setApps] = useState([]);
  const [groups, setGroups] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    feedbackService
      .getApps()
      .then((r) => setApps(r.data?.apps || []))
      .catch(() => {});
    feedbackService
      .getGroups()
      .then((r) => setGroups(r.data?.groups || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // strip data: prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (e) => {
    setFileError('');
    const selected = Array.from(e.target.files || []);
    const combined = [...files, ...selected];

    if (combined.length > MAX_FILES) {
      setFileError(`You can attach at most ${MAX_FILES} files.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (const f of selected) {
      if (f.size > MAX_FILE_BYTES) {
        setFileError(`"${f.name}" exceeds the 10 MB limit.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // Convert to base64
    const newEntries = await Promise.all(
      selected.map(async (f) => ({
        name: f.name,
        mimeType: f.type || 'application/octet-stream',
        size: f.size,
        data: await toBase64(f),
      }))
    );

    setFiles((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFileError('');

    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.submit({
        type: form.type,
        title: form.title.trim() || undefined,
        description: form.description.trim(),
        app_id: form.app_id || undefined,
        group_id: form.group_id || undefined,
        files,
      });
      setSuccess(true);
      setForm({ type: 'feedback', title: '', description: '', app_id: '', group_id: '' });
      setFiles([]);
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Thank you for your submission!</h2>
            <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto font-medium">
              Your feedback helps us continuously improve the MSPK™ developer platform and auth services.
            </p>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <MessageSquarePlus className="w-8 h-8 text-indigo-600" />
          Feedback &amp; Issue Report
        </h1>
        <p className="text-slate-600 text-sm mt-1 font-medium">
          Encountered a bug or have a suggestion? Send your input directly to our engineering team.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Submission Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'feedback' }))}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                  form.type === 'feedback'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Feature Feedback / Idea
              </button>

              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'issue' }))}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                  form.type === 'issue'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bug className="w-4 h-4 text-rose-600" />
                Report a Bug / Issue
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Title</span>
              <span className="text-slate-400 lowercase font-normal">optional</span>
            </label>
            <input
              name="title"
              type="text"
              maxLength={200}
              value={form.title}
              onChange={handleChange}
              placeholder={
                form.type === 'issue'
                  ? 'e.g. 401 error on OAuth token exchange'
                  : 'e.g. Webhook support for user logins'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>

          {/* App / Group Association */}
          {(apps.length > 0 || groups.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {apps.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Related App</span>
                    <span className="text-slate-400 lowercase font-normal">optional</span>
                  </label>
                  <select
                    name="app_id"
                    value={form.app_id}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="">— Not App Specific —</option>
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {groups.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Related Group</span>
                    <span className="text-slate-400 lowercase font-normal">optional</span>
                  </label>
                  <select
                    name="group_id"
                    value={form.group_id}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="">— Not Group Specific —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Detailed Description</span>
              <span className="text-rose-500 lowercase font-bold">* required</span>
            </label>
            <textarea
              name="description"
              rows={6}
              required
              value={form.description}
              onChange={handleChange}
              placeholder={
                form.type === 'issue'
                  ? 'Please describe steps to reproduce, expected behavior vs actual outcome, and any error logs...'
                  : 'Share your feedback, ideas, or how this feature would help your workflow...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y font-medium"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                Attachments
              </span>
              <span className="text-slate-400 text-xs lowercase">max {MAX_FILES} files · 10 MB each</span>
            </label>

            <div className="space-y-3">
              {files.length < MAX_FILES && (
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    Click to select files or error logs (PNG, JPG, PDF, TXT)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                  />
                </div>
              )}

              {fileError && (
                <p className="text-xs text-rose-600 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fileError}
                </p>
              )}

              {files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="truncate font-semibold">{f.name}</span>
                        <span className="text-slate-500 text-[10px]">
                          ({(f.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
