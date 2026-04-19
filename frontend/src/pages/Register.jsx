import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    shopName: '',
    shopAddress: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-600">Create Account</h1>
          <p className="text-gray-500 mt-1">Start managing your shop today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Your Name</label>
            <input required className="input" value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label className="label">Shop Name</label>
            <input required className="input" value={form.shopName} onChange={update('shopName')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={update('email')} />
          </div>
          <div>
            <label className="label">Password (min 6 chars)</label>
            <input type="password" required minLength={6} className="input" value={form.password} onChange={update('password')} />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="label">Shop Address (optional)</label>
            <input className="input" value={form.shopAddress} onChange={update('shopAddress')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 mt-2">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
