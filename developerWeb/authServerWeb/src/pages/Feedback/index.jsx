import { useState, useEffect, useRef } from 'react';
import feedbackService from '../../services/feedbackService';
import './Feedback.scss';

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
    feedbackService.getApps().then((r) => setApps(r.data?.apps || [])).catch(() => {});
    feedbackService.getGroups().then((r) => setGroups(r.data?.groups || [])).catch(() => {});
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
      <div className="feedback-page">
        <div className="container">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <h2>Thank you!</h2>
            <p>
              Your {form.type === 'issue' ? 'issue' : 'feedback'} has been received.
              We'll get back to you if needed.
            </p>
            <button className="btn-primary" onClick={() => setSuccess(false)}>
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <div className="container">
        <div className="page-header">
          <h1>Feedback &amp; Issues</h1>
          <p>
            Let us know about a problem you encountered or share your feedback
            to help us improve.
          </p>
        </div>

        <form className="feedback-form" onSubmit={handleSubmit} noValidate>
          {/* Type selector */}
          <div className="form-row type-row">
            <label className={`type-option ${form.type === 'feedback' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="type"
                value="feedback"
                checked={form.type === 'feedback'}
                onChange={handleChange}
              />
              💬 Feedback
            </label>
            <label className={`type-option ${form.type === 'issue' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="type"
                value="issue"
                checked={form.type === 'issue'}
                onChange={handleChange}
              />
              🐛 Issue / Bug
            </label>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Title <span className="optional">(optional)</span></label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              value={form.title}
              onChange={handleChange}
              placeholder="Short summary"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              required
              value={form.description}
              onChange={handleChange}
              placeholder={
                form.type === 'issue'
                  ? 'Describe the issue: steps to reproduce, what you expected vs. what happened…'
                  : 'Share your thoughts, suggestions, or ideas…'
              }
            />
          </div>

          {/* App selector */}
          {apps.length > 0 && (
            <div className="form-group">
              <label htmlFor="app_id">
                Related App <span className="optional">(optional)</span>
              </label>
              <select id="app_id" name="app_id" value={form.app_id} onChange={handleChange}>
                <option value="">— None —</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Group selector */}
          {groups.length > 0 && (
            <div className="form-group">
              <label htmlFor="group_id">
                Related Group <span className="optional">(optional)</span>
              </label>
              <select id="group_id" name="group_id" value={form.group_id} onChange={handleChange}>
                <option value="">— None —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* File attachments */}
          <div className="form-group">
            <label>
              Attachments{' '}
              <span className="optional">(max {MAX_FILES} files · 10 MB each)</span>
            </label>

            {files.length < MAX_FILES && (
              <label className="file-upload-btn">
                + Add File
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFiles}
                />
              </label>
            )}

            {fileError && <p className="field-error">{fileError}</p>}

            {files.length > 0 && (
              <ul className="file-list">
                {files.map((f, i) => (
                  <li key={i}>
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => removeFile(i)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
