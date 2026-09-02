import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        // Attempt to fetch current user profile
        const response = await apiClient.get('/auth/me');
        if (response.success) {
          setUser(response.data);
        }
      } catch (error) {
        console.warn('Failed to restore session using stored access token. Attempting refresh.');
        if (storedRefreshToken) {
          try {
            // Attempt token refresh rotation
            const refreshResponse = await apiClient.post('/auth/refresh', {
              refresh_token: storedRefreshToken,
            });
            if (refreshResponse.success) {
              const { access_token, refresh_token, role } = refreshResponse.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);
              setToken(access_token);
              
              const userProfile = await apiClient.get('/auth/me');
              if (userProfile.success) {
                setUser(userProfile.data);
              }
            }
          } catch (refreshError) {
            console.error('Refresh token rotation failed. Clearing auth state.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            setToken(null);
          }
        } else {
          localStorage.removeItem('access_token');
          setUser(null);
          setToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.success) {
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        setToken(access_token);

        const userResponse = await apiClient.get('/auth/me');
        if (userResponse.success) {
          setUser(userResponse.data);
        }
        return response;
      }
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setToken(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (full_name, email, password, password_confirm) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', {
        full_name,
        email,
        password,
        password_confirm,
      });
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Send logout to blacklist access token
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Error occurred on server-side logout blacklist execution:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setToken(null);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
