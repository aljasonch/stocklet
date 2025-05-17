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
  login: (userData: User) => void; // Token no longer passed here
  logout: () => Promise<void>; // Make logout async
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
      // Token is in HttpOnly cookie, cannot access directly.
      // We rely on localStorage for user data to persist UI state.
      // A dedicated /api/auth/me endpoint would be more robust for checking session validity.
      const storedUser = localStorage.getItem('stockletUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true); // Assume authenticated if user data exists. Actual check happens on API calls.
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("AuthContext useEffect error:", error);
      localStorage.removeItem('stockletUser'); // Only user data in localStorage now
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

  const login = (userData: User) => { // Token is no longer passed from client-side
    if (userData) {
      // Token is set as HttpOnly cookie by the server.
      // Client-side only needs to store user data for UI purposes.
      localStorage.setItem('stockletUser', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      router.push('/'); 
    } else {
      // This case should ideally not happen if API guarantees userData on successful login
      console.error("Login called without userData"); 
    }
  };

  const logout = async () => {
    try {
      // Call the backend logout endpoint to blacklist token and clear cookie
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Still attempt to clear client-side state
    } finally {
      localStorage.removeItem('stockletUser'); // Only user data in localStorage now
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
