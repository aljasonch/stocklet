'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  user: User | null; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();
  const pathname = usePathname();

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem('stockletUser', JSON.stringify(data.user));
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('stockletUser');
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        localStorage.removeItem('stockletUser');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth status check/refresh error:", error);
      localStorage.removeItem('stockletUser');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('stockletUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true); 
      } catch {
        localStorage.removeItem('stockletUser');
      }
    }
    checkAuthStatus(); 
  }, [checkAuthStatus]);
    
  useEffect(() => {
    if (!isAuthenticated || isLoading) {
        return;
    }

    const tokenRefreshInterval = setInterval(() => {
      if (isAuthenticated) {
        fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        })
        .then(response => {
          if (!response.ok) {
            console.error('Periodic token refresh failed');
            setIsAuthenticated(false);
            setUser(null);
          }
          return response.json();
        })
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
          }
        })
        .catch(error => {
          console.error('Periodic token refresh error:', error);
        });
      }
    }, 10 * 60 * 1000);
    
    const handleUserActivity = () => {
      if (isAuthenticated) {
        const lastRefresh = parseInt(localStorage.getItem('lastTokenRefresh') || '0');
        const now = Date.now();
        if (now - lastRefresh > 60000) {
          localStorage.setItem('lastTokenRefresh', now.toString());
          fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          }).catch(error => {
            console.error('Activity-based token refresh error:', error);
          });
        }
      }
    };
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    
    return () => {
      clearInterval(tokenRefreshInterval);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && 
        !['/login', '/register'].includes(pathname) && 
        pathname !== '/' && 
        !pathname.startsWith('/api')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const login = (userData: User) => {
    if (userData) {
      localStorage.setItem('stockletUser', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      router.push('/'); 
    } else {
      console.error("Login called without userData"); 
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      localStorage.removeItem('stockletUser'); 
      setIsAuthenticated(false);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, user }}>
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
