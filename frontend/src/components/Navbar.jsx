import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: '⚡' },
    { path: '/routes', label: 'Safe Routes', icon: '🗺️' },
    { path: '/hazards', label: 'Hazards', icon: '⚠️' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/sos', label: 'SOS', icon: '🚨', isAlert: true },
  ];

  if (user && user.role === 'admin') {
    navLinks.push({ path: '/admin', label: 'Admin', icon: '🛡️' });
  }

  return (
    <header className="sticky top-3 z-50 max-w-7xl mx-auto px-3 sm:px-6 w-full">
      <nav className="flex items-center justify-between px-5 py-2.5 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:scale-105 transition transform">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-white text-[11px] font-black font-mono tracking-tighter">
              SR
            </div>
          </div>
          <span className="text-base font-bold font-display text-white tracking-tight group-hover:text-[#F97316] transition">
            SafeRoute <span className="font-serif italic font-normal text-[#F97316]">AI</span>
          </span>
        </Link>

        {/* Center Pill Navigation Links */}
        <div className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  link.isAlert
                    ? isActive
                      ? 'bg-red-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'text-red-400 hover:text-red-300 hover:bg-red-950/40'
                    : isActive
                    ? 'bg-[#F97316] text-black font-bold shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Auth Profile CTA */}
        {user ? (
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#F97316]/50 text-slate-200 hover:text-white transition group"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-[#F97316] flex items-center justify-center text-black font-bold text-[11px] font-mono shadow-sm group-hover:scale-105 transition">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="max-w-[120px] truncate text-xs font-mono text-slate-300">
                {user.full_name || user.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-400 group-hover:text-[#F97316] transition">⚙️</span>
            </button>

            {/* Profile & Settings Dropdown Menu */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 top-12 w-56 bg-[#0F0F0F] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 animate-fade-in text-xs font-mono"
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-white/5 text-slate-400">
                  <p className="text-white font-bold font-sans text-xs truncate">{user.full_name || "Commuter"}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white flex items-center gap-2 transition"
                >
                  <span>🔑</span> Profile & API Keys
                </Link>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-950/60 text-red-400 hover:text-red-300 flex items-center gap-2 transition"
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-full text-xs font-medium transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 bg-[#F97316] hover:bg-[#FB923C] text-black font-bold text-xs rounded-full shadow-[0_0_15px_rgba(249,115,22,0.35)] transition transform active:scale-95"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-black/90 border border-white/10 p-2 rounded-full mt-2 shadow-lg text-xs">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`p-2 rounded-full transition flex items-center gap-1 ${
              location.pathname === link.path
                ? 'bg-[#F97316] text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{link.icon}</span>
          </Link>
        ))}
      </div>
    </header>
  );
};

export default Navbar;
