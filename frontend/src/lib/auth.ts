'use client';

import { useEffect, useState } from 'react';
import { getUserInfo } from '@/services/auth.services';
import { SESSION_INTERVALS, TOKEN_EXPIRATION } from './tokenConstants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER';
  profileVerified?: boolean;
}

export interface Session {
  user: User;
  expires: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const user = await getUserInfo();
      if (user) {
        setSession({
          user: user,
          expires: new Date(Date.now() + TOKEN_EXPIRATION.SESSION_TOKEN * 1000).toISOString(),
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
  }, []);

  return { session, loading, refetch: loadSession };
}


