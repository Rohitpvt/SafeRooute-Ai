import axios from 'axios';

// Get base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token & Gemini API key if present
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const geminiKey = localStorage.getItem('gemini_api_key');
      if (geminiKey) {
        config.headers['X-Gemini-API-Key'] = geminiKey;
      }
    }
    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Parse payload & intercept global errors
apiClient.interceptors.response.use(
  (response) => {
    // Resolve response body payloads directly
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle token expiration/auth failure globally
      if (status === 401) {
        console.warn('Authentication token expired or invalid.');
        localStorage.removeItem('access_token');
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/admin') || path.startsWith('/profile') || path.startsWith('/settings')) {
            window.location.href = '/login?session_expired=true';
          }
        }
      }

      // Log standardized API errors
      console.error(`API Error Response: [HTTP ${status}]`, data);
    } else if (error.request) {
      console.error('API Connection Error: No response received from server.');
    } else {
      console.error('API Client Execution Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
