import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/format';

export default function StockIn() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    pricePerUnit: '',
    party: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data));
  }, []);

  const selected = products.find((p) => p._id === form.productId);

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const p = products.find((x) => x._id === productId);
    setForm({
      ...form,
      productId,
      pricePerUnit: p ? p.costPrice : '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId) return toast.error('Select a product');
    setLoading(true);
    try {
      await api.post('/transactions', {
        type: 'import',
        productId: form.productId,
        quantity: Number(form.quantity),
        pricePerUnit: Number(form.pricePerUnit),
        party: form.party,
        note: form.note,
      });
      toast.success(`Added ${form.quantity} ${selected?.unit} to ${selected?.name}`);
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record stock-in');
    } finally {
      setLoading(false);
    }
  };

  const total = Number(form.quantity || 0) * Number(form.pricePerUnit || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Stock In</h1>
        <p className="text-gray-500">Record new stock received from a supplier</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Product *</label>
          <select required className="input" value={form.productId} onChange={handleProductChange}>
            <option value="">-- Select a product --</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku}) - Current: {p.stock} {p.unit}
              </option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              No products yet. <a href="/products/new" className="underline">Add one first</a>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity *</label>
            <input
              required type="number" min="1"
              className="input" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Cost per unit *</label>
            <input
              required type="number" step="0.01" min="0"
              className="input" value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Supplier Name</label>
          <input
            className="input" value={form.party}
            onChange={(e) => setForm({ ...form, party: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="label">Note</label>
          <input
            className="input" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Invoice number, reference..."
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-xl font-bold">{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Recording...' : 'Record Stock In'}
          </button>
          <button type="button" onClick={() => navigate('/products')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
