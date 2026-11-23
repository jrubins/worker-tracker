import type { SessionUser } from '@app/shared';
import { createContext, useContext } from 'react';

export type { SessionUser };

/**
 * The signed-in session. The API keeps it in an HttpOnly cookie (see apps/api/src/auth/
 * web-sessions.ts), so the browser never handles a token: this only says who is signed in and
 * how to sign in or out (components/auth-provider.tsx).
 */
export interface Session {
  status: 'loading' | 'error' | 'signed-out' | 'signed-in';
  user: SessionUser | null;
  /** 'workos' redirects to WorkOS AuthKit; 'dev' signs in as any user ID (development only). */
  signInMode: 'workos' | 'dev' | 'none';
  signIn: (userId?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <AuthProvider>');
  return session;
}
