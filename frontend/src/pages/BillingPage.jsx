import { useState, useEffect } from 'react';
import { invoiceAPI, partyAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, FileText, Download, Share2, CreditCard, Eye, IndianRupee } from 'lucide-react';

export default function BillingPage() {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [parties, setParties] = useState([]);
  const [filters, setFilters] = useState({ party_id: '', status: '', date_from: '', date_to: '', method: '', page: 1 });

  const [invoiceForm, setInvoiceForm] = useState({
    party_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '',
    is_gst: true, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, discount: 0, notes: '',
    items: [{ item_name: '', hsn_code: '', quantity: '', unit: 'pcs', rate: '' }]
  });

  const [paymentForm, setPaymentForm] = useState({
    party_id: '', invoice_id: '', amount: '', method: 'cash', reference_number: '',
    payment_date: new Date().toISOString().split('T')[0], remarks: ''
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.party_id) params.party_id = filters.party_id;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await invoiceAPI.list(params);
      setInvoices(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed'); }
    setLoading(false);
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.party_id) params.party_id = filters.party_id;
      if (filters.method) params.method = filters.method;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await paymentAPI.list(params);
      setPayments(res.data.data || []);
      setPagination(res.data);
    } catch (e) { toast.error('Failed'); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'invoices') fetchInvoices();
    else fetchPayments();
  }, [tab, filters]);

  useEffect(() => {
    partyAPI.list({ per_page: 200 }).then(r => setParties(r.data.data || [])).catch(() => {});
  }, []);

  const addItem = () => {
    setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { item_name: '', hsn_code: '', quantity: '', unit: 'pcs', rate: '' }] });
  };

  const removeItem = (i) => {
    if (invoiceForm.items.length <= 1) return;
    setInvoiceForm({ ...invoiceForm, items: invoiceForm.items.filter((_, idx) => idx !== i) });
  };

  const updateItem = (i, field, value) => {
    const items = [...invoiceForm.items];
    items[i] = { ...items[i], [field]: value };
    setInvoiceForm({ ...invoiceForm, items });
  };

  const calcSubtotal = () => invoiceForm.items.reduce((s, item) => s + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);

  const calcTotal = () => {
    const sub = calcSubtotal();
    const disc = parseFloat(invoiceForm.discount) || 0;
    const taxable = sub - disc;
    const cgst = invoiceForm.is_gst ? taxable * (parseFloat(invoiceForm.cgst_rate) || 0) / 100 : 0;
    const sgst = invoiceForm.is_gst ? taxable * (parseFloat(invoiceForm.sgst_rate) || 0) / 100 : 0;
    const igst = invoiceForm.is_gst ? taxable * (parseFloat(invoiceForm.igst_rate) || 0) / 100 : 0;
    return { subtotal: sub, discount: disc, cgst, sgst, igst, total: taxable + cgst + sgst + igst };
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await invoiceAPI.create(invoiceForm);
      toast.success('Invoice created!');
      setShowInvoiceModal(false);
      setInvoiceForm({
        party_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '',
        is_gst: true, cgst_rate: 9, sgst_rate: 9, igst_rate: 0, discount: 0, notes: '',
        items: [{ item_name: '', hsn_code: '', quantity: '', unit: 'pcs', rate: '' }]
      });
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(paymentForm).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await paymentAPI.create(formData);
      toast.success('Payment recorded!');
      setShowPaymentModal(false);
      if (tab === 'payments') fetchPayments();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleWhatsApp = async (id) => {
    try {
      const res = await invoiceAPI.whatsapp(id);
      window.open(res.data.whatsapp_url, '_blank');
    } catch (e) { toast.error('Failed'); }
  };

  const handlePdf = async (id) => {
    try {
      const res = await invoiceAPI.pdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice-${id}.pdf`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch (e) { toast.error('Failed'); }
  };

  const viewInvoice = async (id) => {
    try {
      const res = await invoiceAPI.show(id);
      setShowDetail(res.data);
    } catch (e) { toast.error('Failed'); }
  };

  const handleDeleteInvoice = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try { await invoiceAPI.delete(id); toast.success('Deleted!'); fetchInvoices(); }
    catch (e) { toast.error('Failed'); }
  };

  const totals = calcTotal();

  return (
    <div>
      <div className="page-header">
        <div><h1>Billing</h1><p className="subtitle">Manage invoices and payments</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}><Plus size={16} /> New Invoice</button>
          <button className="btn btn-success" onClick={() => setShowPaymentModal(true)}><CreditCard size={16} /> Record Payment</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button className={`btn ${tab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab('invoices'); setFilters({ ...filters, page: 1 }); }}>
          <FileText size={14} /> Invoices
        </button>
        <button className={`btn ${tab === 'payments' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab('payments'); setFilters({ ...filters, page: 1 }); }}>
          <CreditCard size={14} /> Payments
        </button>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filters.party_id} onChange={e => setFilters({ ...filters, party_id: e.target.value, page: 1 })}>
          <option value="">All Parties</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}{p.company_name ? ` (${p.company_name})` : ''}</option>)}
        </select>
        {tab === 'invoices' && (
          <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">All Status</option>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option>
            <option value="partial">Partial</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
          </select>
        )}
        {tab === 'payments' && (
          <select className="form-select" value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value, page: 1 })}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option><option value="other">Other</option>
          </select>
        )}
        <input type="date" className="form-input" value={filters.date_from}
          onChange={e => setFilters({ ...filters, date_from: e.target.value, page: 1 })} />
        <input type="date" className="form-input" value={filters.date_to}
          onChange={e => setFilters({ ...filters, date_to: e.target.value, page: 1 })} />
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : tab === 'invoices' ? (
          invoices.length === 0 ? (
            <div className="empty-state"><div className="icon">🧾</div><h3>No Invoices</h3></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Party</th><th>Date</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>{inv.party?.name || '—'}</td>
                      <td>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>₹{parseFloat(inv.grand_total || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--success)' }}>₹{parseFloat(inv.paid_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: parseFloat(inv.balance_due) > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>
                        ₹{parseFloat(inv.balance_due || 0).toLocaleString('en-IN')}
                      </td>
                      <td><span className={`badge-status ${inv.status}`}>{inv.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => viewInvoice(inv.id)}><Eye size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="PDF" onClick={() => handlePdf(inv.id)}><Download size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="WhatsApp" onClick={() => handleWhatsApp(inv.id)} style={{ color: '#25D366' }}><Share2 size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => handleDeleteInvoice(inv.id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          payments.length === 0 ? (
            <div className="empty-state"><div className="icon">💳</div><h3>No Payments</h3></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Party</th><th>Date</th><th>Amount</th><th>Method</th><th>Invoice</th><th>Ref</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace' }}>{p.payment_number}</td>
                      <td>{p.party?.name || '—'}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      <td><span className="badge-status info">{p.method}</span></td>
                      <td>{p.invoice?.invoice_number || '—'}</td>
                      <td>{p.reference_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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

      {/* Invoice Creation Modal */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvoiceModal(false)}>
          <div className="modal" style={{ maxWidth: 850, maxHeight: '95vh' }}>
            <div className="modal-header">
              <h3>Create Invoice</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInvoiceModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Party *</label>
                    <select className="form-select" value={invoiceForm.party_id}
                      onChange={e => setInvoiceForm({ ...invoiceForm, party_id: e.target.value })} required>
                      <option value="">Select party</option>
                      {parties.map(p => <option key={p.id} value={p.id}>{p.name}{p.company_name ? ` (${p.company_name})` : ''}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Invoice Date *</label>
                    <input type="date" className="form-input" value={invoiceForm.invoice_date}
                      onChange={e => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={invoiceForm.due_date}
                      onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
                </div>

                {/* GST Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={invoiceForm.is_gst}
                      onChange={e => setInvoiceForm({ ...invoiceForm, is_gst: e.target.checked })} />
                    <strong>GST Invoice</strong>
                  </label>
                  {invoiceForm.is_gst && (
                    <>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <input type="number" className="form-input" step="0.01" placeholder="CGST %" value={invoiceForm.cgst_rate}
                          onChange={e => setInvoiceForm({ ...invoiceForm, cgst_rate: e.target.value })} style={{ padding: '6px 10px' }} />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <input type="number" className="form-input" step="0.01" placeholder="SGST %" value={invoiceForm.sgst_rate}
                          onChange={e => setInvoiceForm({ ...invoiceForm, sgst_rate: e.target.value })} style={{ padding: '6px 10px' }} />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <input type="number" className="form-input" step="0.01" placeholder="IGST %" value={invoiceForm.igst_rate}
                          onChange={e => setInvoiceForm({ ...invoiceForm, igst_rate: e.target.value })} style={{ padding: '6px 10px' }} />
                      </div>
                    </>
                  )}
                </div>

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ margin: 0 }}>Invoice Items *</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={14} /> Add Item</button>
                  </div>
                  {invoiceForm.items.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 1fr 32px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                      <div><input className="form-input" placeholder="Item name" value={item.item_name}
                        onChange={e => updateItem(i, 'item_name', e.target.value)} required style={{ padding: '8px 10px' }} /></div>
                      <div><input className="form-input" placeholder="HSN" value={item.hsn_code}
                        onChange={e => updateItem(i, 'hsn_code', e.target.value)} style={{ padding: '8px 10px' }} /></div>
                      <div><input type="number" className="form-input" placeholder="Qty" step="0.01" min="0.001" value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)} required style={{ padding: '8px 10px' }} /></div>
                      <div><select className="form-select" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} style={{ padding: '8px 10px' }}>
                        <option value="pcs">pcs</option><option value="kg">kg</option><option value="box">box</option><option value="dozen">dozen</option>
                      </select></div>
                      <div><input type="number" className="form-input" placeholder="Rate ₹" step="0.01" min="0" value={item.rate}
                        onChange={e => updateItem(i, 'rate', e.target.value)} required style={{ padding: '8px 10px' }} /></div>
                      <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div className="form-group" style={{ marginBottom: 8 }}><label className="form-label">Discount (₹)</label>
                    <input type="number" className="form-input" step="0.01" min="0" value={invoiceForm.discount}
                      onChange={e => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} style={{ maxWidth: 200 }} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                    {totals.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-₹{totals.discount.toFixed(2)}</span></div>}
                    {invoiceForm.is_gst && totals.cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST ({invoiceForm.cgst_rate}%)</span><span>₹{totals.cgst.toFixed(2)}</span></div>}
                    {invoiceForm.is_gst && totals.sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST ({invoiceForm.sgst_rate}%)</span><span>₹{totals.sgst.toFixed(2)}</span></div>}
                    {invoiceForm.is_gst && totals.igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IGST ({invoiceForm.igst_rate}%)</span><span>₹{totals.igst.toFixed(2)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                      <span>Grand Total</span><span>₹{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}><label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={invoiceForm.notes}
                    onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Party *</label>
                  <select className="form-select" value={paymentForm.party_id}
                    onChange={e => setPaymentForm({ ...paymentForm, party_id: e.target.value })} required>
                    <option value="">Select party</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount (₹) *</label>
                    <input type="number" className="form-input" step="0.01" min="0.01" value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Method *</label>
                    <select className="form-select" value={paymentForm.method}
                      onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })} required>
                      <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option><option value="other">Other</option>
                    </select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={paymentForm.payment_date}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Reference #</label>
                    <input className="form-input" value={paymentForm.reference_number}
                      onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows={2} value={paymentForm.remarks}
                    onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Invoice #{showDetail.invoice_number}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div><strong>Party:</strong> {showDetail.party?.name}<br/><small style={{ color: 'var(--text-muted)' }}>{showDetail.party?.company_name}</small></div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Date:</strong> {new Date(showDetail.invoice_date).toLocaleDateString('en-IN')}<br/>
                  <span className={`badge-status ${showDetail.status}`}>{showDetail.status}</span>
                </div>
              </div>
              {showDetail.items?.length > 0 && (
                <div className="table-container" style={{ marginBottom: 16 }}>
                  <table>
                    <thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                    <tbody>
                      {showDetail.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.item_name}</td><td>{item.hsn_code || '—'}</td>
                          <td>{item.quantity} {item.unit}</td><td>₹{parseFloat(item.rate).toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>₹{parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span>₹{parseFloat(showDetail.subtotal || 0).toFixed(2)}</span></div>
                {showDetail.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Discount</span><span>-₹{parseFloat(showDetail.discount).toFixed(2)}</span></div>}
                {showDetail.cgst_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>CGST</span><span>₹{parseFloat(showDetail.cgst_amount).toFixed(2)}</span></div>}
                {showDetail.sgst_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SGST</span><span>₹{parseFloat(showDetail.sgst_amount).toFixed(2)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                  <span>Grand Total</span><span>₹{parseFloat(showDetail.grand_total || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'var(--success)' }}>
                  <span>Paid</span><span>₹{parseFloat(showDetail.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)', fontWeight: 700 }}>
                  <span>Balance Due</span><span>₹{parseFloat(showDetail.balance_due || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
