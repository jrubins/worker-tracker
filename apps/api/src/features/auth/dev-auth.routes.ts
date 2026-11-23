import { Router } from 'express';
import { DevTokenRequestSchema, type DevTokenResponse, type Session } from '@app/shared';
import { signTestToken } from '../../auth/tokens.ts';
import type { WebSessions } from '../../auth/web-sessions.ts';
import { validate } from '../../lib/validate.ts';

/**
 * Development and test sign-in for any user ID, so the web app and end-to-end tests work
 * without a WorkOS account. Only mounted when AUTH_TEST_SECRET is configured, which config
 * refuses in production.
 *
 * - POST /dev-token: a short-lived bearer token (API clients and tests).
 * - POST /dev-session: signs the browser in with a session cookie, like WorkOS sign-in does.
 */
export function devAuthRouter(testSecret: string, webSessions: WebSessions): Router {
  const router = Router();

  router.post('/dev-token', async (req, res) => {
    const { userId } = validate(DevTokenRequestSchema, req.body ?? {});
    const body: DevTokenResponse = { token: await signTestToken(testSecret, userId), userId };
    res.json(body);
  });

  router.post('/dev-session', async (req, res) => {
    const { userId } = validate(DevTokenRequestSchema, req.body ?? {});
    webSessions.startDevSession(res, await signTestToken(testSecret, userId, '24h'));
    const body: Session = { user: { id: userId, email: null, name: userId }, signIn: 'dev' };
    res.json(body);
  });

  return router;
}
