const rate = (value: string | undefined, fallback: number) => {
  const parsed = value === undefined || value === '' ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

/** Browser configuration from VITE_* variables (baked in at build time). */
export const env = {
  /**
   * Where the browser calls the API. /api on the web app's own origin (a Vercel rewrite in
   * production, Vite's proxy in development) keeps the session cookie first-party.
   */
  apiUrl: (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''),
  sentry: {
    dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    tracesSampleRate: rate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    replaySessionSampleRate: rate(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE, 0),
    replayOnErrorSampleRate: rate(import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1),
  },
};
