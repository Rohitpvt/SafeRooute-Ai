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
    <div className="flex flex-col items-center justify-center min-h-[70vh] font-sans">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0F0F0F] border border-white/10 shadow-2xl backdrop-blur-xl">
        <h2 className="text-3xl font-bold text-center text-white mb-2 font-display">
          Create <span className="font-serif italic font-normal text-[#F97316]">SafeRoute</span> Account
        </h2>
        <p className="text-sm text-center text-slate-400 mb-6 font-sans">
          Create a profile to assess road risk safety hotspot metrics.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm font-sans">
            Profile created successfully! Redirecting to sign in page...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" htmlFor="fullName">
              Display Name
            </label>
            <input
              id="fullName"
              type="text"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F97316] font-mono text-sm placeholder:text-slate-600 transition-colors"
              placeholder="Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

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
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" htmlFor="password">
              Password (Min 8 chars, 1 uppercase, 1 digit, 1 special)
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F97316] font-mono text-sm placeholder:text-slate-600 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" htmlFor="passwordConfirm">
              Confirm Password
            </label>
            <input
              id="passwordConfirm"
              type="password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F97316] font-mono text-sm placeholder:text-slate-600 transition-colors"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#F97316] hover:bg-[#FB923C] text-white font-bold rounded-full transition-all duration-150 transform active:scale-98 disabled:opacity-50 font-display uppercase tracking-wider text-xs shadow-lg shadow-[#F97316]/20 mt-2"
            disabled={loading || success}
          >
            {loading ? 'Registering account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 font-sans">
          Already registered?{' '}
          <Link to="/login" className="text-[#F97316] hover:text-[#FB923C] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
