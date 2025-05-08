'use client';

import type { UserInfo, AuthStatus } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  authStatus: AuthStatus;
  userInfo: UserInfo | null;
  login: (user: UserInfo) => void;
  logout: () => void;
  paperBalance: number;
  setPaperBalance: React.Dispatch<React.SetStateAction<number>>;
  liveBalance: number;
  setLiveBalance: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paperBalance, setPaperBalance] = useState<number>(10000); // Default demo balance
  const [liveBalance, setLiveBalance] = useState<number>(500); // Default simulated real balance

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

    // Load balances from localStorage if available
    const storedPaperBalance = localStorage.getItem('derivAiPaperBalance');
    if (storedPaperBalance) {
      setPaperBalance(parseFloat(storedPaperBalance));
    }
    const storedLiveBalance = localStorage.getItem('derivAiLiveBalance');
    if (storedLiveBalance) {
      setLiveBalance(parseFloat(storedLiveBalance));
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
    // Optionally reset balances on logout or retain them
    // localStorage.removeItem('derivAiPaperBalance');
    // localStorage.removeItem('derivAiLiveBalance');
  }, []);

  // Persist balances to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('derivAiPaperBalance', paperBalance.toString());
  }, [paperBalance]);

  useEffect(() => {
    localStorage.setItem('derivAiLiveBalance', liveBalance.toString());
  }, [liveBalance]);

  return (
    <AuthContext.Provider 
      value={{ 
        authStatus, 
        userInfo, 
        login, 
        logout,
        paperBalance,
        setPaperBalance,
        liveBalance,
        setLiveBalance
      }}
    >
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
