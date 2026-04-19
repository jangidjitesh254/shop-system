import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/format';

export default function BillView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/bills/${id}`)
      .then(({ data }) => setBill(data))
      .catch(() => toast.error('Bill not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handleDelete = async () => {
    if (!window.confirm('Delete this bill? Stock will be restored.')) return;
    try {
      await api.delete(`/bills/${id}`);
      toast.success('Bill deleted');
      navigate('/bills');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!bill) return <div className="text-center py-12 text-red-600">Not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { overflow: visible !important; }
          .print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print flex justify-between items-center">
        <button onClick={() => navigate('/bills')} className="btn-secondary">← Back</button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary">🖨 Print / Save PDF</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </div>

      <div className="card p-8 print-area">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-brand-600">{user?.shopName}</h1>
            {user?.shopAddress && <p className="text-sm text-gray-600 mt-1">{user.shopAddress}</p>}
            {user?.phone && <p className="text-sm text-gray-600">📞 {user.phone}</p>}
            {user?.email && <p className="text-sm text-gray-600">✉ {user.email}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">INVOICE</h2>
            <p className="text-sm text-gray-600 mt-1">{bill.billNumber}</p>
            <p className="text-sm text-gray-600">{formatDate(bill.createdAt)}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6">
          <p className="text-xs uppercase text-gray-500 mb-1">Bill To</p>
          <p className="font-semibold">{bill.customerName}</p>
          {bill.customerPhone && <p className="text-sm text-gray-600">{bill.customerPhone}</p>}
        </div>

        {/* Items */}
        <table className="w-full mb-6">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Item</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Qty</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Price</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="px-3 py-2 text-sm">{idx + 1}</td>
                <td className="px-3 py-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-500">{item.sku}</p>}
                </td>
                <td className="px-3 py-2 text-right text-sm">{item.quantity}</td>
                <td className="px-3 py-2 text-right text-sm">{formatCurrency(item.pricePerUnit)}</td>
                <td className="px-3 py-2 text-right text-sm font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({bill.taxPercent}%)</span>
                <span>{formatCurrency(bill.taxAmount)}</span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span>-{formatCurrency(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
              <span>Total</span>
              <span>{formatCurrency(bill.totalAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 text-xs text-gray-500">
              <span>Payment</span>
              <span className="capitalize">{bill.paymentMethod} • {bill.paymentStatus}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}
