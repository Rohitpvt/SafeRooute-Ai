import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePasswordStrength = (val) => {
    if (val.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter.';
    if (!/\d/.test(val)) return 'Password must contain at least one digit.';
    if (!/[ !@#$%^&*(),.?":{}|<>]/.test(val)) return 'Password must contain at least one special character.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !passwordConfirm) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await register(fullName, email, password, passwordConfirm);
      if (response && response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      const apiError = err.response?.data?.message || err.response?.data?.detail || 'Registration failed. Email might already be taken.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-card bg-primary-card border border-gray-800">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Create Account</h2>
        <p className="text-sm text-center text-gray-400 mb-6">Create a profile to assess road risk safety hotspot metrics.</p>

        {error && (
          <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded bg-green-900/30 border border-green-800 text-green-400 text-sm">
            Profile created successfully! Redirecting to sign in page...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="fullName">
              Display Name
            </label>
            <input
              id="fullName"
              type="text"
              className="w-full px-4 py-2 bg-primary-dark border border-gray-800 rounded-md text-white focus:outline-none focus:border-brand-blue"
              placeholder="Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

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
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="password">
              Password (Min 8 chars, 1 uppercase, 1 digit, 1 special)
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2 bg-primary-dark border border-gray-800 rounded-md text-white focus:outline-none focus:border-brand-blue"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="passwordConfirm">
              Confirm Password
            </label>
            <input
              id="passwordConfirm"
              type="password"
              className="w-full px-4 py-2 bg-primary-dark border border-gray-800 rounded-md text-white focus:outline-none focus:border-brand-blue"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-medium rounded-md transition-all duration-150 transform active:scale-98 disabled:opacity-50"
            disabled={loading || success}
          >
            {loading ? 'Registering account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="text-brand-blue hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
