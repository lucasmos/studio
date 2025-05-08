'use client';

import type { UserInfo, AuthStatus } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  authStatus: AuthStatus;
  userInfo: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Simulate checking auth status from localStorage or an API
    const storedUser = localStorage.getItem('derivAiUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as UserInfo;
        setUserInfo(user);
        setAuthStatus('authenticated');
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem('derivAiUser');
        setAuthStatus('unauthenticated');
      }
    } else {
      setAuthStatus('unauthenticated');
    }
  }, []);

  const login = useCallback((user: UserInfo) => {
    setUserInfo(user);
    setAuthStatus('authenticated');
    localStorage.setItem('derivAiUser', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setUserInfo(null);
    setAuthStatus('unauthenticated');
    localStorage.removeItem('derivAiUser');
    // Potentially redirect to login or home page
  }, []);

  return (
    <AuthContext.Provider value={{ authStatus, userInfo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};