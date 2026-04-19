import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/format';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'all') params.category = category;
      if (lowStockOnly) params.lowStock = 'true';
      const [{ data }, cats] = await Promise.all([
        api.get('/products', { params }),
        api.get('/products/categories'),
      ]);
      setProducts(data);
      setCategories(cats.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [category, lowStockOnly]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">Manage your inventory</p>
        </div>
        <Link to="/products/new" className="btn-primary">
          + Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                if (e.target.checked) setSearchParams({ lowStock: 'true' });
                else setSearchParams({});
              }}
            />
            <span className="text-sm">Low stock only</span>
          </label>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No products found.{' '}
            <Link to="/products/new" className="text-brand-600 hover:underline">Add your first product</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.stock <= p.lowStockAlert;
                return (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.category}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(p.costPrice)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {p.stock} {p.unit}
                      </span>
                      {isLow && <p className="text-xs text-red-500">Low stock</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/products/${p._id}/edit`} className="text-brand-600 hover:underline text-sm mr-3">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(p._id, p.name)} className="text-red-600 hover:underline text-sm">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
