import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Key, Info, HelpCircle } from 'lucide-react';

export default function Login() {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: 'Admin',
      email: 'admin@hospital.com',
      password: 'Admin@123',
      color: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:border-blue-300 shadow-sm'
    },
    {
      role: 'Biomedical Engineer',
      email: 'engineer@hospital.com',
      password: 'Engineer@123',
      color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700 hover:border-emerald-300 shadow-sm'
    },
    {
      role: 'Department Staff',
      email: 'staff@hospital.com',
      password: 'Staff@123',
      color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700 hover:border-amber-300 shadow-sm'
    },
    {
      role: 'Vendor',
      email: 'vendor@hospital.com',
      password: 'Vendor@123',
      color: 'from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:border-purple-300 shadow-sm'
    }
  ];

  const handleDemoClick = (dem) => {
    setEmail(dem.email);
    setPassword(dem.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-blue-50/50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-medical-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="max-w-md w-full space-y-8 z-10 animate-slide-up">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 bg-medical-500 rounded-2xl items-center justify-center shadow-lg shadow-medical-500/20 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-sans">
            HAMS Portal
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Hospital Asset Lifecycle Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-650 text-xs flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-250 rounded-lg text-slate-900 outline-none focus:border-medical-500 focus:bg-white focus:ring-2 focus:ring-medical-500/20 transition-all text-sm font-medium"
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Key className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-250 rounded-lg text-slate-900 outline-none focus:border-medical-500 focus:bg-white focus:ring-2 focus:ring-medical-500/20 transition-all text-sm font-medium"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 bg-medical-500 hover:bg-medical-600 font-bold active:scale-[0.99] transition-transform text-white rounded-lg text-sm flex items-center justify-center shadow-md shadow-medical-500/10"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Cards Section */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {demoAccounts.map((dem) => (
              <button
                key={dem.role}
                type="button"
                onClick={() => handleDemoClick(dem)}
                className={`p-3 bg-gradient-to-br ${dem.color} border hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl text-center flex flex-col items-center justify-center font-semibold`}
              >
                <span className="text-xs font-bold block capitalize">{dem.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
