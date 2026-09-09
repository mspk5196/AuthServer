import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Download, 
  Calendar, 
  Layers, 
  FolderGit2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  RefreshCw 
} from 'lucide-react';
import usageService from '../../services/usageService';

const GROUP_BY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'app', label: 'By App' },
  { value: 'group', label: 'By Group' },
];

const formatDate = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const exportCsv = (rows, groupBy) => {
  if (!rows.length) return;
  const isTimeSeries = ['daily', 'weekly', 'monthly', 'yearly'].includes(groupBy);
  const headers = isTimeSeries
    ? ['Period', 'Total Calls', 'Success', 'Errors', 'Avg Response (ms)']
    : ['Name', 'Total Calls', 'Success', 'Errors', 'Avg Response (ms)'];
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    csvRows.push(
      [
        `"${row.label || row.period || ''}"`,
        row.call_count,
        row.success_count,
        row.error_count,
        row.avg_response_ms ?? '',
      ].join(',')
    );
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `api-usage-${groupBy}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const Usage = () => {
  const [rows, setRows] = useState([]);
  const [apps, setApps] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [groupBy, setGroupBy] = useState('daily');
  const [startDate, setStartDate] = useState(formatDate(-30));
  const [endDate, setEndDate] = useState(formatDate(0));
  const [appId, setAppId] = useState('');
  const [groupId, setGroupId] = useState('');

  // Load filter dropdowns on mount
  useEffect(() => {
    usageService
      .getApps()
      .then((r) => setApps(r.data?.apps || []))
      .catch(() => {});
    usageService
      .getGroups()
      .then((r) => setGroups(r.data?.groups || []))
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usageService.getHistory({ groupBy, startDate, endDate, appId, groupId });
      setRows(res.data?.rows || []);
    } catch (err) {
      console.error('Usage history error:', err);
      setError('Failed to load usage history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupBy, startDate, endDate, appId, groupId]);

  // Auto-fetch on filter change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const isTimeSeries = ['daily', 'weekly', 'monthly', 'yearly'].includes(groupBy);
  const totalCalls = rows.reduce((s, r) => s + Number(r.call_count || 0), 0);
  const totalSuccess = rows.reduce((s, r) => s + Number(r.success_count || 0), 0);
  const totalErrors = rows.reduce((s, r) => s + Number(r.error_count || 0), 0);
  const avgResponse =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + Number(r.avg_response_ms || 0), 0) / rows.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-8 h-8 text-indigo-600" />
            API Usage &amp; Analytics
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            Monitor API call volume, endpoint latency, and health success rates across apps.
          </p>
        </div>

        <button
          onClick={() => exportCsv(rows, groupBy)}
          disabled={!rows.length || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          Export CSV
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Interval */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Interval
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            {GROUP_BY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={formatDate(0)}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Filter by App */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-purple-600" />
            Application
          </label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="">All Applications</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Group */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Group
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Summary */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total API Calls
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
              {totalCalls.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Across selected range</p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Successful Calls
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-600">
              {totalSuccess.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0}% success rate
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Errors / Blocks
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-rose-600">
              {totalErrors.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(1) : 0}% error rate
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Avg Latency
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-purple-700">
              {avgResponse} <span className="text-sm font-semibold text-slate-500">ms</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Average response time</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-medium">Loading usage statistics...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No API calls recorded</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              No API request traffic was detected for the selected filters and date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">{isTimeSeries ? 'Time Period' : 'Resource Name'}</th>
                  <th className="px-6 py-4">Total Calls</th>
                  <th className="px-6 py-4">Success</th>
                  <th className="px-6 py-4">Errors</th>
                  <th className="px-6 py-4">Avg Latency</th>
                  <th className="px-6 py-4 w-48">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {rows.map((row, i) => {
                  const total = Number(row.call_count || 0);
                  const success = Number(row.success_count || 0);
                  const rate = total > 0 ? Math.round((success / total) ? ((success / total) * 100) : 0) : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                        {row.label || row.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                        {total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">
                        {success.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-rose-600 font-bold">
                        {Number(row.error_count || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {row.avg_response_ms != null ? `${row.avg_response_ms} ms` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rate >= 95
                                  ? 'bg-emerald-500'
                                  : rate >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-10 text-right">
                            {rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Usage;
