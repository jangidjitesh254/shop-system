import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import BarcodeScanner from '../components/BarcodeScanner';

const empty = {
  name: '',
  sku: '',
  barcode: '',
  category: 'General',
  unit: 'pcs',
  costPrice: '',
  sellingPrice: '',
  stock: 0,
  lowStockAlert: 5,
  description: '',
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then(({ data }) => setForm(data));
    }
  }, [id]);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        stock: Number(form.stock),
        lowStockAlert: Number(form.lowStockAlert),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product added');
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit' : 'Add'} Product</h1>
        <p className="text-gray-500">{isEdit ? 'Update product details' : 'Add a new item to your inventory'}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Product Name *</label>
            <input required className="input" value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label className="label">SKU / Code *</label>
            <input required className="input" value={form.sku} onChange={update('sku')} placeholder="e.g. SKU-001" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Barcode (EAN / UPC)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={form.barcode}
                onChange={update('barcode')}
                placeholder="Scan or type the barcode from the package"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="btn-secondary whitespace-nowrap"
                title="Scan using camera"
              >
                📷 Scan
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Optional — lets you scan the product at billing time</p>
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={update('category')} />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={update('unit')}>
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="box">box</option>
              <option value="pack">pack</option>
            </select>
          </div>
          <div>
            <label className="label">Cost Price *</label>
            <input
              required type="number" step="0.01" min="0"
              className="input" value={form.costPrice} onChange={update('costPrice')}
            />
          </div>
          <div>
            <label className="label">Selling Price *</label>
            <input
              required type="number" step="0.01" min="0"
              className="input" value={form.sellingPrice} onChange={update('sellingPrice')}
            />
          </div>
          <div>
            <label className="label">Current Stock</label>
            <input
              type="number" min="0"
              className="input" value={form.stock} onChange={update('stock')}
              disabled={isEdit}
            />
            {isEdit && <p className="text-xs text-gray-500 mt-1">Use Stock In to adjust stock</p>}
          </div>
          <div>
            <label className="label">Low Stock Alert</label>
            <input
              type="number" min="0"
              className="input" value={form.lowStockAlert} onChange={update('lowStockAlert')}
            />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows="3" value={form.description} onChange={update('description')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
          <button type="button" onClick={() => navigate('/products')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScannerOpen(false);
            toast.success(`Barcode captured: ${code}`);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
