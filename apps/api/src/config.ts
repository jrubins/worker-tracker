import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const commaList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url(),
    /** Comma-separated list of browser origins allowed to call the API. */
    CORS_ORIGINS: commaList,
    /** The user's time zone: "today", dates and Monday-start weeks are computed in it. */
    APP_TIMEZONE: z
      .string()
      .default('America/Chicago')
      .refine((timeZone) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone });
          return true;
        } catch {
          return false;
        }
      }, 'unknown IANA time zone, e.g. America/Chicago'),

    // --- Auth (WorkOS AuthKit) ---------------------------------------------------------
    /** WorkOS client ID (client_...): verifies the web app's session tokens. */
    WORKOS_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().startsWith('client_').optional()),
    /** AuthKit domain, e.g. https://your-app.authkit.app: issues MCP clients' tokens. */
    AUTHKIT_DOMAIN: z.preprocess(emptyToUndefined, z.url().optional()),
    /**
     * Public URL of the MCP endpoint. It is the audience of MCP tokens and must match a
     * Resource Indicator configured in the WorkOS dashboard.
     */
    MCP_RESOURCE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
    /** Optional comma-separated user IDs (user_...) allowed to use the API. Empty: anyone. */
    ALLOWED_USER_IDS: commaList,
    /**
     * Development and test only: lets the API accept locally signed test tokens and enables
     * POST /auth/dev-token. Refused in production.
     */
    AUTH_TEST_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),

    // --- Monitoring ------------------------------------------------------------------------
    SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    SENTRY_ENVIRONMENT: z.preprocess(emptyToUndefined, z.string().optional()),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

    /** Set automatically on Vercel. */
    VERCEL: z.preprocess(emptyToUndefined, z.string().optional()),
    /** Set automatically on Vercel; used as the Sentry release and reported by /health. */
    VERCEL_GIT_COMMIT_SHA: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((env, ctx) => {
    const deployed = env.NODE_ENV === 'production' || env.VERCEL !== undefined;
    if (!deployed) return;
    if (env.AUTH_TEST_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_TEST_SECRET'],
        message: 'must not be set in production (it allows signing in as any user)',
      });
    }
    for (const key of ['WORKOS_CLIENT_ID', 'AUTHKIT_DOMAIN', 'MCP_RESOURCE_URL'] as const) {
      if (!env[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'is required in production' });
      }
    }
  })
  .transform((env) => ({
    ...env,
    MCP_RESOURCE_URL: env.MCP_RESOURCE_URL ?? `http://localhost:${env.PORT}/mcp`,
  }));

export type Config = z.infer<typeof EnvSchema>;

/** Parses and validates environment variables. Throws a readable error listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
