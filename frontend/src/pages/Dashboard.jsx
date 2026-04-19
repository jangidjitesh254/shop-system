import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/axios';
import { formatCurrency, formatDateShort, formatDate } from '../utils/format';

const StatCard = ({ label, value, sub, color = 'brand' }) => (
  <div className="card p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 text-${color}-600`}>{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!stats) return <div className="text-center py-12 text-red-600">Failed to load</div>;

  const chartData = stats.salesByDay.map((d) => ({
    date: formatDateShort(d.date),
    total: d.total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Here's what's happening in your shop today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          sub={`${stats.todayBillCount} bill(s) today`}
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.monthRevenue)}
          sub={`${stats.monthBillCount} bill(s) this month`}
        />
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          sub={`Stock worth ${formatCurrency(stats.totalStockValue)}`}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats.lowStockCount}
          sub={stats.lowStockCount > 0 ? 'Needs attention' : 'All good'}
          color={stats.lowStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Sales - Last 7 Days</h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="total" stroke="#3b63e8" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Low Stock Products</h2>
            <Link to="/products?lowStock=true" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No low stock items 🎉</p>
          ) : (
            <div className="space-y-2">
              {stats.lowStockProducts.map((p) => (
                <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-semibold">{p.stock} {p.unit}</p>
                    <p className="text-xs text-gray-500">alert at {p.lowStockAlert}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent bills */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Recent Bills</h2>
            <Link to="/bills" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.recentBills.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No bills yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentBills.map((b) => (
                <Link
                  key={b._id}
                  to={`/bills/${b._id}`}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded"
                >
                  <div>
                    <p className="font-medium">{b.billNumber}</p>
                    <p className="text-xs text-gray-500">{b.customerName} • {formatDate(b.createdAt)}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(b.totalAmount)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
