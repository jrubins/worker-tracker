import { ApiErrorSchema, LogResultSchema, LogoutResponseSchema, SessionSchema } from '@app/shared';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import type { WorkosSessions } from '../src/auth/workos-sessions.ts';
import { createTestApp, uniqueUserId } from './helpers.ts';

const WEB = 'http://localhost:5173';

/**
 * A stand-in for WorkOS: sign-in codes and sealed sessions are plain strings it recognises.
 * `sealed:<userId>` is a valid session; `expired:<userId>` needs (and gets) a refresh.
 */
const fakeWorkos: WorkosSessions = {
  authorizationUrl: (state) => `https://auth.example/authorize?state=${state}`,
  signIn: (code) =>
    Promise.resolve({
      sealedSession: `sealed:${code}`,
      user: { id: code, email: `${code}@example.com`, name: null },
    }),
  load(sealed) {
    const [kind, userId] = sealed.split(':');
    if (!userId) return Promise.resolve(null);
    const user = { id: userId, email: `${userId}@example.com`, name: null };
    if (kind === 'sealed') return Promise.resolve({ user });
    if (kind === 'expired') return Promise.resolve({ user, refreshedSession: `sealed:${userId}` });
    return Promise.resolve(null);
  },
  logoutUrl: () => Promise.resolve('https://auth.example/logout'),
};

const { app, db } = createTestApp({}, { workos: fakeWorkos });
const { app: devApp, db: devDb } = createTestApp();
afterAll(async () => {
  await db.close();
  await devDb.close();
});

/** The value of a cookie the response sets (undefined if not set; '' if cleared). */
function setCookie(res: request.Response, name: string): string | undefined {
  const header = res.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? header.map(String) : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match === undefined
    ? undefined
    : decodeURIComponent(match.split(';')[0]!.slice(name.length + 1));
}

/** Signs a browser in through the WorkOS flow; returns its Cookie header. */
async function signIn(userId: string): Promise<string> {
  const login = await request(app).get('/auth/login').expect(302);
  const state = new URL(String(login.headers['location'])).searchParams.get('state');
  const callback = await request(app)
    .get(`/auth/callback?code=${userId}&state=${state}`)
    .set('Cookie', `wt_auth_state=${state}`)
    .expect(302);
  expect(callback.headers['location']).toBe(WEB);
  return `wt_session=${setCookie(callback, 'wt_session')}`;
}

describe('web sign-in with WorkOS', () => {
  it('reports how to sign in when signed out', async () => {
    const res = await request(app).get('/auth/session').expect(200);
    expect(SessionSchema.parse(res.body)).toEqual({ user: null, signIn: 'workos' });
  });

  it('signs in through AuthKit and keeps the session in an HttpOnly cookie', async () => {
    const login = await request(app).get('/auth/login').expect(302);
    const state = new URL(String(login.headers['location'])).searchParams.get('state');
    expect(state).toBeTruthy();
    expect(setCookie(login, 'wt_auth_state')).toBe(state);

    const userId = uniqueUserId();
    const callback = await request(app)
      .get(`/auth/callback?code=${userId}&state=${state}`)
      .set('Cookie', `wt_auth_state=${state}`)
      .expect(302);
    const cookieHeader = (callback.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('wt_session='),
    );
    expect(cookieHeader).toMatch(/HttpOnly/);
    expect(cookieHeader).toMatch(/SameSite=Lax/);

    const session = await request(app)
      .get('/auth/session')
      .set('Cookie', `wt_session=${setCookie(callback, 'wt_session')}`)
      .expect(200);
    expect(SessionSchema.parse(session.body).user).toMatchObject({ id: userId });
  });

  it('refuses a callback whose state does not match the browser that started sign-in', async () => {
    const res = await request(app)
      .get('/auth/callback?code=someone&state=forged')
      .set('Cookie', 'wt_auth_state=the-real-state')
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('invalid_sign_in');
  });

  it('authenticates API requests with the cookie', async () => {
    const cookie = await signIn(uniqueUserId());
    await request(app).get('/workouts').set('Cookie', cookie).expect(200, []);
  });

  it('refreshes an expired session and stores the new cookie', async () => {
    const userId = uniqueUserId();
    const res = await request(app)
      .get('/workouts')
      .set('Cookie', `wt_session=expired:${userId}`)
      .expect(200);
    expect(setCookie(res, 'wt_session')).toBe(`sealed:${userId}`);
  });

  it('rejects an invalid session and clears its cookie', async () => {
    const res = await request(app).get('/workouts').set('Cookie', 'wt_session=garbage').expect(401);
    expect(setCookie(res, 'wt_session')).toBe('');
  });

  it('accepts writes from the web app but refuses cross-site ones', async () => {
    const cookie = await signIn(uniqueUserId());
    const workout = { date: '2026-11-20', exercises: [] };
    await request(app).post('/workouts').set('Cookie', cookie).send(workout).expect(403);
    await request(app)
      .post('/workouts')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
      .send(workout)
      .expect(403);
    const res = await request(app)
      .post('/workouts')
      .set('Cookie', cookie)
      .set('Origin', WEB)
      .send(workout)
      .expect(201);
    expect(LogResultSchema.parse(res.body).workout.date).toBe('2026-11-20');
  });

  it('signs out: clears the cookie and returns WorkOS sign-out URL', async () => {
    const cookie = await signIn(uniqueUserId());
    await request(app).post('/auth/logout').set('Cookie', cookie).expect(403);
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', WEB)
      .expect(200);
    expect(LogoutResponseSchema.parse(res.body).redirectUrl).toBe('https://auth.example/logout');
    expect(setCookie(res, 'wt_session')).toBe('');
  });

  it('applies ALLOWED_USER_IDS to cookie sessions', async () => {
    const allowed = uniqueUserId();
    const { app: lockedApp, db: lockedDb } = createTestApp(
      { ALLOWED_USER_IDS: allowed },
      { workos: fakeWorkos },
    );
    try {
      await request(lockedApp)
        .get('/workouts')
        .set('Cookie', `wt_session=sealed:${allowed}`)
        .expect(200);
      await request(lockedApp)
        .get('/workouts')
        .set('Cookie', `wt_session=sealed:${uniqueUserId()}`)
        .expect(403);
    } finally {
      await lockedDb.close();
    }
  });
});

describe('development sign-in', () => {
  it('offers dev sign-in when WorkOS is not configured', async () => {
    const res = await request(devApp).get('/auth/session').expect(200);
    expect(SessionSchema.parse(res.body)).toEqual({ user: null, signIn: 'dev' });
  });

  it('signs the browser in with a session cookie', async () => {
    const userId = uniqueUserId();
    const res = await request(devApp).post('/auth/dev-session').send({ userId }).expect(200);
    const cookie = `wt_dev_session=${setCookie(res, 'wt_dev_session')}`;
    const session = await request(devApp).get('/auth/session').set('Cookie', cookie).expect(200);
    expect(SessionSchema.parse(session.body).user).toEqual({
      id: userId,
      email: null,
      name: userId,
    });
    await request(devApp).get('/workouts').set('Cookie', cookie).expect(200, []);
  });

  it('has no WorkOS sign-in routes', async () => {
    await request(devApp).get('/auth/login').expect(404);
  });
});
