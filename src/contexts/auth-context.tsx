
'use client';

import type { UserInfo, AuthStatus, AuthMethod } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter

interface AuthContextType {
  authStatus: AuthStatus;
  userInfo: UserInfo | null;
  login: (user: UserInfo, method: AuthMethod) => void;
  logout: () => void;
  paperBalance: number; // This will serve as generic demo balance for non-Deriv users
  setPaperBalance: React.Dispatch<React.SetStateAction<number>>;
  liveBalance: number;  // This will serve as generic live balance for non-Deriv users (simulated)
  setLiveBalance: React.Dispatch<React.SetStateAction<number>>;
  // Specific Deriv balances, could be different from generic paper/live balances
  derivDemoBalance: number | null;
  derivLiveBalance: number | null;
  derivDemoAccountId: string | null;
  derivLiveAccountId: string | null;
  currentAuthMethod: AuthMethod;
  switchToDerivDemo: () => void;
  switchToDerivLive: () => void;
  selectedDerivAccountType: 'demo' | 'live' | null; // Tracks if Deriv user is on their demo or live
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PAPER_BALANCE = 10000;
const DEFAULT_LIVE_BALANCE = 0; // Start with 0 for simulated live for non-deriv users

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentAuthMethod, setCurrentAuthMethod] = useState<AuthMethod>(null);

  // Generic balances for non-Deriv authenticated users or as a fallback
  const [paperBalance, setPaperBalance] = useState<number>(DEFAULT_PAPER_BALANCE);
  const [liveBalance, setLiveBalance] = useState<number>(DEFAULT_LIVE_BALANCE);

  // Deriv specific balances and account IDs
  const [derivDemoBalance, setDerivDemoBalance] = useState<number | null>(null);
  const [derivLiveBalanceState, setDerivLiveBalanceState] = useState<number | null>(null); // Renamed to avoid conflict
  const [derivDemoAccountId, setDerivDemoAccountId] = useState<string | null>(null);
  const [derivLiveAccountId, setDerivLiveAccountId] = useState<string | null>(null);
  const [selectedDerivAccountType, setSelectedDerivAccountType] = useState<'demo' | 'live' | null>(null);


  useEffect(() => {
    const storedUser = localStorage.getItem('derivAiUser');
    const storedAuthMethod = localStorage.getItem('derivAiAuthMethod') as AuthMethod;
    const storedPaperBalance = localStorage.getItem('derivAiPaperBalance');
    const storedLiveBalance = localStorage.getItem('derivAiLiveBalance'); // Generic live balance
    
    const storedDerivDemoBalance = localStorage.getItem('derivAiDerivDemoBalance');
    const storedDerivLiveBalance = localStorage.getItem('derivAiDerivLiveBalance');
    const storedDerivDemoAccountId = localStorage.getItem('derivAiDerivDemoAccountId');
    const storedDerivLiveAccountId = localStorage.getItem('derivAiDerivLiveAccountId');
    const storedSelectedDerivAccountType = localStorage.getItem('derivAiSelectedDerivAccountType') as 'demo' | 'live' | null;


    if (storedUser && storedAuthMethod) {
      try {
        const user = JSON.parse(storedUser) as UserInfo;
        setUserInfo(user);
        setCurrentAuthMethod(storedAuthMethod);
        setAuthStatus('authenticated');

        if (storedAuthMethod === 'deriv') {
          setDerivDemoBalance(storedDerivDemoBalance ? parseFloat(storedDerivDemoBalance) : user.derivDemoBalance || DEFAULT_PAPER_BALANCE);
          setDerivLiveBalanceState(storedDerivLiveBalance ? parseFloat(storedDerivLiveBalance) : user.derivRealBalance || 0);
          setDerivDemoAccountId(storedDerivDemoAccountId || user.derivDemoAccountId || 'D-DEMO-123');
          setDerivLiveAccountId(storedDerivLiveAccountId || user.derivRealAccountId || 'D-REAL-456');
          setSelectedDerivAccountType(storedSelectedDerivAccountType || 'demo');
        } else {
           // For non-Deriv auth methods, use generic balances
            if (storedPaperBalance) setPaperBalance(parseFloat(storedPaperBalance));
            else setPaperBalance(DEFAULT_PAPER_BALANCE);

            if (storedLiveBalance) setLiveBalance(parseFloat(storedLiveBalance));
            else setLiveBalance(DEFAULT_LIVE_BALANCE);
        }

      } catch (e) {
        console.error("Failed to parse stored user data", e);
        localStorage.clear(); // Clear potentially corrupted data
        setAuthStatus('unauthenticated');
      }
    } else {
      setAuthStatus('unauthenticated');
      setPaperBalance(DEFAULT_PAPER_BALANCE); // Initialize for demo mode
      setLiveBalance(DEFAULT_LIVE_BALANCE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((user: UserInfo, method: AuthMethod) => {
    setUserInfo(user);
    setCurrentAuthMethod(method);
    setAuthStatus('authenticated');
    localStorage.setItem('derivAiUser', JSON.stringify(user));
    localStorage.setItem('derivAiAuthMethod', method || '');

    if (method === 'deriv') {
        const demoBal = user.derivDemoBalance || DEFAULT_PAPER_BALANCE;
        const liveBal = user.derivRealBalance || 0; // Assuming 0 if not provided for real account
        const demoId = user.derivDemoAccountId || `VD${Math.floor(Math.random() * 1000000)}`; // Simulated Deriv Demo ID
        const liveId = user.derivRealAccountId || `CR${Math.floor(Math.random() * 1000000)}`; // Simulated Deriv Real ID

        setDerivDemoBalance(demoBal);
        setDerivLiveBalanceState(liveBal);
        setDerivDemoAccountId(demoId);
        setDerivLiveAccountId(liveId);
        setSelectedDerivAccountType('demo'); // Default to demo after Deriv login

        localStorage.setItem('derivAiDerivDemoBalance', demoBal.toString());
        localStorage.setItem('derivAiDerivLiveBalance', liveBal.toString());
        localStorage.setItem('derivAiDerivDemoAccountId', demoId);
        localStorage.setItem('derivAiDerivLiveAccountId', liveId);
        localStorage.setItem('derivAiSelectedDerivAccountType', 'demo');

        // For Deriv users, ensure generic balances reflect the selected Deriv account type
        setPaperBalance(demoBal); // Initially, paperBalance mirrors Deriv demo
        setLiveBalance(liveBal);  // And liveBalance mirrors Deriv live

    } else { // For 'email', 'google', 'demo'
        setPaperBalance(DEFAULT_PAPER_BALANCE); // Reset to default demo balance
        setLiveBalance(DEFAULT_LIVE_BALANCE); // Reset to default simulated live balance
        setSelectedDerivAccountType(null); // No Deriv account selected

        localStorage.setItem('derivAiPaperBalance', DEFAULT_PAPER_BALANCE.toString());
        localStorage.setItem('derivAiLiveBalance', DEFAULT_LIVE_BALANCE.toString());
        localStorage.removeItem('derivAiDerivDemoBalance');
        localStorage.removeItem('derivAiDerivLiveBalance');
        localStorage.removeItem('derivAiDerivDemoAccountId');
        localStorage.removeItem('derivAiDerivLiveAccountId');
        localStorage.removeItem('derivAiSelectedDerivAccountType');
    }
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    setUserInfo(null);
    setCurrentAuthMethod(null);
    setAuthStatus('unauthenticated');
    setSelectedDerivAccountType(null);
    
    // Clear all auth-related local storage
    localStorage.removeItem('derivAiUser');
    localStorage.removeItem('derivAiAuthMethod');
    localStorage.removeItem('derivAiPaperBalance'); // Keep balances if desired or reset
    localStorage.removeItem('derivAiLiveBalance');
    localStorage.removeItem('derivAiDerivDemoBalance');
    localStorage.removeItem('derivAiDerivLiveBalance');
    localStorage.removeItem('derivAiDerivDemoAccountId');
    localStorage.removeItem('derivAiDerivLiveAccountId');
    localStorage.removeItem('derivAiSelectedDerivAccountType');
    
    // Reset balances to default for next unauthenticated session
    setPaperBalance(DEFAULT_PAPER_BALANCE);
    setLiveBalance(DEFAULT_LIVE_BALANCE);
    setDerivDemoBalance(null);
    setDerivLiveBalanceState(null);
    setDerivDemoAccountId(null);
    setDerivLiveAccountId(null);

    router.push('/auth/login');
  }, [router]);

  // Persist generic balances to localStorage whenever they change
  useEffect(() => {
    if (currentAuthMethod !== 'deriv') { // Only save generic paper balance if not Deriv auth
      localStorage.setItem('derivAiPaperBalance', paperBalance.toString());
    }
  }, [paperBalance, currentAuthMethod]);

  useEffect(() => {
     if (currentAuthMethod !== 'deriv') { // Only save generic live balance if not Deriv auth
      localStorage.setItem('derivAiLiveBalance', liveBalance.toString());
    }
  }, [liveBalance, currentAuthMethod]);

  // Persist Deriv specific balances
  useEffect(() => {
    if (derivDemoBalance !== null) localStorage.setItem('derivAiDerivDemoBalance', derivDemoBalance.toString());
  }, [derivDemoBalance]);
  useEffect(() => {
    if (derivLiveBalanceState !== null) localStorage.setItem('derivAiDerivLiveBalance', derivLiveBalanceState.toString());
  }, [derivLiveBalanceState]);
   useEffect(() => {
    if (derivDemoAccountId !== null) localStorage.setItem('derivAiDerivDemoAccountId', derivDemoAccountId);
  }, [derivDemoAccountId]);
   useEffect(() => {
    if (derivLiveAccountId !== null) localStorage.setItem('derivAiDerivLiveAccountId', derivLiveAccountId);
  }, [derivLiveAccountId]);
   useEffect(() => {
    if (selectedDerivAccountType !== null) localStorage.setItem('derivAiSelectedDerivAccountType', selectedDerivAccountType);
  }, [selectedDerivAccountType]);


  const switchToDerivDemo = useCallback(() => {
    if (currentAuthMethod === 'deriv') {
        setSelectedDerivAccountType('demo');
        // Update generic balances to reflect Deriv demo
        if (derivDemoBalance !== null) setPaperBalance(derivDemoBalance);
    }
  }, [currentAuthMethod, derivDemoBalance]);

  const switchToDerivLive = useCallback(() => {
    if (currentAuthMethod === 'deriv') {
        setSelectedDerivAccountType('live');
        // Update generic balances to reflect Deriv live
        if (derivLiveBalanceState !== null) setLiveBalance(derivLiveBalanceState);
    }
  }, [currentAuthMethod, derivLiveBalanceState]);


  return (
    <AuthContext.Provider 
      value={{ 
        authStatus, 
        userInfo, 
        login, 
        logout,
        paperBalance, // Generic or Deriv Demo based on selectedDerivAccountType
        setPaperBalance,
        liveBalance,  // Generic or Deriv Live based on selectedDerivAccountType
        setLiveBalance,
        derivDemoBalance,
        derivLiveBalance: derivLiveBalanceState,
        derivDemoAccountId,
        derivLiveAccountId,
        currentAuthMethod,
        switchToDerivDemo,
        switchToDerivLive,
        selectedDerivAccountType,
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

