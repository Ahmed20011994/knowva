// Authentication utilities and context
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, AuthResponse } from './api';

export interface User {
  id: string;
  email: string;
  organization: string;
  role: string;
  admin_role?: string;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string, organization: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
};

// Utility to clear all auth-related data
const clearAllAuthData = () => {
  try {
    // Clear cookies
    deleteCookie('auth_token');
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_data');
    }
    
    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth_data');
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const deleteCookie = (name: string) => {
  // More comprehensive cookie deletion
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = getCookie('auth_token');
    if (storedToken) {
      setToken(storedToken);
      apiService.getCurrentUser(storedToken)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Invalid token, remove it
          deleteCookie('auth_token');
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await apiService.login({ email, password });
      
      // Store token in cookie
      setCookie('auth_token', response.access_token, 7);
      setToken(response.access_token);
      
      // Set user data
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string, confirmPassword: string, organization: string) => {
    try {
      const response: AuthResponse = await apiService.signup({
        email,
        password,
        confirm_password: confirmPassword,
        organization
      });
      
      // Store token in cookie
      setCookie('auth_token', response.access_token, 7);
      setToken(response.access_token);
      
      // Set user data
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    try {
      // Clear all auth data
      clearAllAuthData();
      
      // Clear state
      setToken(null);
      setUser(null);
      
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even on error
      clearAllAuthData();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
