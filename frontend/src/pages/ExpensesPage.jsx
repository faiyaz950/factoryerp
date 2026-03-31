import { useState, useEffect } from 'react';
import { expenseAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Receipt, Tag, Calendar } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ category_id: '', date_from: '', date_to: '', page: 1 });
  const [form, setForm] = useState({
    category_id: '', date: new Date().toISOString().split('T')[0],
    amount: '', description: '', payment_method: 'cash'
  });
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await expenseAPI.list(params);
      setExpenses(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await expenseAPI.categories();
      setCategories(res.data || []);
    } catch (e) {}
  };

  useEffect(() => { fetchData(); }, [filters]);
  useEffect(() => { fetchCategories(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ category_id: '', date: new Date().toISOString().split('T')[0], amount: '', description: '', payment_method: 'cash' });
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditItem(exp);
    setForm({
      category_id: exp.category_id, date: exp.date, amount: exp.amount,
      description: exp.description, payment_method: exp.payment_method
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await expenseAPI.update(editItem.id, form);
        toast.success('Expense updated!');
      } else {
        await expenseAPI.create(form);
        toast.success('Expense recorded!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await expenseAPI.delete(id); toast.success('Deleted!'); fetchData(); }
    catch (e) { toast.error('Failed'); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await expenseAPI.createCategory(catForm);
      toast.success('Category created!');
      setShowCatModal(false);
      setCatForm({ name: '', description: '' });
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try { await expenseAPI.deleteCategory(id); toast.success('Deleted!'); fetchCategories(); }
    catch (e) { toast.error('Failed'); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const methodColors = { cash: 'success', upi: 'info', bank_transfer: 'warning', other: 'draft' };

  return (
    <div>
      <div className="page-header">
        <div><h1>Expenses</h1><p className="subtitle">Track daily expenses and categories</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowCatModal(true)}>
            <Tag size={14} /> Categories
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filters.category_id}
          onChange={e => setFilters({ ...filters, category_id: e.target.value, page: 1 })}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.expenses_count || 0})</option>)}
        </select>
        <input type="date" className="form-input" value={filters.date_from}
          onChange={e => setFilters({ ...filters, date_from: e.target.value, page: 1 })} />
        <input type="date" className="form-input" value={filters.date_to}
          onChange={e => setFilters({ ...filters, date_to: e.target.value, page: 1 })} />
        {expenses.length > 0 && (
          <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary-light)' }}>
            Page Total: ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state"><div className="icon">🧾</div><h3>No Expenses</h3><p>Start recording your expenses</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>By</th><th>Actions</th></tr></thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                    <td><span className="badge-status info">{exp.category?.name || '—'}</span></td>
                    <td style={{ maxWidth: 300 }}>{exp.description}</td>
                    <td style={{ fontWeight: 700, color: 'var(--error)' }}>₹{parseFloat(exp.amount).toLocaleString('en-IN')}</td>
                    <td><span className={`badge-status ${methodColors[exp.payment_method] || 'draft'}`}>{exp.payment_method?.replace('_', ' ')}</span></td>
                    <td>{exp.creator?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(exp)}><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(exp.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
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

      {/* Expense Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category *</label>
                    <select className="form-select" value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount (₹) *</label>
                    <input type="number" className="form-input" step="0.01" min="0.01" value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Payment Method *</label>
                    <select className="form-select" value={form.payment_method}
                      onChange={e => setForm({ ...form, payment_method: e.target.value })} required>
                      <option value="cash">Cash</option><option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
                    </select></div>
                </div>
                <div className="form-group"><label className="form-label">Description *</label>
                  <textarea className="form-textarea" rows={3} value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Record Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Expense Categories</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCatModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="form-input" placeholder="Category name" value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })} required style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
              </form>
              {categories.length === 0 ? (
                <div className="empty-state"><p>No categories yet</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Name</th><th>Expenses</th><th>Action</th></tr></thead>
                    <tbody>
                      {categories.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{c.expenses_count || 0}</td>
                          <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteCategory(c.id)}
                            style={{ color: 'var(--error)' }}><Trash2 size={14} /></button></td>
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
