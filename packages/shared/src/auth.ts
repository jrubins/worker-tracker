import { z } from 'zod';

/**
 * POST /auth/dev-token: development and test sign-in without WorkOS. The API only offers it
 * when AUTH_TEST_SECRET is set, which it refuses in production.
 */
export const DevTokenRequestSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(/^[\w-]{1,64}$/, 'Letters, digits, "_" and "-" only')
    .default('dev-user'),
});
export type DevTokenRequest = z.input<typeof DevTokenRequestSchema>;

export const DevTokenResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
});
export type DevTokenResponse = z.infer<typeof DevTokenResponseSchema>;

/** The signed-in user, as the web app shows them. */
export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

/**
 * GET /auth/session: who is signed in (from the session cookie), and how to sign in otherwise:
 * 'workos' redirects to GET /auth/login; 'dev' posts a user ID to /auth/dev-session
 * (development and tests only); 'none' means the API has no sign-in configured.
 */
export const SessionSchema = z.object({
  user: SessionUserSchema.nullable(),
  signIn: z.enum(['workos', 'dev', 'none']),
});
export type Session = z.infer<typeof SessionSchema>;

/** POST /auth/logout: where to send the browser to finish signing out (WorkOS), if anywhere. */
export const LogoutResponseSchema = z.object({ redirectUrl: z.string().nullable() });
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
