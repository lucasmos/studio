
'use client';

import type { UserInfo, AuthStatus, AuthMethod } from '@/types';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, isFirebaseInitialized } from '@/lib/firebase/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
  authStatus: AuthStatus;
  userInfo: UserInfo | null;
  login: (user: UserInfo, method: AuthMethod) => void; // Kept for Deriv mock login
  logout: () => void;
  paperBalance: number; 
  setPaperBalance: React.Dispatch<React.SetStateAction<number>>;
  liveBalance: number;  
  setLiveBalance: React.Dispatch<React.SetStateAction<number>>;
  derivDemoBalance: number | null;
  derivLiveBalance: number | null;
  derivDemoAccountId: string | null;
  derivLiveAccountId: string | null;
  currentAuthMethod: AuthMethod;
  switchToDerivDemo: () => void;
  switchToDerivLive: () => void;
  selectedDerivAccountType: 'demo' | 'live' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PAPER_BALANCE = 10000;
const DEFAULT_LIVE_BALANCE = 0; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentAuthMethod, setCurrentAuthMethod] = useState<AuthMethod>(null);

  const [paperBalance, setPaperBalance] = useState<number>(DEFAULT_PAPER_BALANCE);
  const [liveBalance, setLiveBalance] = useState<number>(DEFAULT_LIVE_BALANCE);

  const [derivDemoBalance, setDerivDemoBalance] = useState<number | null>(null);
  const [derivLiveBalanceState, setDerivLiveBalanceState] = useState<number | null>(null);
  const [derivDemoAccountId, setDerivDemoAccountId] = useState<string | null>(null);
  const [derivLiveAccountId, setDerivLiveAccountId] = useState<string | null>(null);
  const [selectedDerivAccountType, setSelectedDerivAccountType] = useState<'demo' | 'live' | null>(null);

  // Initialize auth state from Firebase or localStorage
  useEffect(() => {
    if (!isFirebaseInitialized()) {
      // If Firebase is not initialized, rely on localStorage for mock/Deriv auth
      // This part handles the existing Deriv mock login persistence
      const storedUser = localStorage.getItem('derivAiUser');
      const storedAuthMethod = localStorage.getItem('derivAiAuthMethod') as AuthMethod;
      if (storedUser && storedAuthMethod === 'deriv') {
        try {
          const user = JSON.parse(storedUser) as UserInfo;
          setUserInfo(user);
          setCurrentAuthMethod('deriv');
          setAuthStatus('authenticated');
          // Load Deriv specific balances etc.
          setDerivDemoBalance(user.derivDemoBalance || DEFAULT_PAPER_BALANCE);
          setDerivLiveBalanceState(user.derivRealBalance || 0);
          setDerivDemoAccountId(user.derivDemoAccountId || `VD-mock-${user.id.slice(0,6)}`);
          setDerivLiveAccountId(user.derivRealAccountId || `CR-mock-${user.id.slice(0,6)}`);
          setSelectedDerivAccountType(localStorage.getItem('derivAiSelectedDerivAccountType') as 'demo' | 'live' || 'demo');
          setPaperBalance(user.derivDemoBalance || DEFAULT_PAPER_BALANCE);
          setLiveBalance(user.derivRealBalance || 0);
        } catch (e) {
          console.error("Failed to parse stored Deriv user data", e);
          localStorage.removeItem('derivAiUser');
          localStorage.removeItem('derivAiAuthMethod');
          setAuthStatus('unauthenticated');
        }
      } else {
         setAuthStatus('unauthenticated');
         setPaperBalance(parseFloat(localStorage.getItem('derivAiPaperBalance') || DEFAULT_PAPER_BALANCE.toString()));
         setLiveBalance(parseFloat(localStorage.getItem('derivAiLiveBalance') || DEFAULT_LIVE_BALANCE.toString()));
      }
      return;
    }

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const method = firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email';
        
        const appUser: UserInfo = {
          id: firebaseUser.uid,
          name: name,
          email: firebaseUser.email,
          authMethod: method,
          photoURL: firebaseUser.photoURL,
        };
        setUserInfo(appUser);
        setCurrentAuthMethod(method);
        setAuthStatus('authenticated');
        localStorage.setItem('derivAiUser', JSON.stringify(appUser));
        localStorage.setItem('derivAiAuthMethod', method);

        // For Firebase users, initialize with default paper/live balances
        // Deriv balances are not applicable unless linked explicitly (future feature)
        setPaperBalance(parseFloat(localStorage.getItem(`derivAiPaperBalance_${firebaseUser.uid}`) || DEFAULT_PAPER_BALANCE.toString()));
        setLiveBalance(parseFloat(localStorage.getItem(`derivAiLiveBalance_${firebaseUser.uid}`) || DEFAULT_LIVE_BALANCE.toString()));
        setSelectedDerivAccountType(null); // Not a Deriv login initially
        
      } else {
        // No Firebase user, check for persisted Deriv mock login
        const storedUser = localStorage.getItem('derivAiUser');
        const storedAuthMethod = localStorage.getItem('derivAiAuthMethod') as AuthMethod;
        if (storedUser && storedAuthMethod === 'deriv') {
           try {
            const user = JSON.parse(storedUser) as UserInfo;
            setUserInfo(user);
            setCurrentAuthMethod('deriv');
            setAuthStatus('authenticated');
             // Load Deriv specific balances etc.
            setDerivDemoBalance(user.derivDemoBalance || DEFAULT_PAPER_BALANCE);
            setDerivLiveBalanceState(user.derivRealBalance || 0);
            setDerivDemoAccountId(user.derivDemoAccountId || `VD-mock-${user.id.slice(0,6)}`);
            setDerivLiveAccountId(user.derivRealAccountId || `CR-mock-${user.id.slice(0,6)}`);
            setSelectedDerivAccountType(localStorage.getItem('derivAiSelectedDerivAccountType') as 'demo' | 'live' || 'demo');
            setPaperBalance(user.derivDemoBalance || DEFAULT_PAPER_BALANCE);
            setLiveBalance(user.derivRealBalance || 0);
          } catch (e) {
            console.error("Failed to parse stored Deriv user data on Firebase logout", e);
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      }
    });

    return () => unsubscribe();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const clearAuthData = () => {
    setUserInfo(null);
    setCurrentAuthMethod(null);
    setAuthStatus('unauthenticated');
    setSelectedDerivAccountType(null);
    setDerivDemoBalance(null);
    setDerivLiveBalanceState(null);
    setDerivDemoAccountId(null);
    setDerivLiveAccountId(null);
    
    localStorage.removeItem('derivAiUser');
    localStorage.removeItem('derivAiAuthMethod');
    localStorage.removeItem('derivAiSelectedDerivAccountType');
    // Keep general paper/live balances for unauthenticated demo use, or reset if desired
    // For now, we reset to default if no specific user persistence for them.
    setPaperBalance(DEFAULT_PAPER_BALANCE); 
    setLiveBalance(DEFAULT_LIVE_BALANCE);
    localStorage.setItem('derivAiPaperBalance', DEFAULT_PAPER_BALANCE.toString()); // Persist default for next unauth session
    localStorage.setItem('derivAiLiveBalance', DEFAULT_LIVE_BALANCE.toString());
  };


  // Login specifically for Deriv mock
  const login = useCallback((user: UserInfo, method: AuthMethod) => {
    if (method !== 'deriv') {
        // This login function from AuthContext is now primarily for the Deriv mock.
        // Firebase auth is handled by onAuthStateChanged.
        console.warn("AuthContext.login called with non-Deriv method. This should be handled by Firebase.");
        return;
    }
    setUserInfo(user);
    setCurrentAuthMethod(method);
    setAuthStatus('authenticated');
    localStorage.setItem('derivAiUser', JSON.stringify(user));
    localStorage.setItem('derivAiAuthMethod', method);

    const demoBal = user.derivDemoBalance || DEFAULT_PAPER_BALANCE;
    const liveBal = user.derivRealBalance || 0;
    const demoId = user.derivDemoAccountId || `VD-mock-${user.id.slice(0,6)}`;
    const liveId = user.derivRealAccountId || `CR-mock-${user.id.slice(0,6)}`;

    setDerivDemoBalance(demoBal);
    setDerivLiveBalanceState(liveBal);
    setDerivDemoAccountId(demoId);
    setDerivLiveAccountId(liveId);
    setSelectedDerivAccountType('demo'); 
    setPaperBalance(demoBal); 
    setLiveBalance(liveBal);  

    localStorage.setItem('derivAiDerivDemoBalance', demoBal.toString());
    localStorage.setItem('derivAiDerivLiveBalance', liveBal.toString());
    localStorage.setItem('derivAiDerivDemoAccountId', demoId);
    localStorage.setItem('derivAiDerivLiveAccountId', liveId);
    localStorage.setItem('derivAiSelectedDerivAccountType', 'demo');
    
    router.push('/');
  }, [router]);


  const logout = useCallback(async () => {
    if (currentAuthMethod === 'email' || currentAuthMethod === 'google') {
      if(isFirebaseInitialized()) {
        await signOut(auth);
      }
      // onAuthStateChanged will call clearAuthData
    } else if (currentAuthMethod === 'deriv') {
      clearAuthData(); // Clear mock Deriv auth data
    } else {
      clearAuthData(); // General fallback
    }
    if(!pathname.startsWith('/auth')) {
       router.push('/auth/login');
    }
  }, [currentAuthMethod, router, pathname]);

  // Persist generic paper/live balances to localStorage, namespaced by user ID if available
  useEffect(() => {
    const balanceKey = userInfo ? `derivAiPaperBalance_${userInfo.id}` : 'derivAiPaperBalance';
    localStorage.setItem(balanceKey, paperBalance.toString());
  }, [paperBalance, userInfo]);

  useEffect(() => {
    const balanceKey = userInfo ? `derivAiLiveBalance_${userInfo.id}` : 'derivAiLiveBalance';
    localStorage.setItem(balanceKey, liveBalance.toString());
  }, [liveBalance, userInfo]);

  // Persist Deriv specific balances (these are only relevant if currentAuthMethod is 'deriv')
  useEffect(() => {
    if (currentAuthMethod === 'deriv' && derivDemoBalance !== null) localStorage.setItem('derivAiDerivDemoBalance', derivDemoBalance.toString());
  }, [derivDemoBalance, currentAuthMethod]);
  useEffect(() => {
    if (currentAuthMethod === 'deriv' && derivLiveBalanceState !== null) localStorage.setItem('derivAiDerivLiveBalance', derivLiveBalanceState.toString());
  }, [derivLiveBalanceState, currentAuthMethod]);
   useEffect(() => {
    if (currentAuthMethod === 'deriv' && derivDemoAccountId !== null) localStorage.setItem('derivAiDerivDemoAccountId', derivDemoAccountId);
  }, [derivDemoAccountId, currentAuthMethod]);
   useEffect(() => {
    if (currentAuthMethod === 'deriv' && derivLiveAccountId !== null) localStorage.setItem('derivAiDerivLiveAccountId', derivLiveAccountId);
  }, [derivLiveAccountId, currentAuthMethod]);
   useEffect(() => {
    if (currentAuthMethod === 'deriv' && selectedDerivAccountType !== null) localStorage.setItem('derivAiSelectedDerivAccountType', selectedDerivAccountType);
  }, [selectedDerivAccountType, currentAuthMethod]);


  const switchToDerivDemo = useCallback(() => {
    if (currentAuthMethod === 'deriv') {
        setSelectedDerivAccountType('demo');
        if (derivDemoBalance !== null) setPaperBalance(derivDemoBalance); // Update general paper balance
    }
  }, [currentAuthMethod, derivDemoBalance]);

  const switchToDerivLive = useCallback(() => {
    if (currentAuthMethod === 'deriv') {
        setSelectedDerivAccountType('live');
        if (derivLiveBalanceState !== null) setLiveBalance(derivLiveBalanceState); // Update general live balance
    }
  }, [currentAuthMethod, derivLiveBalanceState]);


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
