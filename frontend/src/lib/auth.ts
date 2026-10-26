'use client';

import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { getUserInfo } from '@/services/auth.services';
import { SESSION_INTERVALS, TOKEN_EXPIRATION } from './tokenConstants';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  phoneNumber?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  profileVerified?: boolean;
}

export interface Session {
  user: User;
  expires: string;
}

type AuthState = {
  session: Session | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function useAuthState(enabled = true): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const user = await getUserInfo();
      if (user) {
        setSession((current) => {
          const unchanged = current &&
            current.user.id === user.id &&
            current.user.name === user.name &&
            current.user.email === user.email &&
            current.user.image === user.image &&
            current.user.phoneNumber === user.phoneNumber &&
            current.user.role === user.role &&
            current.user.profileVerified === user.profileVerified;

          return unchanged ? current : {
            user,
            expires: new Date(Date.now() + TOKEN_EXPIRATION.SESSION_TOKEN * 1000).toISOString(),
          };
        });
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    loadSession();

    // Refresh session when page regains focus
    const handleFocus = () => {
      loadSession();
    };

    // Refresh session every 5 minutes (300000ms)
    const sessionRefreshInterval = setInterval(() => {
      loadSession();
    }, SESSION_INTERVALS.CHECK);

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(sessionRefreshInterval);
    };
  }, [enabled]);

  return { session, loading, refetch: loadSession };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();

  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  const localAuth = useAuthState(context === null);

  return context ?? localAuth;
}


