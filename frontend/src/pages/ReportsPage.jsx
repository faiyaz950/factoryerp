import { useState } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Factory, Package, AlertTriangle, DollarSign, Users, FileText, Download } from 'lucide-react';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function ReportsPage() {
  const [tab, setTab] = useState('production');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    date_from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  });
  const [productionData, setProductionData] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [wastageData, setWastageData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [duesData, setDuesData] = useState(null);

  const fetchReport = async (type) => {
    setLoading(true);
    try {
      switch (type) {
        case 'production': {
          const res = await reportAPI.production(dateRange);
          setProductionData(res.data);
          break;
        }
        case 'stock': {
          const res = await reportAPI.stock();
          setStockData(res.data);
          break;
        }
        case 'wastage': {
          const res = await reportAPI.wastage(dateRange);
          setWastageData(res.data);
          break;
        }
        case 'profitLoss': {
          const res = await reportAPI.profitLoss(dateRange);
          setProfitData(res.data);
          break;
        }
        case 'partyDues': {
          const res = await reportAPI.partyDues();
          setDuesData(res.data);
          break;
        }
      }
    } catch (e) { toast.error('Failed to fetch report'); }
    setLoading(false);
  };

  const tabs = [
    { key: 'production', label: 'Production', icon: Factory },
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'wastage', label: 'Wastage', icon: AlertTriangle },
    { key: 'profitLoss', label: 'Profit/Loss', icon: DollarSign },
    { key: 'partyDues', label: 'Party Dues', icon: Users },
  ];

  const needsDateRange = ['production', 'wastage', 'profitLoss'];

  return (
    <div>
      <div className="page-header">
        <div><h1>Reports</h1><p className="subtitle">Detailed analytics and insights</p></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="filters-bar">
        {needsDateRange.includes(tab) && (
          <>
            <input type="date" className="form-input" value={dateRange.date_from}
              onChange={e => setDateRange({ ...dateRange, date_from: e.target.value })} />
            <input type="date" className="form-input" value={dateRange.date_to}
              onChange={e => setDateRange({ ...dateRange, date_to: e.target.value })} />
          </>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => fetchReport(tab)} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {loading && <div className="loading-spinner"><div className="spinner" /></div>}

      {/* Production Report */}
      {tab === 'production' && productionData && (
        <div className="animate-fade">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card purple">
              <div className="stat-info"><h4>Total Qty</h4><div className="stat-value">{productionData.totals?.qty || 0}</div></div>
              <div className="stat-icon purple"><Factory size={22} /></div>
            </div>
            <div className="stat-card green">
              <div className="stat-info"><h4>Total Weight</h4><div className="stat-value">{parseFloat(productionData.totals?.weight || 0).toFixed(1)} kg</div></div>
              <div className="stat-icon green"><Package size={22} /></div>
            </div>
            <div className="stat-card orange">
              <div className="stat-info"><h4>Total Wastage</h4><div className="stat-value">{parseFloat(productionData.totals?.wastage || 0).toFixed(1)} kg</div></div>
              <div className="stat-icon orange"><AlertTriangle size={22} /></div>
            </div>
          </div>
          {productionData.data?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3>Production Details</h3></div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Shift</th><th>Item</th><th>Operator</th><th>Qty</th><th>Weight (kg)</th><th>Wastage (kg)</th></tr></thead>
                  <tbody>
                    {productionData.data.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                        <td><span className={`badge-status ${r.shift}`}>{r.shift}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.item}</td>
                        <td>{r.operator}</td>
                        <td style={{ fontWeight: 700 }}>{r.qty}</td>
                        <td>{parseFloat(r.weight || 0).toFixed(2)}</td>
                        <td>{r.wastage > 0 ? <span className="text-warning">{parseFloat(r.wastage).toFixed(2)}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Report */}
      {tab === 'stock' && stockData && (
        <div className="animate-fade">
          <div className="stat-card blue" style={{ marginBottom: 20 }}>
            <div className="stat-info"><h4>Total Inventory Value</h4><div className="stat-value">{formatCurrency(stockData.total_value)}</div></div>
            <div className="stat-icon blue"><DollarSign size={22} /></div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Stock Report</h3></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Stock</th><th>Min</th><th>Unit</th><th>Price</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  {(stockData.materials || []).map(m => (
                    <tr key={m.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{m.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.category || '—'}</td>
                      <td style={{ fontWeight: 700, color: m.is_low ? 'var(--error)' : 'var(--success)' }}>{parseFloat(m.current_stock).toFixed(1)}</td>
                      <td>{parseFloat(m.minimum_stock).toFixed(1)}</td>
                      <td>{m.unit}</td>
                      <td>₹{parseFloat(m.price_per_unit).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>₹{parseFloat(m.value || 0).toLocaleString('en-IN')}</td>
                      <td>{m.is_low ? <span className="badge-status warning">Low</span> : <span className="badge-status success">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Wastage Report */}
      {tab === 'wastage' && wastageData && (
        <div className="animate-fade">
          <div className="charts-grid">
            <div className="card">
              <div className="card-header"><h3>Wastage by Item</h3></div>
              {wastageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={wastageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="item" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="wastage" name="Wastage (kg)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><p>No wastage data</p></div>}
            </div>
            <div className="card">
              <div className="card-header"><h3>Wastage Details</h3></div>
              {wastageData.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Item</th><th>Wastage (kg)</th><th>Production (kg)</th><th>%</th></tr></thead>
                    <tbody>
                      {wastageData.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.item}</td>
                          <td className="text-error" style={{ fontWeight: 700 }}>{parseFloat(r.wastage).toFixed(2)}</td>
                          <td>{parseFloat(r.production).toFixed(2)}</td>
                          <td><span className={`badge-status ${r.percentage > 5 ? 'error' : r.percentage > 2 ? 'warning' : 'success'}`}>{r.percentage}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state"><p>No data</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Profit/Loss Report */}
      {tab === 'profitLoss' && profitData && (
        <div className="animate-fade">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card green"><div className="stat-info"><h4>Sales</h4><div className="stat-value">{formatCurrency(profitData.sales)}</div></div><div className="stat-icon green"><DollarSign size={22} /></div></div>
            <div className="stat-card blue"><div className="stat-info"><h4>Payments Received</h4><div className="stat-value">{formatCurrency(profitData.payments_received)}</div></div><div className="stat-icon blue"><DollarSign size={22} /></div></div>
            <div className="stat-card red"><div className="stat-info"><h4>Expenses</h4><div className="stat-value">{formatCurrency(profitData.expenses)}</div></div><div className="stat-icon red"><DollarSign size={22} /></div></div>
            <div className={`stat-card ${profitData.profit >= 0 ? 'green' : 'red'}`}>
              <div className="stat-info"><h4>Net Profit</h4><div className="stat-value">{formatCurrency(profitData.profit)}</div>
                <div className="stat-change">{profitData.collection_rate}% collection rate</div>
              </div>
              <div className={`stat-icon ${profitData.profit >= 0 ? 'green' : 'red'}`}><DollarSign size={22} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Summary</h3></div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Sales', value: profitData.sales }, { name: 'Received', value: profitData.payments_received }, { name: 'Expenses', value: profitData.expenses }, { name: 'Profit', value: profitData.profit }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => formatCurrency(v)} />
                <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                  {[{ name: 'Sales', value: profitData.sales }, { name: 'Received', value: profitData.payments_received }, { name: 'Expenses', value: profitData.expenses }, { name: 'Profit', value: profitData.profit }].map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Party Dues Report */}
      {tab === 'partyDues' && duesData && (
        <div className="animate-fade">
          <div className="stat-card red" style={{ marginBottom: 20 }}>
            <div className="stat-info"><h4>Total Dues</h4><div className="stat-value">{formatCurrency(duesData.total)}</div>
              <div className="stat-change">{duesData.parties?.length || 0} parties with dues</div>
            </div>
            <div className="stat-icon red"><Users size={22} /></div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Party-wise Dues</h3></div>
            {(duesData.parties || []).length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>Party</th><th>Company</th><th>Phone</th><th>Due Amount</th></tr></thead>
                  <tbody>
                    {duesData.parties.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.company_name || '—'}</td>
                        <td>{p.phone || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--error)' }}>₹{parseFloat(p.current_balance).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state"><p>No outstanding dues</p></div>}
          </div>
        </div>
      )}

      {/* Empty state when no report generated yet */}
      {!loading && !productionData && !stockData && !wastageData && !profitData && !duesData && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <h3>Select a report and click Generate</h3>
            <p>Choose a report type and date range to view analytics</p>
          </div>
        </div>
      )}
    </div>
  );
}
