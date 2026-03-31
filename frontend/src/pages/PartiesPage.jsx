import { useState, useEffect } from 'react';
import { partyAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Users, Phone, MapPin, FileText, IndianRupee, Eye } from 'lucide-react';

export default function PartiesPage() {
  const [parties, setParties] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [filters, setFilters] = useState({ search: '', type: '', with_dues: false, page: 1 });
  const [form, setForm] = useState({
    name: '', company_name: '', email: '', phone: '', gstin: '',
    address: '', city: '', state: '', pincode: '', type: 'customer', opening_balance: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.with_dues) params.with_dues = true;
      const res = await partyAPI.list(params);
      setParties(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filters]);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', company_name: '', email: '', phone: '', gstin: '', address: '', city: '', state: '', pincode: '', type: 'customer', opening_balance: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({
      name: p.name, company_name: p.company_name || '', email: p.email || '', phone: p.phone || '',
      gstin: p.gstin || '', address: p.address || '', city: p.city || '', state: p.state || '',
      pincode: p.pincode || '', type: p.type, opening_balance: p.opening_balance || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await partyAPI.update(editItem.id, form);
        toast.success('Party updated!');
      } else {
        await partyAPI.create(form);
        toast.success('Party created!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this party?')) return;
    try { await partyAPI.delete(id); toast.success('Deleted!'); fetchData(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const viewLedger = async (party) => {
    try {
      const res = await partyAPI.ledger(party.id);
      setLedgerData(res.data);
      setShowLedger(true);
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Parties</h1><p className="subtitle">Manage customers and suppliers</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add Party</button>
      </div>

      <div className="filters-bar">
        <input type="text" className="form-input" placeholder="Search name, company, phone, GSTIN..."
          value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select className="form-select" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })}>
          <option value="">All Types</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
          <option value="both">Both</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.with_dues}
            onChange={e => setFilters({ ...filters, with_dues: e.target.checked, page: 1 })} />
          <IndianRupee size={14} style={{ color: 'var(--warning)' }} /> With Dues Only
        </label>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : parties.length === 0 ? (
          <div className="empty-state"><div className="icon">👥</div><h3>No Parties Found</h3><p>Add your first customer or supplier</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Type</th><th>Phone</th><th>GSTIN</th><th>City</th><th>Balance</th><th>Actions</th></tr></thead>
              <tbody>
                {parties.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.company_name || '—'}</td>
                    <td><span className={`badge-status ${p.type === 'customer' ? 'info' : p.type === 'supplier' ? 'success' : 'warning'}`}>{p.type}</span></td>
                    <td>{p.phone ? <a href={`tel:${p.phone}`} style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>{p.phone}</a> : '—'}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.gstin || '—'}</span></td>
                    <td>{p.city || '—'}</td>
                    <td style={{ fontWeight: 700, color: parseFloat(p.current_balance) > 0 ? 'var(--error)' : 'var(--success)' }}>
                      ₹{parseFloat(p.current_balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Ledger" onClick={() => viewLedger(p)}><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDelete(p.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
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
            <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>←</button>
            {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={filters.page === p ? 'active' : ''} onClick={() => setFilters({ ...filters, page: p })}>{p}</button>
            ))}
            <button disabled={filters.page >= pagination.last_page} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>→</button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Party' : 'Add Party'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Company</label>
                    <input className="form-input" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Type *</label>
                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required>
                      <option value="customer">Customer</option><option value="supplier">Supplier</option><option value="both">Both</option>
                    </select></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">GSTIN</label>
                    <input className="form-input" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label>
                  <textarea className="form-textarea" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">City</label>
                    <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">State</label>
                    <input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Pincode</label>
                    <input className="form-input" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
                </div>
                {!editItem && (
                  <div className="form-group"><label className="form-label">Opening Balance (₹)</label>
                    <input type="number" className="form-input" step="0.01" value={form.opening_balance}
                      onChange={e => setForm({ ...form, opening_balance: e.target.value })} placeholder="0.00" /></div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedger && ledgerData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLedger(false)}>
          <div className="modal" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <h3>📒 Ledger — {ledgerData.party?.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLedger(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Opening</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>₹{parseFloat(ledgerData.party?.opening_balance || 0).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Current Balance</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: parseFloat(ledgerData.party?.current_balance) > 0 ? 'var(--error)' : 'var(--success)' }}>
                    ₹{parseFloat(ledgerData.party?.current_balance || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Entries</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{ledgerData.ledger?.length || 0}</div>
                </div>
              </div>
              {ledgerData.ledger?.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {ledgerData.ledger.map((item, i) => (
                        <tr key={i}>
                          <td>{new Date(item.date).toLocaleDateString('en-IN')}</td>
                          <td><span className={`badge-status ${item.type === 'invoice' ? 'info' : 'success'}`}>{item.type}</span></td>
                          <td>{item.invoice_number || item.payment_number || '—'}</td>
                          <td style={{ fontWeight: 700, color: item.type === 'payment' ? 'var(--success)' : 'var(--text-primary)' }}>
                            {item.type === 'payment' ? '-' : '+'}₹{parseFloat(item.amount).toLocaleString('en-IN')}
                          </td>
                          <td>{item.status ? <span className={`badge-status ${item.status}`}>{item.status}</span> : item.method || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><p>No transactions yet</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
