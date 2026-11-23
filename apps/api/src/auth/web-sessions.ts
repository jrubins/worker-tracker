import type { SessionUser } from '@app/shared';
import type { CookieOptions, Request, Response } from 'express';
import type { TokenVerifier } from './tokens.ts';
import type { WorkosSessions } from './workos-sessions.ts';

/**
 * The web app's session lives in an HttpOnly cookie on the web app's own site: the browser
 * calls the API through <WEB_URL>/api (a Vercel rewrite in production, Vite's proxy in
 * development), so the cookie is first-party and survives reloads. Page scripts never see it.
 *
 * - WorkOS sign-in stores WorkOS's sealed (encrypted) session in `wt_session`.
 * - Development and test sign-in stores a test token in `wt_dev_session` (only when
 *   AUTH_TEST_SECRET is set, which config refuses in production).
 */
export const SESSION_COOKIE = 'wt_session';
export const DEV_SESSION_COOKIE = 'wt_dev_session';
/** Ties AuthKit's redirect back to the browser that started sign-in (OAuth `state`). */
export const STATE_COOKIE = 'wt_auth_state';

const DAY_MS = 24 * 60 * 60 * 1000;

export type SignInMode = 'workos' | 'dev' | 'none';

export interface WebSessionsOptions {
  verifier: TokenVerifier;
  workos: WorkosSessions | undefined;
  /** Whether development sign-in (test tokens) is available. */
  devSignIn: boolean;
  /** Mark cookies Secure (HTTPS only): true whenever the web app is served over HTTPS. */
  secure: boolean;
}

export type WebSessions = ReturnType<typeof createWebSessions>;

export function createWebSessions({ verifier, workos, devSignIn, secure }: WebSessionsOptions) {
  const cookie = (maxAge: number): CookieOptions => ({
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  const clear = (res: Response, name: string) =>
    res.clearCookie(name, { ...cookie(0), maxAge: undefined });

  const signInMode: SignInMode = workos ? 'workos' : devSignIn ? 'dev' : 'none';

  return {
    signInMode,

    /**
     * The signed-in user from the request's cookies, or null. Refreshes an expired WorkOS
     * session (setting the new cookie) and clears cookies that no longer work.
     */
    async user(req: Request, res: Response): Promise<SessionUser | null> {
      const sealed = readCookie(req, SESSION_COOKIE);
      if (sealed && workos) {
        const session = await workos.load(sealed);
        if (!session) {
          clear(res, SESSION_COOKIE);
          return null;
        }
        if (session.refreshedSession) {
          res.cookie(SESSION_COOKIE, session.refreshedSession, cookie(30 * DAY_MS));
        }
        return session.user;
      }
      const devToken = readCookie(req, DEV_SESSION_COOKIE);
      if (devToken && devSignIn) {
        try {
          const { userId } = await verifier.verifySession(devToken);
          return { id: userId, email: null, name: userId };
        } catch {
          clear(res, DEV_SESSION_COOKIE);
          return null;
        }
      }
      return null;
    },

    startWorkosSession(res: Response, sealedSession: string) {
      res.cookie(SESSION_COOKIE, sealedSession, cookie(30 * DAY_MS));
    },

    startDevSession(res: Response, token: string) {
      res.cookie(DEV_SESSION_COOKIE, token, cookie(DAY_MS));
    },

    /** Ends the session here; returns WorkOS's sign-out URL when it was a WorkOS session. */
    async end(req: Request, res: Response): Promise<string | null> {
      const sealed = readCookie(req, SESSION_COOKIE);
      clear(res, SESSION_COOKIE);
      clear(res, DEV_SESSION_COOKIE);
      return sealed && workos ? workos.logoutUrl(sealed) : null;
    },

    setState(res: Response, state: string) {
      res.cookie(STATE_COOKIE, state, cookie(10 * 60 * 1000));
    },

    /** The state this browser started sign-in with (read once: the cookie is cleared). */
    takeState(req: Request, res: Response): string | undefined {
      const state = readCookie(req, STATE_COOKIE);
      clear(res, STATE_COOKIE);
      return state;
    },
  };
}

/** One cookie from the request's Cookie header. */
export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}
