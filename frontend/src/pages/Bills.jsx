import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/format';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/bills', { params });
      setBills(data);
    } catch (err) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const total = bills.reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-gray-500">{bills.length} bills • Total {formatCurrency(total)}</p>
        </div>
        <Link to="/billing" className="btn-primary">+ New Bill</Link>
      </div>

      <form onSubmit={handleSearch} className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input
            className="input" placeholder="Bill number or customer..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : bills.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No bills found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Bill #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/bills/${b._id}`} className="text-brand-600 hover:underline font-medium">
                      {b.billNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p>{b.customerName}</p>
                    {b.customerPhone && <p className="text-xs text-gray-500">{b.customerPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{b.paymentMethod}</td>
                  <td className="px-4 py-3 text-right text-sm">{b.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(b.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
