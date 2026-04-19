import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/format';

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (type) params.type = type;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/transactions', { params });
      setTxs(data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [type]);

  const totalIn = txs.filter((t) => t.type === 'import').reduce((s, t) => s + t.totalAmount, 0);
  const totalOut = txs.filter((t) => t.type === 'export').reduce((s, t) => s + t.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-gray-500">Full history of imports (stock-in) and exports (sales)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total records</p>
          <p className="text-2xl font-bold">{txs.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Stock In (Imports)</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalIn)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Sales (Exports)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalOut)}</p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="import">Import (Stock In)</option>
            <option value="export">Export (Sale)</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-secondary">Apply</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : txs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No transactions yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Party</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.type === 'import'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {t.type === 'import' ? 'Stock In' : 'Sale'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">{t.productName}</p>
                    {t.product?.sku && <p className="text-xs text-gray-500">{t.product.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.party || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm">{t.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatCurrency(t.pricePerUnit)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(t.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
