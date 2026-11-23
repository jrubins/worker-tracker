import { ApiErrorSchema, DevTokenResponseSchema } from '@app/shared';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTokenVerifier, InvalidTokenError, type TokenVerifier } from '../src/auth/tokens.ts';
import { loadConfig } from '../src/config.ts';
import { bearer, createTestApp, uniqueUserId } from './helpers.ts';

// Tokens shaped like WorkOS's (see the docs linked in src/auth/tokens.ts), signed with a local
// key pair so the real verification path runs without calling WorkOS.
const CLIENT_ID = 'client_test123';
const AUTHKIT = 'https://example.authkit.app';
const MCP_URL = 'https://api.example.com/mcp';

let sign: (claims: JWTPayload) => Promise<string>;
let verifier: TokenVerifier;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: 'RS256' }] });
  sign = (claims) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  verifier = createTokenVerifier({
    workosClientId: CLIENT_ID,
    authkitDomain: AUTHKIT,
    mcpResourceUrl: MCP_URL,
    keys: { session: jwks, mcp: jwks },
  });
});

describe('web session tokens', () => {
  const session = { iss: 'https://api.workos.com', sub: 'user_1', client_id: CLIENT_ID };

  it('accepts a WorkOS session token for our client', async () => {
    await expect(verifier.verifySession(await sign(session))).resolves.toMatchObject({
      userId: 'user_1',
      clientId: CLIENT_ID,
    });
  });

  it.each([
    ['the user-management issuer', `https://api.workos.com/user_management/${CLIENT_ID}`],
    ['the AuthKit domain', AUTHKIT],
  ])('accepts a session token from %s', async (_label, iss) => {
    await expect(verifier.verifySession(await sign({ ...session, iss }))).resolves.toMatchObject({
      userId: 'user_1',
    });
  });

  it('accepts our client ID as the audience instead of client_id', async () => {
    const token = await sign({ iss: AUTHKIT, sub: 'user_1', aud: CLIENT_ID });
    await expect(verifier.verifySession(token)).resolves.toMatchObject({ userId: 'user_1' });
  });

  it("rejects an MCP client's token", async () => {
    const token = await sign({ iss: AUTHKIT, sub: 'user_1', aud: MCP_URL, client_id: 'claude' });
    await expect(verifier.verifySession(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects another application's token", async () => {
    const token = await sign({ ...session, client_id: 'client_other' });
    await expect(verifier.verifySession(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it.each([
    ['an unknown issuer', 'https://evil.example'],
    ["another app's user-management issuer", 'https://api.workos.com/user_management/client_other'],
  ])('rejects %s', async (_label, iss) => {
    const token = await sign({ ...session, iss });
    await expect(verifier.verifySession(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects garbage', async () => {
    await expect(verifier.verifySession('not-a-jwt')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects test tokens when no test secret is configured', async () => {
    const token = (await bearer('user_1')).slice('Bearer '.length);
    await expect(verifier.verifySession(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

describe('MCP tokens', () => {
  const mcp = { iss: AUTHKIT, sub: 'user_1', aud: MCP_URL, client_id: 'https://claude.ai/x' };

  it('accepts an AuthKit token issued for our MCP server', async () => {
    await expect(verifier.verifyMcp(await sign(mcp))).resolves.toMatchObject({ userId: 'user_1' });
  });

  it('rejects a token for another resource', async () => {
    const token = await sign({ ...mcp, aud: 'https://other.example/mcp' });
    await expect(verifier.verifyMcp(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects AI agent tokens', async () => {
    const token = await sign({ ...mcp, sub_profile: 'ai_agent' });
    await expect(verifier.verifyMcp(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('does not accept web session tokens', async () => {
    const token = await sign({
      iss: 'https://api.workos.com',
      sub: 'user_1',
      client_id: CLIENT_ID,
    });
    await expect(verifier.verifyMcp(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

describe('API sign-in rules', () => {
  const allowed = uniqueUserId();
  const { app, db } = createTestApp({ ALLOWED_USER_IDS: allowed });

  afterAll(async () => {
    await db.close();
  });

  it('lets allowlisted users in', async () => {
    await request(app)
      .get('/workouts')
      .set('Authorization', await bearer(allowed))
      .expect(200);
  });

  it('forbids users outside ALLOWED_USER_IDS', async () => {
    const res = await request(app)
      .get('/workouts')
      .set('Authorization', await bearer(uniqueUserId()))
      .expect(403);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('forbidden');
  });

  it('rejects an invalid token with a WWW-Authenticate challenge', async () => {
    const res = await request(app).get('/workouts').set('Authorization', 'Bearer nope').expect(401);
    expect(res.headers['www-authenticate']).toContain('invalid_token');
  });

  it('issues dev tokens that the API accepts', async () => {
    const userId = uniqueUserId();
    const res = await request(app).post('/auth/dev-token').send({ userId }).expect(200);
    const { token } = DevTokenResponseSchema.parse(res.body);
    // Not allowlisted, so 403 proves the token itself was accepted as this user.
    await request(app).get('/workouts').set('Authorization', `Bearer ${token}`).expect(403);
  });
});

describe('dev sign-in availability', () => {
  const { app, db } = createTestApp({ AUTH_TEST_SECRET: '' });

  afterAll(async () => {
    await db.close();
  });

  it('is not offered without AUTH_TEST_SECRET', async () => {
    await request(app).post('/auth/dev-token').send({}).expect(401);
  });
});

describe('production configuration', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
    WORKOS_CLIENT_ID: CLIENT_ID,
    WORKOS_API_KEY: 'sk_test_example',
    WORKOS_COOKIE_PASSWORD: 'c'.repeat(32),
    WEB_URL: 'https://app.example.com',
    AUTHKIT_DOMAIN: AUTHKIT,
    MCP_RESOURCE_URL: MCP_URL,
  };

  it('is valid with WorkOS settings', () => {
    expect(() => loadConfig(production)).not.toThrow();
  });

  it('refuses the test secret', () => {
    expect(() => loadConfig({ ...production, AUTH_TEST_SECRET: 'x'.repeat(40) })).toThrow(
      /AUTH_TEST_SECRET/,
    );
  });

  it.each(['AUTHKIT_DOMAIN', 'WORKOS_API_KEY', 'WORKOS_COOKIE_PASSWORD', 'WEB_URL'])(
    'requires %s',
    (key) => {
      expect(() => loadConfig({ ...production, [key]: '' })).toThrow(new RegExp(key));
    },
  );

  it('refuses a short cookie password', () => {
    expect(() => loadConfig({ ...production, WORKOS_COOKIE_PASSWORD: 'short' })).toThrow(
      /WORKOS_COOKIE_PASSWORD/,
    );
  });
});
