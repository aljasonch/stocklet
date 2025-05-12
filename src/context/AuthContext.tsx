'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token?: string, userData?: any) => void; // Token and user data are optional for now
  logout: () => void;
  user: any | null; // Store user data if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('stockletToken');
      const storedUser = localStorage.getItem('stockletUser');
      if (storedToken && storedUser) {
        // Basic check: In a real app, you might want to verify token expiry or call an endpoint
        // For simplicity, we assume if token exists, user is authenticated.
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("AuthContext useEffect error:", error);
      localStorage.removeItem('stockletToken');
      localStorage.removeItem('stockletUser');
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Redirect logic remains the same
    if (!isLoading && !isAuthenticated && 
        !['/login', '/register'].includes(pathname) && 
        pathname !== '/' && 
        !pathname.startsWith('/api')) {
      router.push('/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, pathname, router]);

  const login = (token?: string, userData?: any) => {
    if (token && userData) {
      localStorage.setItem('stockletToken', token);
      localStorage.setItem('stockletUser', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
      router.push('/'); 
    } else {
      // Handle login failure or missing token/userData if necessary
      console.error("Login called without token or userData");
    }
  };

  const logout = () => {
    localStorage.removeItem('stockletToken');
    localStorage.removeItem('stockletUser');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  return (
    // Provide token for API calls if needed by children, though typically handled by an interceptor or fetch wrapper
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
