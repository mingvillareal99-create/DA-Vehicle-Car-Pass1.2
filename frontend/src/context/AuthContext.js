/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */
import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { API } from '../services/constants';
import { PWAManager } from '../services/OfflineService';

// Create the Auth Context
const AuthContext = createContext();

// ============================================
// Auth Service - Token and validation helpers
// ============================================
class AuthService {
  /**
   * Set the auth token in axios headers and localStorage
   */
  static setAuthToken(token) {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }

  /**
   * Get stored token from localStorage
   */
  static getStoredToken() {
    return localStorage.getItem('token');
  }

  /**
   * Validate token with the backend
   */
  static async validateToken(token) {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { valid: true, user: response.data };
    } catch (error) {
      return { valid: false, error: error.response?.data?.detail };
    }
  }
}

// ============================================
// Auth Provider Component
// ============================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
    PWAManager.registerServiceWorker();
    PWAManager.setupOnlineStatusListener(setIsOnline);
  }, []);

  /**
   * Initialize authentication from stored token
   */
  const initializeAuth = async () => {
    const token = AuthService.getStoredToken();
    if (token) {
      const validation = await AuthService.validateToken(token);
      if (validation.valid) {
        AuthService.setAuthToken(token);
        setUser(validation.user);
      } else {
        AuthService.setAuthToken(null);
      }
    }
    setLoading(false);
  };

  /**
   * Login user with username and password
   * @returns {Object} - { success: boolean, error?: string }
   */
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { 
        username: username.trim(), 
        password: password.trim() 
      });
      
      const { access_token, user: userData } = response.data;
      
      AuthService.setAuthToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed. Please check your credentials.' 
      };
    }
  };

  /**
   * Logout user and clear session
   */
  const logout = () => {
    AuthService.setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// Custom Hook for accessing auth context
// ============================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
