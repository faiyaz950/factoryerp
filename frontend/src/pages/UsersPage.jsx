import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, X, UserCog, Shield, LogOut, Power, PowerOff } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'supervisor', phone: '', is_active: true });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers({ page });
      setUsers(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', email: '', password: '', role: 'supervisor', phone: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditItem(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', is_active: u.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        const data = { ...form };
        if (!data.password) delete data.password;
        await authAPI.updateUser(editItem.id, data);
        toast.success('User updated!');
      } else {
        await authAPI.createUser(form);
        toast.success('User created!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleForceLogout = async (id, name) => {
    if (!confirm(`Force logout ${name} from all devices?`)) return;
    try { await authAPI.forceLogout(id); toast.success(`${name} logged out from all devices`); }
    catch (e) { toast.error('Failed'); }
  };

  const toggleActive = async (user) => {
    try {
      await authAPI.updateUser(user.id, { is_active: !user.is_active });
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>User Management</h1><p className="subtitle">Manage system users and access</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add User</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><div className="icon">👤</div><h3>No Users</h3></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: u.role === 'admin' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'linear-gradient(135deg, var(--success), #14b8a6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>{u.name?.charAt(0)?.toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`badge-status ${u.role === 'admin' ? 'info' : 'success'}`}>
                      {u.role === 'admin' ? <><Shield size={10} /> Admin</> : <><UserCog size={10} /> Supervisor</>}
                    </span></td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <button onClick={() => toggleActive(u)} className="btn btn-ghost btn-sm" style={{ padding: '2px 10px' }}>
                        <span className={`badge-status ${u.is_active ? 'active' : 'error'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Force Logout" onClick={() => handleForceLogout(u.id, u.name)} style={{ color: 'var(--warning)' }}><LogOut size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.last_page > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page >= pagination.last_page} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit User' : 'Create User'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">{editItem ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input type="password" className="form-input" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} {...(!editItem && { required: true })} placeholder="Min 8 chars, mixed case, numbers" /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Role *</label>
                    <select className="form-select" value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })} required>
                      <option value="admin">Admin</option><option value="supervisor">Supervisor</option>
                    </select></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
