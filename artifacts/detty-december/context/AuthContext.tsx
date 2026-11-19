import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionQueryKey, useGetSession, type SessionInfo } from '@workspace/api-client-react';

interface AuthState {
  ready: boolean;
  user: SessionInfo['user'];
  pass: SessionInfo['pass'];
  demoPayments: boolean;
  supportWhatsappUrl: string | null;
  acceptSession: (session: SessionInfo) => void;
  refresh: () => void;
  unavailable: boolean;
}
const AuthContext = createContext<AuthState | null>(null);
export const signedOut: SessionInfo = { user: null, pass: null, demoPayments: false, supportWhatsappUrl: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const session = useGetSession({ query: { staleTime: 0, retry: false, refetchInterval: 30_000 } });
  const [now, setNow] = useState(Date.now());
  const data = session.isError ? signedOut : session.data ?? signedOut;
  const expiry = data.pass && !data.user?.isAdmin ? Date.parse(data.pass.expiresAt) : null;
  const expired = expiry !== null && expiry <= now;

  useEffect(() => {
    if (expiry === null) return;
    const timer = setTimeout(() => { setNow(Date.now()); void session.refetch(); }, Math.max(0, expiry - Date.now()) + 30);
    return () => clearTimeout(timer);
  }, [expiry]);

  useEffect(() => {
    const update = () => { setNow(Date.now()); void session.refetch(); };
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    // React Native AppState does not cover browser focus in every web runtime.
    if (typeof window !== 'undefined') window.addEventListener('focus', update);
    return () => {
      listener.remove();
      if (typeof window !== 'undefined') window.removeEventListener('focus', update);
    };
  }, []);

  // Never leave another user's guide data in the query cache.
  useEffect(() => {
    if (!data.user || expired || (!data.pass && !data.user.isAdmin)) {
      client.removeQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/guide/') });
    }
  }, [data.user?.id, data.user?.isAdmin, expired, !!data.pass, client]);

  const acceptSession = (value: SessionInfo) => {
    client.removeQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/guide/') });
    setNow(Date.now());
    client.setQueryData(getGetSessionQueryKey(), value);
  };
  return (
    <AuthContext.Provider value={{
      ready: !session.isPending, user: expired ? null : data.user, pass: expired ? null : data.pass,
      demoPayments: data.demoPayments, acceptSession, refresh: () => { void session.refetch(); },
      supportWhatsappUrl: data.supportWhatsappUrl,
      unavailable: session.isError,
    }}>{children}</AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
