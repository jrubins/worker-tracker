import type { Request, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.ts';
import { decodeJwt } from 'jose';
import { InvalidTokenError, type TokenVerifier } from './tokens.ts';

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

/**
 * Requires a valid web session token. Responds 401 without one (or with an invalid one) and
 * 403 for users outside ALLOWED_USER_IDS. Mount before every route that isn't public.
 */
export function requireUser(
  verifier: TokenVerifier,
  allowedUserIds: readonly string[],
): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req);
    if (!token) {
      res.set('WWW-Authenticate', 'Bearer');
      throw new HttpError(401, 'unauthorized', 'Sign in required');
    }
    try {
      const { userId } = await verifier.verifySession(token);
      if (!isAllowedUser(allowedUserIds, userId)) {
        throw new HttpError(403, 'forbidden', 'This account does not have access');
      }
      requestUsers.set(req, userId);
      next();
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        // The reason and issuer (never the token) make rejected sign-ins diagnosable.
        req.log.warn({ reason: error.message, issuer: issuerOrUndefined(token) }, 'token rejected');
        res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
        throw new HttpError(401, 'unauthorized', 'Invalid or expired token');
      }
      throw error;
    }
  };
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
