import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

/**
 * Access tokens come from three issuers:
 *
 * - **WorkOS session access tokens** (bearer API clients): keys at
 *   `https://api.workos.com/sso/jwks/<clientId>`, naming our app in `client_id` (or `aud`).
 *   WorkOS's docs show the issuer as `https://api.workos.com`, as
 *   `https://api.workos.com/user_management/<clientId>`, and (for AuthKit-domain tokens) as the
 *   AuthKit domain, whose tokens are signed with the domain's keys: all three are accepted.
 * - **MCP clients such as Claude** (AuthKit as OAuth server): issuer is the AuthKit domain,
 *   keys at `<domain>/oauth2/jwks`, and `aud` is our MCP server's URL.
 * - **Test tokens** (local development and automated tests only): HS256, signed with
 *   `AUTH_TEST_SECRET`. Config refuses that secret in production.
 *
 * In every case the user is the token's `sub`.
 */

export const TEST_ISSUER = 'urn:app:test-auth';

export interface VerifiedToken {
  userId: string;
  /** Seconds since the epoch. */
  expiresAt: number;
  clientId: string;
}

/** Thrown for any token that is missing, malformed, expired or not issued for us. */
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export interface TokenVerifierOptions {
  workosClientId?: string | undefined;
  /** e.g. https://your-app.authkit.app */
  authkitDomain?: string | undefined;
  /** Public URL of our MCP endpoint: the audience of MCP access tokens. */
  mcpResourceUrl: string;
  testSecret?: string | undefined;
  /** Replace the remote key sets (used by tests). */
  keys?: { session?: JWTVerifyGetKey; mcp?: JWTVerifyGetKey };
}

export type TokenVerifier = ReturnType<typeof createTokenVerifier>;

export function createTokenVerifier(options: TokenVerifierOptions) {
  const authkitIssuer = options.authkitDomain?.replace(/\/$/, '');
  const sessionKeys =
    options.keys?.session ??
    (options.workosClientId
      ? createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${options.workosClientId}`))
      : undefined);
  const mcpKeys =
    options.keys?.mcp ??
    (authkitIssuer ? createRemoteJWKSet(new URL(`${authkitIssuer}/oauth2/jwks`)) : undefined);
  const testKey = options.testSecret ? new TextEncoder().encode(options.testSecret) : undefined;

  async function verifyTestToken(token: string): Promise<JWTPayload> {
    if (!testKey) throw new InvalidTokenError('Test tokens are not accepted');
    const { payload } = await jwtVerify(token, testKey, {
      issuer: TEST_ISSUER,
      algorithms: ['HS256'],
    });
    return payload;
  }

  return {
    /** Tokens from the web app (or test tokens). */
    async verifySession(token: string): Promise<VerifiedToken> {
      return guard(async () => {
        if (issuerOf(token) === TEST_ISSUER) return toVerified(await verifyTestToken(token));
        const clientId = options.workosClientId;
        if (!sessionKeys || !clientId) {
          throw new InvalidTokenError('Web sign-in is not configured');
        }
        const fromAuthkitDomain = authkitIssuer !== undefined && issuerOf(token) === authkitIssuer;
        const keys = fromAuthkitDomain ? mcpKeys : sessionKeys;
        if (!keys) throw new InvalidTokenError('Web sign-in is not configured');
        const { payload } = await jwtVerify(token, keys, {
          issuer: [
            'https://api.workos.com',
            'https://api.workos.com/',
            `https://api.workos.com/user_management/${clientId}`,
            ...(authkitIssuer ? [authkitIssuer] : []),
          ],
        });
        // Only tokens for our own app: not another app's, and not an MCP client's (whose
        // audience is the MCP URL and whose client_id is the MCP client).
        const audience = typeof payload.aud === 'string' ? [payload.aud] : (payload.aud ?? []);
        if (payload['client_id'] !== clientId && !audience.includes(clientId)) {
          throw new InvalidTokenError('Token was issued for another application');
        }
        return toVerified(payload);
      });
    },

    /** Tokens that MCP clients (Claude) obtained from AuthKit for our MCP server. */
    async verifyMcp(token: string): Promise<VerifiedToken> {
      return guard(async () => {
        if (issuerOf(token) === TEST_ISSUER) return toVerified(await verifyTestToken(token));
        if (!mcpKeys || !authkitIssuer) {
          throw new InvalidTokenError('MCP sign-in is not configured');
        }
        const { payload } = await jwtVerify(token, mcpKeys, {
          issuer: authkitIssuer,
          audience: options.mcpResourceUrl,
        });
        // AuthKit signs agent tokens with the same issuer; only user tokens may act as a user.
        if (payload['sub_profile'] === 'ai_agent') {
          throw new InvalidTokenError('Agent tokens are not accepted');
        }
        return toVerified(payload);
      });
    },
  };
}

/** Signs a test token (local development and tests only; see TEST_ISSUER). */
export async function signTestToken(
  secret: string,
  userId: string,
  expiresIn: string | number = '1h',
): Promise<string> {
  return new SignJWT({ client_id: 'test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TEST_ISSUER)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

function issuerOf(token: string): string | undefined {
  try {
    return decodeJwt(token).iss;
  } catch {
    throw new InvalidTokenError('Malformed token');
  }
}

function toVerified(payload: JWTPayload): VerifiedToken {
  if (!payload.sub) throw new InvalidTokenError('Token has no subject');
  if (!payload.exp) throw new InvalidTokenError('Token has no expiry');
  const clientId = payload['client_id'];
  return {
    userId: payload.sub,
    expiresAt: payload.exp,
    clientId: typeof clientId === 'string' ? clientId : 'unknown',
  };
}

/** Normalises every verification failure (jose errors included) to InvalidTokenError. */
async function guard(verify: () => Promise<VerifiedToken>): Promise<VerifiedToken> {
  try {
    return await verify();
  } catch (error) {
    if (error instanceof InvalidTokenError) throw error;
    throw new InvalidTokenError(error instanceof Error ? error.message : 'Invalid token');
  }
}
