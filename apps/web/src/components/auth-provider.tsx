import { LogoutResponseSchema, SessionSchema } from '@app/shared';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { env } from '@/lib/env';
import { SessionContext, type Session } from '@/lib/session';

const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => apiRequest('/auth/session', SessionSchema),
  staleTime: Infinity,
});

/**
 * Provides the session (see lib/session.ts) from the API's GET /auth/session. The API decides
 * how to sign in: WorkOS AuthKit (a full-page redirect to /auth/login, which comes back with
 * the session cookie set), or in development a test sign-in for any user ID.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(sessionQuery);

  const signInMode = data?.signIn ?? 'none';
  const session = useMemo<Session>(
    () => ({
      status: isPending ? 'loading' : isError ? 'error' : data?.user ? 'signed-in' : 'signed-out',
      user: data?.user ?? null,
      signInMode,
      signIn: async (userId) => {
        if (data?.signIn === 'workos') {
          window.location.assign(`${env.apiUrl}/auth/login`);
          return;
        }
        const next = await apiRequest('/auth/dev-session', SessionSchema, {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        queryClient.setQueryData(sessionQuery.queryKey, next);
      },
      signOut: async () => {
        const { redirectUrl } = await apiRequest('/auth/logout', LogoutResponseSchema, {
          method: 'POST',
        });
        if (redirectUrl) {
          // Finish at WorkOS, which ends its session and sends the browser back to the app.
          window.location.assign(redirectUrl);
          return;
        }
        // Show the sign-in screen, then drop the previous user's cached data.
        queryClient.setQueryData(sessionQuery.queryKey, { user: null, signIn: signInMode });
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
      },
    }),
    [data, signInMode, isPending, isError, queryClient],
  );

  return <SessionContext value={session}>{children}</SessionContext>;
}
