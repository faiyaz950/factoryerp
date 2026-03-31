import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Factory, TrendingUp, DollarSign, AlertTriangle, Package, FileText, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const num = (v) => Number(v ?? 0);
const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.get();
        setData(res.data);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><div className="icon">📊</div><h3>Unable to load dashboard</h3></div>;

  const stats = [
    { label: "Today's Production", value: `${num(data.today?.production?.total_qty)} pcs`, sub: `${num(data.today?.production?.total_weight).toFixed(1)} kg`, icon: Factory, color: 'purple' },
    { label: 'Monthly Sales', value: formatCurrency(data.monthly?.sales?.total), sub: `${data.monthly?.sales?.count || 0} invoices`, icon: TrendingUp, color: 'green' },
    { label: 'Monthly Profit', value: formatCurrency(data.monthly?.profit), sub: `Expenses: ${formatCurrency(data.monthly?.expenses)}`, icon: DollarSign, color: 'blue', change: num(data.monthly?.profit) > 0 ? 'up' : 'down' },
    { label: 'Low Stock Alerts', value: data.alerts?.low_stock_count || 0, sub: 'Materials need restock', icon: AlertTriangle, color: 'orange' },
    { label: 'Pending Invoices', value: data.alerts?.pending_invoices || 0, sub: `Total Dues: ${formatCurrency(data.alerts?.total_dues)}`, icon: FileText, color: 'red' },
    { label: 'Monthly Payments', value: formatCurrency(data.monthly?.payments), sub: 'Received this month', icon: DollarSign, color: 'green' },
  ];

  // Production trend chart data
  const trendMap = {};
  (data.charts?.production_trend || []).forEach((item) => {
    const d = item.date;
    if (!trendMap[d]) trendMap[d] = { date: d, day: 0, night: 0 };
    if (item.shift && trendMap[d][item.shift] !== undefined) {
      trendMap[d][item.shift] = num(item.total_qty);
    }
  });
  const trendData = Object.values(trendMap);

  // Top products data
  const topProducts = (data.charts?.top_products || []).map((p) => ({
    name: p.item?.length > 15 ? p.item.substring(0, 15) + '...' : p.item,
    qty: num(p.total_qty),
    weight: num(p.total_weight),
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Welcome back! Here's your factory overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className={`stat-card ${s.color}`} key={i}>
            <div className="stat-info">
              <h4>{s.label}</h4>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-change ${s.change || ''}`}>
                {s.change === 'up' ? <ArrowUpRight size={12} /> : s.change === 'down' ? <ArrowDownRight size={12} /> : null}
                {s.sub}
              </div>
            </div>
            <div className={`stat-icon ${s.color}`}>
              <s.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>📈 Production Trend (Last 7 Days)</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="day" name="Day Shift" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="night" name="Night Shift" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data for the last 7 days</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>🏆 Top Products (This Month)</h3>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="qty" name="Quantity" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No products this month</p></div>
          )}
        </div>
      </div>

      {/* Quick alerts */}
      {(data.alerts?.low_stock_count > 0 || data.alerts?.pending_invoices > 0) && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>⚠️ Alerts</h3></div>
          {data.alerts?.low_stock_count > 0 && (
            <div className="alert alert-warning">
              <Package size={16} />
              <span><strong>{data.alerts.low_stock_count}</strong> materials are running low on stock</span>
            </div>
          )}
          {data.alerts?.pending_invoices > 0 && (
            <div className="alert alert-error">
              <FileText size={16} />
              <span><strong>{data.alerts.pending_invoices}</strong> invoices pending — Total dues: {formatCurrency(data.alerts.total_dues)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
