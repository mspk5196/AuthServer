import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquarePlus, 
  MessageSquare,
  Bug, 
  Sparkles, 
  Paperclip, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  Clock,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import feedbackService from '../../services/feedbackService';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const STATUS_BADGES = {
  open: { label: 'Open', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-300' }
};

const Feedback = () => {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'

  // Submit Form State
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

  // History State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Thread Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const replyFileInputRef = useRef(null);

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

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    setHistoryError('');
    try {
      const res = await feedbackService.getList();
      setTickets(res?.data || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setHistoryError(err.message || 'Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
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

  const openThreadModal = async (ticket) => {
    setSelectedTicket(ticket);
    setThreadMessages([]);
    setReplyMessage('');
    setReplyFile(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    setReplyError('');
    setLoadingThread(true);
    try {
      const res = await feedbackService.getThread(ticket.id);
      if (res?.success) {
        setThreadMessages(res.data?.messages || []);
        if (res.data?.feedback) {
          setSelectedTicket(res.data.feedback);
        }
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendUserReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setSendingReply(true);
    setReplyError('');
    try {
      let replyFiles = [];
      if (replyFile) {
        replyFiles.push({
          name: replyFile.name,
          mimeType: replyFile.type || 'application/octet-stream',
          size: replyFile.size,
          data: await toBase64(replyFile)
        });
      }

      const res = await feedbackService.reply(selectedTicket.id, {
        message: replyMessage.trim(),
        files: replyFiles
      });

      if (res?.success) {
        setThreadMessages((prev) => [...prev, res.data]);
        setReplyMessage('');
        setReplyFile(null);
        if (replyFileInputRef.current) replyFileInputRef.current.value = '';
      } else {
        setReplyError(res?.message || 'Failed to send reply');
      }
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquarePlus className="w-8 h-8 text-indigo-600" />
            Developer Support &amp; Feedback
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            Submit bug reports, feature suggestions, and track real-time conversation threads with engineering.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('submit'); setSuccess(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Submit Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Submissions &amp; History
          </button>
        </div>
      </div>

      {/* ── TAB 1: SUBMIT FEEDBACK / ISSUE ─────────────────────────────── */}
      {activeTab === 'submit' && (
        <>
          {success ? (
            <div className="max-w-2xl mx-auto py-12">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Thank you for your submission!</h2>
                  <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto font-medium">
                    Your ticket has been recorded. Our team will review it and notify you via email and the Submissions tab.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Submit Another Response
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    View My Submissions &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Type Selector */}
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
                    <span>Title / Summary</span>
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
                          Click to select files or error logs (PNG, JPG, PDF, TXT, LOG)
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
          )}
        </>
      )}

      {/* ── TAB 2: MY SUBMISSIONS & HISTORY ───────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Submitted Tickets</h2>
            <button
              onClick={fetchTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {historyError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{historyError}</span>
            </div>
          )}

          {loadingTickets ? (
            <div className="flex justify-center items-center py-16 bg-white border border-slate-200 rounded-3xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No submissions found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven&apos;t submitted any feedback or bug reports yet. Submit one to get in touch with our team!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
              >
                Submit Feedback &rarr;
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Title / Issue</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {tickets.map((t) => {
                      const badge = STATUS_BADGES[t.status?.toLowerCase()] || STATUS_BADGES.open;
                      const isBug = t.type === 'issue';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                              isBug ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {isBug ? <Bug className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                              {t.type}
                            </span>
                          </td>

                          <td className="px-6 py-4 max-w-sm">
                            <p className="font-bold text-slate-900 truncate">{t.title || 'Untitled submission'}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                            {t.ref_id && (
                              <span className="mt-1 inline-block font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                {t.ref_id}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {new Date(t.created_at).toLocaleString()}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => openThreadModal(t)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>View Thread</span>
                              {t.reply_count > 0 && (
                                <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-bold ml-0.5">
                                  {t.reply_count}
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Thread Conversation Modal ── */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase border ${
                    selectedTicket.type === 'issue' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {selectedTicket.type}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedTicket.title || 'Submission Details'}
                  </h3>
                  {selectedTicket.ref_id && (
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedTicket.ref_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted on {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Conversation History */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Initial Submission Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Initial Developer Request</span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>

                {/* Attachments */}
                {selectedTicket.attachments && Array.isArray(selectedTicket.attachments) && selectedFeedbackAttachments(selectedTicket.attachments).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Attached Files:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedbackAttachments(selectedTicket.attachments).map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-mono truncate">{att.name || `Attachment ${idx + 1}`}</span>
                            {att.size && (
                              <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => feedbackService.downloadAttachment(selectedTicket.id, idx, att.name)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Stream */}
              {loadingThread ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading conversation history…</div>
              ) : threadMessages.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Our engineering team is reviewing your ticket. Any updates or responses will appear here and in your email.
                </div>
              ) : (
                threadMessages.map((msg) => {
                  const isAdmin = msg.sender_type === 'ADMIN';
                  const attachments = typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : (msg.attachments || []);
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-lg p-4 rounded-2xl border text-sm leading-relaxed ${
                        isAdmin
                          ? 'bg-indigo-50 text-indigo-950 border-indigo-200 shadow-xs'
                          : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1 text-[11px] font-bold opacity-80">
                          <span className={isAdmin ? 'text-indigo-600' : 'text-slate-500'}>
                            {isAdmin ? '🛡️ MSPK Support Team' : 'You'}
                          </span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>

                        {attachments.length > 0 && (
                          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 text-xs ${
                            isAdmin ? 'border-indigo-200 text-indigo-900' : 'border-slate-200 text-slate-600'
                          }`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="font-medium truncate">{attachments[0].name || 'Attachment'}</span>
                              {attachments[0].size && (
                                <span className="text-[10px] opacity-70">({Math.round(attachments[0].size / 1024)} KB)</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => feedbackService.downloadMessageAttachment(msg.id, attachments[0].name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition cursor-pointer shrink-0"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendUserReply} className="p-4 border-t border-slate-200 bg-white space-y-2">
              {replyError && (
                <div className="text-xs text-rose-500 px-1">{replyError}</div>
              )}
              {replyFile && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-indigo-700">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium truncate">{replyFile.name}</span>
                    <span className="text-[10px] opacity-70">({Math.round(replyFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyFile(null);
                      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
                    }}
                    className="text-indigo-500 hover:text-indigo-700 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type a follow-up reply to engineering..."
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 pr-10 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    title="Attach file to reply"
                    className="absolute right-3 bottom-3 text-slate-400 hover:text-indigo-600 cursor-pointer p-1"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        if (e.target.files[0].size > MAX_FILE_BYTES) {
                          alert('File exceeds 10 MB limit.');
                          return;
                        }
                        setReplyFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    disabled={sendingReply || !replyMessage.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    {sendingReply ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function selectedFeedbackAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

export default Feedback;
