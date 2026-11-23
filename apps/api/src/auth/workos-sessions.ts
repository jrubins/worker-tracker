import type { SessionUser } from '@app/shared';
import { AuthenticateWithSessionCookieFailureReason, WorkOS, type User } from '@workos-inc/node';

/**
 * Web sign-in with WorkOS, kept on the server: the browser only ever holds an encrypted
 * ("sealed") session cookie that WorkOS's SDK creates, reads and refreshes. Tests replace this
 * interface with a fake, so they never call WorkOS.
 */
export interface WorkosSessions {
  /** Where to send the browser to sign in (AuthKit's hosted page). */
  authorizationUrl(state: string): string;
  /** Exchanges the code AuthKit returned for a sealed session. */
  signIn(code: string): Promise<{ sealedSession: string; user: SessionUser }>;
  /**
   * The session's user, or null if it is invalid or can't be refreshed. `refreshedSession` is set
   * when the access token had expired and was refreshed: store it as the new cookie.
   */
  load(sealedSession: string): Promise<{ user: SessionUser; refreshedSession?: string } | null>;
  /** WorkOS's sign-out URL for this session (ends it at WorkOS too), or null if unreadable. */
  logoutUrl(sealedSession: string): Promise<string | null>;
}

export interface WorkosSessionsOptions {
  apiKey: string;
  clientId: string;
  /** Encrypts the session cookie (WORKOS_COOKIE_PASSWORD). */
  cookiePassword: string;
  /** Where AuthKit sends the browser back: <WEB_URL>/api/auth/callback. */
  redirectUri: string;
  /** Where the browser lands after signing out at WorkOS. */
  returnTo: string;
}

export function createWorkosSessions(options: WorkosSessionsOptions): WorkosSessions {
  const workos = new WorkOS({ apiKey: options.apiKey, clientId: options.clientId });
  const users = workos.userManagement;
  const open = (sessionData: string) =>
    users.loadSealedSession({ sessionData, cookiePassword: options.cookiePassword });

  return {
    authorizationUrl: (state) =>
      users.getAuthorizationUrl({
        provider: 'authkit',
        clientId: options.clientId,
        redirectUri: options.redirectUri,
        state,
      }),

    async signIn(code) {
      const result = await users.authenticateWithCode({
        code,
        clientId: options.clientId,
        session: { sealSession: true, cookiePassword: options.cookiePassword },
      });
      if (!result.sealedSession) throw new Error('WorkOS returned no sealed session');
      return { sealedSession: result.sealedSession, user: toSessionUser(result.user) };
    },

    async load(sealedSession) {
      const session = open(sealedSession);
      const current = await session.authenticate();
      if (current.authenticated) return { user: toSessionUser(current.user) };
      // An expired access token: trade the refresh token for a new session.
      if (current.reason !== AuthenticateWithSessionCookieFailureReason.INVALID_JWT) return null;
      const refreshed = await session.refresh();
      if (!refreshed.authenticated || !refreshed.sealedSession) return null;
      return { user: toSessionUser(refreshed.user), refreshedSession: refreshed.sealedSession };
    },

    async logoutUrl(sealedSession) {
      try {
        return await open(sealedSession).getLogoutUrl({ returnTo: options.returnTo });
      } catch {
        return null;
      }
    },
  };
}

function toSessionUser(user: User): SessionUser {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return { id: user.id, email: user.email, name: name || null };
}
