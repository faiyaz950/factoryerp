import { useState, useEffect } from 'react';
import { materialAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [showTransactions, setShowTransactions] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', low_stock: false, page: 1 });
  const [form, setForm] = useState({
    name: '', code: '', category: '', unit: 'kg', current_stock: '', minimum_stock: '',
    price_per_unit: '', supplier: '', description: ''
  });
  const [stockForm, setStockForm] = useState({ quantity: '', price_per_unit: '', remarks: '' });
  const [wastageForm, setWastageForm] = useState({ quantity: '', remarks: '' });
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.low_stock) params.low_stock = true;
      const res = await materialAPI.list(params);
      setMaterials(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filters]);

  useEffect(() => {
    materialAPI.categories().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', code: '', category: '', unit: 'kg', current_stock: '', minimum_stock: '', price_per_unit: '', supplier: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditItem(m);
    setForm({
      name: m.name, code: m.code, category: m.category || '', unit: m.unit,
      current_stock: m.current_stock, minimum_stock: m.minimum_stock,
      price_per_unit: m.price_per_unit, supplier: m.supplier || '', description: m.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await materialAPI.update(editItem.id, form);
        toast.success('Material updated!');
      } else {
        await materialAPI.create(form);
        toast.success('Material created!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await materialAPI.delete(id);
      toast.success('Deleted!');
      fetchData();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const openAddStock = (m) => {
    setSelectedMaterial(m);
    setStockForm({ quantity: '', price_per_unit: m.price_per_unit || '', remarks: '' });
    setShowStockModal(true);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await materialAPI.addStock(selectedMaterial.id, stockForm);
      toast.success('Stock added!');
      setShowStockModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openWastage = (m) => {
    setSelectedMaterial(m);
    setWastageForm({ quantity: '', remarks: '' });
    setShowWastageModal(true);
  };

  const handleWastage = async (e) => {
    e.preventDefault();
    try {
      await materialAPI.recordWastage(selectedMaterial.id, wastageForm);
      toast.success('Wastage recorded!');
      setShowWastageModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const viewTransactions = async (m) => {
    setSelectedMaterial(m);
    try {
      const res = await materialAPI.transactions(m.id);
      setTransactions(res.data.data || []);
      setShowTransactions(true);
    } catch (e) { toast.error('Failed'); }
  };

  const isLowStock = (m) => m.current_stock <= m.minimum_stock;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Materials</h1>
          <p className="subtitle">Manage raw materials and inventory</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Material
        </button>
      </div>

      <div className="filters-bar">
        <input type="text" className="form-input" placeholder="Search name/code..."
          value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select className="form-select" value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value, page: 1 })}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.low_stock}
            onChange={e => setFilters({ ...filters, low_stock: e.target.checked, page: 1 })} />
          <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> Low Stock Only
        </label>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : materials.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No Materials Found</h3>
            <p>Add your first raw material to start tracking</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Min Stock</th>
                  <th>Unit</th>
                  <th>Price/Unit</th>
                  <th>Value</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>{m.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.category || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: isLowStock(m) ? 'var(--error)' : 'var(--success)' }}>
                        {parseFloat(m.current_stock).toFixed(1)}
                      </span>
                      {isLowStock(m) && <AlertTriangle size={12} style={{ marginLeft: 4, color: 'var(--warning)' }} />}
                    </td>
                    <td>{parseFloat(m.minimum_stock).toFixed(1)}</td>
                    <td>{m.unit}</td>
                    <td>₹{parseFloat(m.price_per_unit).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>₹{(m.current_stock * m.price_per_unit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>{m.supplier || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Add Stock" onClick={() => openAddStock(m)} style={{ color: 'var(--success)' }}><ArrowUpCircle size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Record Wastage" onClick={() => openWastage(m)} style={{ color: 'var(--warning)' }}><ArrowDownCircle size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Transactions" onClick={() => viewTransactions(m)}><History size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(m)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDelete(m.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
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
          <div className="modal" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Material' : 'Add Material'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Code *</label>
                    <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. PP-001" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category</label>
                    <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} list="cat-list" />
                    <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
                  <div className="form-group"><label className="form-label">Unit *</label>
                    <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="kg">kg</option><option value="pcs">pcs</option><option value="litre">litre</option><option value="meter">meter</option>
                    </select></div>
                </div>
                <div className="form-row">
                  {!editItem && <div className="form-group"><label className="form-label">Current Stock *</label>
                    <input type="number" className="form-input" step="0.01" min="0" value={form.current_stock}
                      onChange={e => setForm({ ...form, current_stock: e.target.value })} required /></div>}
                  <div className="form-group"><label className="form-label">Minimum Stock *</label>
                    <input type="number" className="form-input" step="0.01" min="0" value={form.minimum_stock}
                      onChange={e => setForm({ ...form, minimum_stock: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Price/Unit (₹) *</label>
                    <input type="number" className="form-input" step="0.01" min="0" value={form.price_per_unit}
                      onChange={e => setForm({ ...form, price_per_unit: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Supplier</label>
                  <input className="form-input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={2} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowStockModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Add Stock — {selectedMaterial?.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowStockModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddStock}>
              <div className="modal-body">
                <div className="alert alert-info"><Package size={16} /> Current stock: <strong>{parseFloat(selectedMaterial?.current_stock).toFixed(1)} {selectedMaterial?.unit}</strong></div>
                <div className="form-group"><label className="form-label">Quantity *</label>
                  <input type="number" className="form-input" step="0.01" min="0.001" value={stockForm.quantity}
                    onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Price/Unit (₹) *</label>
                  <input type="number" className="form-input" step="0.01" min="0" value={stockForm.price_per_unit}
                    onChange={e => setStockForm({ ...stockForm, price_per_unit: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows={2} value={stockForm.remarks}
                    onChange={e => setStockForm({ ...stockForm, remarks: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wastage Modal */}
      {showWastageModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowWastageModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Record Wastage — {selectedMaterial?.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowWastageModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleWastage}>
              <div className="modal-body">
                <div className="alert alert-warning"><AlertTriangle size={16} /> Current stock: <strong>{parseFloat(selectedMaterial?.current_stock).toFixed(1)} {selectedMaterial?.unit}</strong></div>
                <div className="form-group"><label className="form-label">Wastage Quantity *</label>
                  <input type="number" className="form-input" step="0.01" min="0.001" value={wastageForm.quantity}
                    onChange={e => setWastageForm({ ...wastageForm, quantity: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Reason</label>
                  <textarea className="form-textarea" rows={2} value={wastageForm.remarks}
                    onChange={e => setWastageForm({ ...wastageForm, remarks: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowWastageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-warning">Record Wastage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransactions(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Stock History — {selectedMaterial?.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTransactions(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {transactions.length === 0 ? (
                <div className="empty-state"><p>No transactions yet</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Stock After</th><th>By</th><th>Remarks</th></tr></thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                          <td><span className={`badge-status ${t.type === 'purchase' ? 'success' : t.type === 'wastage' ? 'warning' : 'info'}`}>{t.type}</span></td>
                          <td style={{ fontWeight: 700, color: t.quantity > 0 ? 'var(--success)' : 'var(--error)' }}>
                            {t.quantity > 0 ? '+' : ''}{parseFloat(t.quantity).toFixed(2)}
                          </td>
                          <td>{parseFloat(t.stock_after).toFixed(2)}</td>
                          <td>{t.creator?.name || '—'}</td>
                          <td>{t.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
