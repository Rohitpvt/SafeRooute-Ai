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
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-card bg-primary-card border border-gray-800">
        <h2 className="text-2xl font-bold text-center text-white mb-2">SafeRoute AI Portal</h2>
        <p className="text-sm text-center text-gray-400 mb-6">Enter credentials to access route risk safety dashboards.</p>

        {error && (
          <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-2 bg-primary-dark border border-gray-800 rounded-md text-white focus:outline-none focus:border-brand-blue"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2 bg-primary-dark border border-gray-800 rounded-md text-white focus:outline-none focus:border-brand-blue"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-150 transform active:scale-98 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-blue hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
