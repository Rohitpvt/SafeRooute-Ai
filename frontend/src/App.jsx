import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

// 1. Toast Provider stub
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);
const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

// 2. Theme Provider stub
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};

// 3. Error Boundary stub component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught exception:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-primary-dark text-white p-6">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <button 
            className="px-4 py-2 bg-brand-blue rounded-md hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 4. Loading Component stub
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-primary-dark">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
  </div>
);

import Navbar from './components/Navbar';

// 5. Layout Base Component
const BaseLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white selection:bg-[#F97316] selection:text-black font-sans relative overflow-x-hidden">
      {/* Background Radial Glow Backlighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-orange-500/15 via-orange-500/5 to-transparent blur-3xl pointer-events-none z-0" />
      
      <div className="flex flex-col flex-1 z-10 relative">
        <Navbar />
        <main className="flex-grow flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

// 6. Asterix Landing Page
const LandingPage = () => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center space-y-12">
    {/* Status Pill Badge */}
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-mono tracking-wide">
      <span className="w-2 h-2 rounded-full bg-[#F97316] animate-ping" />
      <span>SafeRoute AI Engine v2.0 • Real-Time Safety Pipeline</span>
    </div>

    {/* Hero Headline */}
    <div className="max-w-4xl space-y-6">
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-medium text-white tracking-tight leading-[1.1]">
        Accident Hotspot Prediction with{' '}
        <span className="font-serif italic font-normal text-[#F97316]">
          Real-Time AI Intelligence
        </span>
      </h1>
      <p className="text-lg sm:text-xl text-slate-400 font-sans max-w-2xl mx-auto leading-relaxed">
        Assess continuous segment safety risks, analyze weather & curve kinematics, and receive hands-free multimodal alerts while driving.
      </p>
    </div>

    {/* Action Buttons */}
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <Link
        to="/dashboard"
        className="w-full sm:w-auto px-8 py-4 bg-[#F97316] hover:bg-[#FB923C] text-black font-semibold rounded-full shadow-[0_0_30px_rgba(249,115,22,0.4)] transition transform hover:scale-[1.02] text-sm"
      >
        Enter Live Safety Dashboard →
      </Link>
      <Link
        to="/register"
        className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-full transition text-sm"
      >
        Create Driver Account
      </Link>
    </div>

    {/* Asterix Bento Grid Feature Highlights */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full pt-12 text-left">
      <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/10 hover:border-[#F97316]/40 transition space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-[#F97316] font-mono text-xl">
          🧠
        </div>
        <h3 className="text-xl font-bold font-display text-white">RandomForest Risk Core</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Evaluates multi-factor accident probabilities in 5ms using ML model inference trained on physical crash geometry and weather datasets.
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/10 hover:border-[#F97316]/40 transition space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-[#F97316] font-mono text-xl">
          🛰️
        </div>
        <h3 className="text-xl font-bold font-display text-white">Live Environmental Weather</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Fetches hour-matched Open-Meteo precipitation, wind, and visibility data in real time, automatically applying speed advisory modifiers.
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-[#0F0F0F] border border-white/10 hover:border-[#F97316]/40 transition space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-[#F97316] font-mono text-xl">
          🔊
        </div>
        <h3 className="text-xl font-bold font-display text-white">Multimodal Driver HUD</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Delivers synthesized voice TTS warnings (&le;8 words), Web Audio synthesized chimes, and haptic vibrations with single primary alert arbitration.
        </p>
      </div>
    </div>
  </div>
);


const DashboardPage = () => <div className="text-lg">User Dashboard Interface Placeholder</div>;
const PredictPage = () => <div className="text-lg">Predict Route Risk Assessment Placeholder</div>;
const HistoryPage = () => <div className="text-lg">Prediction History Logs List Placeholder</div>;
import SettingsProfile from './pages/SettingsProfile';
import RoutePlannerPage from './pages/RoutePlannerPage';
import HazardReportingPage from './pages/HazardReportingPage';
import EmergencySOSPage from './pages/EmergencySOSPage';
import AnalyticsInsightsPage from './pages/AnalyticsInsightsPage';

const ProfilePage = () => <SettingsProfile />;
const AdminPage = () => <div className="text-lg">Admin Operations Control Panel Placeholder</div>;

const PageNotFound = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <h1 className="text-5xl font-bold mb-4">404</h1>
    <p className="text-gray-400 mb-6">Page Not Found. The requested path does not exist.</p>
    <Link to="/" className="px-4 py-2 bg-brand-blue text-white rounded hover:bg-blue-700">Go to Home</Link>
  </div>
);

const ProtectedRoutePlaceholder = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <PageLoader />;
  }
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <BaseLayout>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected layouts path groups */}
                  <Route path="/dashboard" element={
                    <ProtectedRoutePlaceholder>
                      <Dashboard />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/routes" element={
                    <ProtectedRoutePlaceholder>
                      <RoutePlannerPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/hazards" element={
                    <ProtectedRoutePlaceholder>
                      <HazardReportingPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/sos" element={
                    <ProtectedRoutePlaceholder>
                      <EmergencySOSPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoutePlaceholder>
                      <AnalyticsInsightsPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/predict" element={
                    <ProtectedRoutePlaceholder>
                      <PredictPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/history" element={
                    <ProtectedRoutePlaceholder>
                      <HistoryPage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoutePlaceholder>
                      <ProfilePage />
                    </ProtectedRoutePlaceholder>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoutePlaceholder>
                      <AdminDashboard />
                    </ProtectedRoutePlaceholder>
                  } />
                  
                  <Route path="*" element={<PageNotFound />} />
                </Routes>
              </BaseLayout>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
