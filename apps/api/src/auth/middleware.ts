import type { Request, RequestHandler, Response } from 'express';
import { HttpError } from '../lib/http-error.ts';
import { decodeJwt } from 'jose';
import { InvalidTokenError, type TokenVerifier } from './tokens.ts';
import type { WebSessions } from './web-sessions.ts';

/** Authenticated user per request, set by `requireUser`. Read it with `currentUserId`. */
const requestUsers = new WeakMap<Request, string>();

/** Reads the token from an `Authorization: Bearer <token>` header. */
export function bearerToken(req: Request): string | undefined {
  return req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
}

/** Optional allowlist: when non-empty, only these user IDs may use the API. */
export function isAllowedUser(allowedUserIds: readonly string[], userId: string): boolean {
  return allowedUserIds.length === 0 || allowedUserIds.includes(userId);
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface RequireUserOptions {
  verifier: TokenVerifier;
  webSessions: WebSessions;
  allowedUserIds: readonly string[];
  /** Origins the web app is served from: cookie-authenticated writes must come from one. */
  trustedOrigins: readonly string[];
}

/**
 * Requires a signed-in user: a bearer token (API clients and tests) or the web app's session
 * cookie. Responds 401 without one (or with an invalid one) and 403 for users outside
 * ALLOWED_USER_IDS. Mount before every route that isn't public.
 *
 * Cookies are sent automatically, so a cookie-authenticated request that changes data must
 * also come from the web app's own origin (CSRF protection on top of SameSite=Lax).
 */
export function requireUser({
  verifier,
  webSessions,
  allowedUserIds,
  trustedOrigins,
}: RequireUserOptions): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req);
    let userId: string;
    if (token) {
      userId = await verifyBearer(req, res, verifier, token);
    } else {
      const user = await webSessions.user(req, res);
      if (!user) {
        res.set('WWW-Authenticate', 'Bearer');
        throw new HttpError(401, 'unauthorized', 'Sign in required');
      }
      const origin = req.headers.origin;
      if (!SAFE_METHODS.has(req.method) && (!origin || !trustedOrigins.includes(origin))) {
        throw new HttpError(403, 'forbidden', 'Cross-site request refused');
      }
      userId = user.id;
    }
    if (!isAllowedUser(allowedUserIds, userId)) {
      throw new HttpError(403, 'forbidden', 'This account does not have access');
    }
    requestUsers.set(req, userId);
    next();
  };
}

async function verifyBearer(
  req: Request,
  res: Response,
  verifier: TokenVerifier,
  token: string,
): Promise<string> {
  try {
    return (await verifier.verifySession(token)).userId;
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      // The reason and issuer (never the token) make rejected sign-ins diagnosable.
      req.log.warn({ reason: error.message, issuer: issuerOrUndefined(token) }, 'token rejected');
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      throw new HttpError(401, 'unauthorized', 'Invalid or expired token');
    }
    throw error;
  }
}

/** The authenticated user's ID. Only call in handlers mounted behind `requireUser`. */
export function currentUserId(req: Request): string {
  const userId = requestUsers.get(req);
  if (!userId) throw new HttpError(401, 'unauthorized', 'Sign in required');
  return userId;
}

function issuerOrUndefined(token: string): string | undefined {
  try {
    return decodeJwt(token).iss;
  } catch {
    return undefined;
  }
}
