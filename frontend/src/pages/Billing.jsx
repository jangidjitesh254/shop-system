import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/format';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Billing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // { productId, name, sku, pricePerUnit, quantity, stock, unit }
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [taxPercent, setTaxPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data));
  }, []);

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const addToCart = (p) => {
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    const existing = cart.find((i) => i.productId === p._id);
    if (existing) {
      if (existing.quantity >= p.stock) return toast.error(`Only ${p.stock} ${p.unit} available`);
      setCart(cart.map((i) =>
        i.productId === p._id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([
        ...cart,
        {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          stock: p.stock,
          pricePerUnit: p.sellingPrice,
          quantity: 1,
        },
      ]);
    }
    setSearch('');
  };

  // Called when scanner detects a barcode. Looks up product by barcode and adds to cart.
  const handleScan = async (code) => {
    setScannerOpen(false);
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      // Refresh product in our list too (in case stock changed elsewhere)
      setProducts((ps) => {
        const idx = ps.findIndex((p) => p._id === data._id);
        if (idx === -1) return [...ps, data];
        const copy = ps.slice();
        copy[idx] = data;
        return copy;
      });
      addToCart(data);
      toast.success(`Added: ${data.name}`);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(`No product with barcode ${code}. Add it first in Products.`);
      } else {
        toast.error('Scan lookup failed');
      }
    }
  };

  const updateQty = (productId, qty) => {
    const n = Math.max(1, Number(qty) || 1);
    setCart(cart.map((i) => {
      if (i.productId !== productId) return i;
      if (n > i.stock) {
        toast.error(`Only ${i.stock} ${i.unit} available`);
        return { ...i, quantity: i.stock };
      }
      return { ...i, quantity: n };
    }));
  };

  const updatePrice = (productId, price) => {
    setCart(cart.map((i) =>
      i.productId === productId ? { ...i, pricePerUnit: Number(price) || 0 } : i
    ));
  };

  const removeItem = (productId) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((s, i) => s + i.pricePerUnit * i.quantity, 0);
  const taxAmount = (subtotal * Number(taxPercent || 0)) / 100;
  const total = subtotal + taxAmount - Number(discount || 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const { data: bill } = await api.post('/bills', {
        customerName: customer.name || 'Walk-in Customer',
        customerPhone: customer.phone,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          pricePerUnit: i.pricePerUnit,
        })),
        taxPercent: Number(taxPercent),
        discount: Number(discount),
        paymentMethod,
      });
      toast.success(`Bill ${bill.billNumber} created`);
      navigate(`/bills/${bill._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Bill</h1>
        <p className="text-gray-500">Create a bill / invoice for a customer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product search */}
          <div className="card p-4">
            <label className="label">Add Product</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setScannerOpen(true)}
                className="btn-primary flex-1"
                type="button"
              >
                📷 Scan Barcode
              </button>
              <span className="text-sm text-gray-400 self-center">or</span>
            </div>
            <div className="relative">
              <input
                className="input"
                placeholder="Search product by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && filtered.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {filtered.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => addToCart(p)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.sku} • Stock: {p.stock} {p.unit}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(p.sellingPrice)}</p>
                    </button>
                  ))}
                </div>
              )}
              {search && filtered.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No products found</p>
              )}
            </div>
          </div>

          {/* Cart table */}
          <div className="card overflow-hidden">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Cart is empty. Search and add products above.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Item</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase w-24">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase w-28">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase w-28">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((i) => (
                    <tr key={i.productId} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <p className="font-medium">{i.name}</p>
                        <p className="text-xs text-gray-500">{i.sku}</p>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="1" max={i.stock}
                          className="input text-center py-1"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.productId, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          className="input text-right py-1"
                          value={i.pricePerUnit}
                          onChange={(e) => updatePrice(i.productId, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(i.pricePerUnit * i.quantity)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeItem(i.productId)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Customer + totals */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">Customer</h3>
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                placeholder="Walk-in Customer"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                placeholder="Optional"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">Billing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tax %</label>
                <input
                  type="number" min="0" step="0.01" className="input"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Discount</label>
                <input
                  type="number" min="0" step="0.01" className="input"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({taxPercent}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-brand-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || cart.length === 0}
              className="btn-primary w-full disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
