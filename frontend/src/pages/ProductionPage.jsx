import { useState, useEffect } from 'react';
import { productionAPI, materialAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Filter, X, Factory, Calendar, Sun, Moon, Download } from 'lucide-react';

export default function ProductionPage() {
  const [productions, setProductions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', shift: '', item: '', page: 1 });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], shift: 'day', item: '', mould: '',
    shots: '', cavity: '', weight_per_piece: '', wastage_weight: '',
    operator: '', machine: '', material_id: '', remarks: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await productionAPI.list(params);
      setProductions(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filters]);

  useEffect(() => {
    materialAPI.list({ per_page: 200 }).then(r => setMaterials(r.data.data || [])).catch(() => {});
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({
      date: new Date().toISOString().split('T')[0], shift: 'day', item: '', mould: '',
      shots: '', cavity: '', weight_per_piece: '', wastage_weight: '',
      operator: '', machine: '', material_id: '', remarks: ''
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({
      date: p.date, shift: p.shift, item: p.item, mould: p.mould || '',
      shots: p.shots, cavity: p.cavity, weight_per_piece: p.weight_per_piece,
      wastage_weight: p.wastage_weight || '', operator: p.operator,
      machine: p.machine || '', material_id: p.material_id || '', remarks: p.remarks || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!data.material_id) delete data.material_id;
      if (editItem) {
        await productionAPI.update(editItem.id, data);
        toast.success('Updated!');
      } else {
        await productionAPI.create(data);
        toast.success('Production entry created!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this production entry?')) return;
    try {
      await productionAPI.delete(id);
      toast.success('Deleted!');
      fetchData();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const calcQty = () => {
    const s = parseInt(form.shots) || 0;
    const c = parseInt(form.cavity) || 0;
    return s * c;
  };

  const calcWeight = () => {
    const qty = calcQty();
    const w = parseFloat(form.weight_per_piece) || 0;
    return ((qty * w) / 1000).toFixed(2);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Production</h1>
          <p className="subtitle">Track daily production entries</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input type="date" className="form-input" value={filters.date_from}
          onChange={e => setFilters({ ...filters, date_from: e.target.value, page: 1 })} />
        <input type="date" className="form-input" value={filters.date_to}
          onChange={e => setFilters({ ...filters, date_to: e.target.value, page: 1 })} />
        <select className="form-select" value={filters.shift}
          onChange={e => setFilters({ ...filters, shift: e.target.value, page: 1 })}>
          <option value="">All Shifts</option>
          <option value="day">Day</option>
          <option value="night">Night</option>
        </select>
        <input type="text" className="form-input" placeholder="Search item..."
          value={filters.item} onChange={e => setFilters({ ...filters, item: e.target.value, page: 1 })} />
        {(filters.date_from || filters.date_to || filters.shift || filters.item) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ date_from: '', date_to: '', shift: '', item: '', page: 1 })}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : productions.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏭</div>
            <h3>No Production Entries</h3>
            <p>Start by adding your first production entry</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Item</th>
                  <th>Operator</th>
                  <th>Shots</th>
                  <th>Cavity</th>
                  <th>Qty</th>
                  <th>Weight (kg)</th>
                  <th>Wastage (kg)</th>
                  <th>Machine</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productions.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                    <td><span className={`badge-status ${p.shift}`}>{p.shift === 'day' ? <><Sun size={10} /> Day</> : <><Moon size={10} /> Night</>}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.item}</td>
                    <td>{p.operator}</td>
                    <td>{p.shots}</td>
                    <td>{p.cavity}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{p.production_qty}</td>
                    <td>{parseFloat(p.total_weight || 0).toFixed(2)}</td>
                    <td>{p.wastage_weight ? <span className="text-warning">{parseFloat(p.wastage_weight).toFixed(2)}</span> : '—'}</td>
                    <td>{p.machine || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="pagination">
            <button disabled={!pagination.prev_page_url} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>←</button>
            {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
              const p = i + 1;
              return <button key={p} className={filters.page === p ? 'active' : ''} onClick={() => setFilters({ ...filters, page: p })}>{p}</button>;
            })}
            <button disabled={!pagination.next_page_url} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>→</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Production Entry' : 'New Production Entry'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shift *</label>
                    <select className="form-select" value={form.shift}
                      onChange={e => setForm({ ...form, shift: e.target.value })} required>
                      <option value="day">☀️ Day Shift</option>
                      <option value="night">🌙 Night Shift</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. PP Chair"
                      value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mould</label>
                    <input type="text" className="form-input" placeholder="e.g. M-001"
                      value={form.mould} onChange={e => setForm({ ...form, mould: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Shots *</label>
                    <input type="number" className="form-input" min="0"
                      value={form.shots} onChange={e => setForm({ ...form, shots: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cavity *</label>
                    <input type="number" className="form-input" min="1"
                      value={form.cavity} onChange={e => setForm({ ...form, cavity: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight/Piece (gm) *</label>
                    <input type="number" className="form-input" step="0.01" min="0"
                      value={form.weight_per_piece} onChange={e => setForm({ ...form, weight_per_piece: e.target.value })} required />
                  </div>
                </div>

                {/* Auto-calculated */}
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="alert alert-info" style={{ flex: 1, margin: 0 }}>
                    <Factory size={16} />
                    <span>Production Qty: <strong>{calcQty()} pcs</strong> | Total Weight: <strong>{calcWeight()} kg</strong></span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Wastage Weight (kg)</label>
                    <input type="number" className="form-input" step="0.01" min="0"
                      value={form.wastage_weight} onChange={e => setForm({ ...form, wastage_weight: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Operator *</label>
                    <input type="text" className="form-input" placeholder="Worker name"
                      value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Machine</label>
                    <input type="text" className="form-input" placeholder="e.g. Machine-1"
                      value={form.machine} onChange={e => setForm({ ...form, machine: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Raw Material</label>
                    <select className="form-select" value={form.material_id}
                      onChange={e => setForm({ ...form, material_id: e.target.value })}>
                      <option value="">Select material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows={2}
                    value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
