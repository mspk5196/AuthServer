import { useState, useEffect, useCallback } from 'react';
import usageService from '../../services/usageService';
import './Usage.scss';

const GROUP_BY_OPTIONS = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
  { value: 'app',     label: 'By App' },
  { value: 'group',   label: 'By Group' },
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
    csvRows.push([
      `"${row.label || row.period || ''}"`,
      row.call_count,
      row.success_count,
      row.error_count,
      row.avg_response_ms ?? '',
    ].join(','));
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
  const [rows, setRows]       = useState([]);
  const [apps, setApps]       = useState([]);
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [groupBy, setGroupBy]     = useState('daily');
  const [startDate, setStartDate] = useState(formatDate(-30));
  const [endDate, setEndDate]     = useState(formatDate(0));
  const [appId, setAppId]         = useState('');
  const [groupId, setGroupId]     = useState('');

  // Load filter dropdowns on mount
  useEffect(() => {
    usageService.getApps()
      .then(r => setApps(r.data?.apps || []))
      .catch(() => {});
    usageService.getGroups()
      .then(r => setGroups(r.data?.groups || []))
      .catch(() => {});
  }, []);;

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
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const isTimeSeries = ['daily', 'weekly', 'monthly', 'yearly'].includes(groupBy);
  const totalCalls = rows.reduce((s, r) => s + Number(r.call_count || 0), 0);

  return (
    <div className="usage-page">
      <div className="usage-container">
        <div className="usage-header">
          <h1>API Usage History</h1>
          <p>Monitor your API call volume, success rates, and response times.</p>
        </div>

        {/* Filters */}
        <div className="usage-filters">
          <div className="filter-group">
            <label>View By</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              {GROUP_BY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={formatDate(0)}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {apps.length > 0 && (
            <div className="filter-group">
              <label>App</label>
              <select value={appId} onChange={e => setAppId(e.target.value)}>
                <option value="">All Apps</option>
                {apps.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {groups.length > 0 && (
            <div className="filter-group">
              <label>Group</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">All Groups</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <button className="btn btn-secondary btn-export" onClick={() => exportCsv(rows, groupBy)} disabled={!rows.length}>
            Export CSV
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Summary */}
        {!loading && rows.length > 0 && (
          <div className="usage-summary">
            <div className="summary-card">
              <span className="summary-value">{totalCalls.toLocaleString()}</span>
              <span className="summary-label">Total API Calls</span>
            </div>
            <div className="summary-card success">
              <span className="summary-value">
                {rows.reduce((s, r) => s + Number(r.success_count || 0), 0).toLocaleString()}
              </span>
              <span className="summary-label">Successful</span>
            </div>
            <div className="summary-card error">
              <span className="summary-value">
                {rows.reduce((s, r) => s + Number(r.error_count || 0), 0).toLocaleString()}
              </span>
              <span className="summary-label">Errors</span>
            </div>
            <div className="summary-card neutral">
              <span className="summary-value">
                {rows.length > 0
                  ? Math.round(rows.reduce((s, r) => s + Number(r.avg_response_ms || 0), 0) / rows.length)
                  : 0} ms
              </span>
              <span className="summary-label">Avg Response</span>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="usage-empty">
            <p>No API calls found for the selected period.</p>
          </div>
        ) : (
          <div className="usage-table-wrapper">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>{isTimeSeries ? 'Period' : 'Name'}</th>
                  <th>Total Calls</th>
                  <th>Successful</th>
                  <th>Errors</th>
                  <th>Avg Response</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const total = Number(row.call_count || 0);
                  const success = Number(row.success_count || 0);
                  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td className="col-label">{row.label || row.period}</td>
                      <td>{total.toLocaleString()}</td>
                      <td className="col-success">{success.toLocaleString()}</td>
                      <td className="col-error">{Number(row.error_count || 0).toLocaleString()}</td>
                      <td>{row.avg_response_ms != null ? `${row.avg_response_ms} ms` : '—'}</td>
                      <td>
                        <div className="rate-bar">
                          <div className="rate-fill" style={{ width: `${rate}%` }} />
                          <span>{rate}%</span>
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
