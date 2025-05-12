'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token?: string, userData?: User) => void;
  logout: () => void;
  user: User | null; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('stockletToken');
      const storedUser = localStorage.getItem('stockletUser');
      if (storedToken && storedUser) {
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
    if (!isLoading && !isAuthenticated && 
        !['/login', '/register'].includes(pathname) && 
        pathname !== '/' && 
        !pathname.startsWith('/api')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const login = (token?: string, userData?: User) => { // Use User type
    if (token && userData) {
      localStorage.setItem('stockletToken', token);
      localStorage.setItem('stockletUser', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
      router.push('/'); 
    } else {
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
