import { useState, useEffect } from 'react';
import { logAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ClipboardList, LogIn, Shield, AlertTriangle, Filter } from 'lucide-react';

export default function ActivityLogsPage() {
  const [tab, setTab] = useState('activity');
  const [activityLogs, setActivityLogs] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', suspicious_only: false, failed_only: false });

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.action) params.action = filters.action;
      const res = await logAPI.activity(params);
      setActivityLogs(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed'); }
    setLoading(false);
  };

  const fetchLogin = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.suspicious_only) params.suspicious_only = true;
      if (filters.failed_only) params.failed_only = true;
      const res = await logAPI.login(params);
      setLoginLogs(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed'); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'activity') fetchActivity();
    else fetchLogin();
  }, [tab, page, filters]);

  const actionIcons = {
    login: '🔑', logout: '🚪', production_created: '🏭', production_updated: '✏️', production_deleted: '🗑️',
    material_created: '📦', stock_added: '📥', wastage_recorded: '⚠️', invoice_created: '🧾', payment_created: '💰',
    expense_created: '💸', user_created: '👤', party_created: '👥', password_changed: '🔒'
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Activity Logs</h1><p className="subtitle">System activity and login history</p></div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button className={`btn ${tab === 'activity' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('activity'); setPage(1); }}>
          <ClipboardList size={14} /> Activity Logs
        </button>
        <button className={`btn ${tab === 'login' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('login'); setPage(1); }}>
          <LogIn size={14} /> Login Logs
        </button>
      </div>

      {tab === 'activity' && (
        <div className="filters-bar">
          <input type="text" className="form-input" placeholder="Filter by action..." value={filters.action}
            onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }} />
        </div>
      )}

      {tab === 'login' && (
        <div className="filters-bar">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.suspicious_only}
              onChange={e => { setFilters({ ...filters, suspicious_only: e.target.checked }); setPage(1); }} />
            <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> Suspicious Only
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.failed_only}
              onChange={e => { setFilters({ ...filters, failed_only: e.target.checked }); setPage(1); }} />
            <Shield size={14} style={{ color: 'var(--error)' }} /> Failed Only
          </label>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : tab === 'activity' ? (
          activityLogs.length === 0 ? (
            <div className="empty-state"><div className="icon">📋</div><h3>No Activity Logs</h3></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th></th><th>Action</th><th>User</th><th>Entity</th><th>IP Address</th><th>Time</th></tr></thead>
                <tbody>
                  {activityLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 18 }}>{actionIcons[log.action] || '📝'}</td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 11, padding: '3px 8px',
                          background: 'var(--bg-secondary)', borderRadius: 4, fontWeight: 600
                        }}>{log.action?.replace(/_/g, ' ')}</span>
                      </td>
                      <td>{log.user?.name || '—'}</td>
                      <td>{log.entity_type ? `${log.entity_type} #${log.entity_id}` : '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loginLogs.length === 0 ? (
            <div className="empty-state"><div className="icon">🔐</div><h3>No Login Logs</h3></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Status</th><th>Email</th><th>User</th><th>IP</th><th>Device</th><th>Reason</th><th>Time</th></tr></thead>
                <tbody>
                  {loginLogs.map(log => (
                    <tr key={log.id} style={{ background: log.is_suspicious ? 'rgba(244,63,94,0.05)' : undefined }}>
                      <td>
                        <span className={`badge-status ${log.successful ? 'success' : 'error'}`}>
                          {log.successful ? '✓ Success' : '✗ Failed'}
                        </span>
                        {log.is_suspicious && <AlertTriangle size={12} style={{ marginLeft: 4, color: 'var(--warning)' }} />}
                      </td>
                      <td>{log.email}</td>
                      <td>{log.user?.name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.ip_address || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.user_agent || '—'}
                      </td>
                      <td style={{ color: log.reason ? 'var(--error)' : 'var(--text-muted)' }}>{log.reason || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {pagination.last_page > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page >= pagination.last_page} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}
