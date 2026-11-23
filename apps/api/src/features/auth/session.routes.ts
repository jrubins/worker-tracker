import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { LogoutResponse, Session } from '@app/shared';
import type { WebSessions } from '../../auth/web-sessions.ts';
import type { WorkosSessions } from '../../auth/workos-sessions.ts';
import { HttpError, notFound } from '../../lib/http-error.ts';

export interface SessionRouterOptions {
  webSessions: WebSessions;
  workos: WorkosSessions | undefined;
  /** Public URL of the web app: sign-in and sign-out return there. */
  webUrl: string;
  /** Origins the web app is served from (CSRF check for sign-out). */
  trustedOrigins: readonly string[];
}

/**
 * The web app's sign-in, mounted at /auth (the browser reaches it at /api/auth):
 *
 * - GET /session: who is signed in, and how to sign in otherwise. Public.
 * - GET /login → AuthKit's hosted sign-in → GET /callback, which stores the session cookie.
 * - POST /logout: clears the cookie and returns WorkOS's sign-out URL to finish at.
 */
export function sessionRouter({
  webSessions,
  workos,
  webUrl,
  trustedOrigins,
}: SessionRouterOptions): Router {
  const router = Router();

  router.get('/session', async (req, res) => {
    const body: Session = {
      user: await webSessions.user(req, res),
      signIn: webSessions.signInMode,
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  router.get('/login', (req, res) => {
    if (!workos) throw notFound('WorkOS sign-in is not configured');
    const state = randomUUID();
    webSessions.setState(res, state);
    res.redirect(workos.authorizationUrl(state));
  });

  router.get('/callback', async (req, res) => {
    if (!workos) throw notFound('WorkOS sign-in is not configured');
    const { code, state } = req.query;
    const expected = webSessions.takeState(req, res);
    if (typeof code !== 'string' || typeof state !== 'string' || !expected || state !== expected) {
      throw new HttpError(400, 'invalid_sign_in', 'Sign-in could not be completed: start again');
    }
    const { sealedSession } = await workos.signIn(code);
    webSessions.startWorkosSession(res, sealedSession);
    res.redirect(webUrl);
  });

  router.post('/logout', async (req, res) => {
    const origin = req.headers.origin;
    if (!origin || !trustedOrigins.includes(origin)) {
      throw new HttpError(403, 'forbidden', 'Cross-site request refused');
    }
    const body: LogoutResponse = { redirectUrl: await webSessions.end(req, res) };
    res.json(body);
  });

  return router;
}
