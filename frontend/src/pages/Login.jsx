import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all email and password fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      if (response && response.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      const apiError = err.response?.data?.message || err.response?.data?.detail || 'Incorrect credentials or network connection issue.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] font-sans">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0F0F0F] border border-white/10 shadow-2xl backdrop-blur-xl">
        <h2 className="text-3xl font-bold text-center text-white mb-2 font-display">
          SafeRoute <span className="font-serif italic font-normal text-[#F97316]">AI</span> Portal
        </h2>
        <p className="text-sm text-center text-slate-400 mb-6 font-sans">
          Enter credentials to access route risk safety dashboards.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F97316] font-mono text-sm placeholder:text-slate-600 transition-colors"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F97316] font-mono text-sm placeholder:text-slate-600 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#F97316] hover:bg-[#FB923C] text-white font-bold rounded-full transition-all duration-150 transform active:scale-98 disabled:opacity-50 font-display uppercase tracking-wider text-xs shadow-lg shadow-[#F97316]/20 mt-2"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 font-sans">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#F97316] hover:text-[#FB923C] font-semibold hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
