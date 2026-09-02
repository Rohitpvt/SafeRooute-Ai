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

// 5. Layout Base Component
const BaseLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDashboardOrAdmin = location.pathname === '/dashboard' || location.pathname === '/admin';

  return (
    <div className="flex min-h-screen bg-slate-950 text-gray-100">
      <div className="flex flex-col flex-1">
        {!isDashboardOrAdmin && (
          <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
            <Link to="/" className="text-xl font-bold text-indigo-500">SafeRoute AI</Link>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link to="/dashboard" className="text-sm hover:text-indigo-400">Dashboard</Link>
                  <button onClick={logout} className="text-sm text-red-400">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-indigo-400 text-sm">Sign In</Link>
                  <Link to="/register" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Get Started</Link>
                </>
              )}
            </div>
          </header>
        )}
        <main className={isDashboardOrAdmin ? "flex-grow flex flex-col" : "flex-grow p-6"}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

// 6. Navigation Pages Stubs
const LandingPage = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <h1 className="text-4xl font-bold mb-4">AI Powered Accident Hotspot Prediction</h1>
    <p className="text-gray-400 max-w-xl mb-8">Assess risks dynamically and check road safety conditions before departure.</p>
    <div className="space-x-4">
      <Link to="/dashboard" className="px-6 py-3 bg-brand-blue text-white rounded font-medium hover:bg-blue-700">Enter Dashboard</Link>
    </div>
  </div>
);

const DashboardPage = () => <div className="text-lg">User Dashboard Interface Placeholder</div>;
const PredictPage = () => <div className="text-lg">Predict Route Risk Assessment Placeholder</div>;
const HistoryPage = () => <div className="text-lg">Prediction History Logs List Placeholder</div>;
const ProfilePage = () => <div className="text-lg">User Settings Profile Config Placeholder</div>;
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
