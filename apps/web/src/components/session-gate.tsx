import * as Sentry from '@sentry/react';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/session';
import { LoadingScreen } from './loading-screen';
import { SignInScreen } from './sign-in-screen';

/**
 * Renders the app only for a signed-in user; otherwise the sign-in screen. The router (and so
 * every route loader and query) mounts inside this gate, so API calls always have a session.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, user, signInMode, signIn } = useSession();

  // WorkOS sends users to /login to start sign-in (the app's "Initiate login URI").
  useEffect(() => {
    if (
      status === 'signed-out' &&
      signInMode === 'workos' &&
      window.location.pathname === '/login'
    ) {
      void signIn();
    }
  }, [status, signInMode, signIn]);

  // Errors and traces carry the user ID only (no email; see dataCollection in lib/sentry.ts).
  useEffect(() => {
    Sentry.setUser(user ? { id: user.id } : null);
  }, [user]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }
  if (status === 'error') {
    return <p className="p-8 text-sm">Can't reach the server. Check your connection and reload.</p>;
  }
  if (status === 'signed-out') {
    if (signInMode === 'none') return <p className="p-8 text-sm">Sign-in is not configured.</p>;
    return <SignInScreen provider={signInMode} onSignIn={signIn} />;
  }
  return children;
}
