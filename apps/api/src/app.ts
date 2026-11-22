import * as Sentry from '@sentry/node';
import { waitUntil } from '@vercel/functions';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { Db } from '@app/db';
import { requireUser } from './auth/middleware.ts';
import { createTokenVerifier, type TokenVerifier } from './auth/tokens.ts';
import type { Config } from './config.ts';
import { devAuthRouter } from './features/auth/dev-auth.routes.ts';
import { healthRouter } from './features/health/health.routes.ts';
import { createHealthService } from './features/health/health.service.ts';
import { exercisesRouter } from './features/exercises/exercises.routes.ts';
import { createExercisesService } from './features/exercises/exercises.service.ts';
import { routinesRouter } from './features/routines/routines.routes.ts';
import { createRoutinesService } from './features/routines/routines.service.ts';
import { statsRouter } from './features/stats/stats.routes.ts';
import { createStatsService } from './features/stats/stats.service.ts';
import { setsRouter, workoutsRouter } from './features/workouts/workouts.routes.ts';
import { createWorkoutsService } from './features/workouts/workouts.service.ts';
import { mcpHandlers, mcpMetadataRouter } from './features/mcp/mcp.routes.ts';
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts';

export interface AppDeps {
  config: Config;
  db: Db;
  logger: Logger;
  /** Defaults to one built from config; tests may pass their own. */
  verifier?: TokenVerifier;
}

/**
 * Builds the Express app from its dependencies. This is the composition root: the only place
 * that creates services from the database and mounts their routers. No side effects, so tests
 * can create one freely.
 *
 * Every route requires a signed-in user except the public ones mounted before `requireUser`.
 */
export function createApp({ config, db, logger, verifier: injected }: AppDeps): Express {
  const app = express();
  const verifier =
    injected ??
    createTokenVerifier({
      workosClientId: config.WORKOS_CLIENT_ID,
      authkitDomain: config.AUTHKIT_DOMAIN,
      mcpResourceUrl: config.MCP_RESOURCE_URL,
      testSecret: config.AUTH_TEST_SECRET,
    });
  const timeZone = config.APP_TIMEZONE;
  const exercises = createExercisesService(db);
  const routines = createRoutinesService(db, exercises);
  const workouts = createWorkoutsService(db, { exercises, routines, timeZone });
  const stats = createStatsService(db, { exercises, timeZone });
  const services = { exercises, routines, workouts, stats };

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // On Vercel, keep the function alive until Sentry has sent this request's events.
  if (config.VERCEL && config.SENTRY_DSN) {
    app.use((req, res, next) => {
      res.on('finish', () => waitUntil(Sentry.flush(2000)));
      next();
    });
  }

  // --- Public ------------------------------------------------------------------------------
  app.use('/health', healthRouter(createHealthService(db, config.VERCEL_GIT_COMMIT_SHA ?? 'dev')));
  if (config.AUTHKIT_DOMAIN) {
    app.use(mcpMetadataRouter(config.MCP_RESOURCE_URL, config.AUTHKIT_DOMAIN));
  }
  if (config.AUTH_TEST_SECRET) {
    app.use('/auth', devAuthRouter(config.AUTH_TEST_SECRET));
  }

  // --- MCP (its own OAuth bearer auth) --------------------------------------------------
  app.post(
    '/mcp',
    ...mcpHandlers({
      verifier,
      services,
      allowedUserIds: config.ALLOWED_USER_IDS,
      resourceUrl: config.MCP_RESOURCE_URL,
    }),
  );
  // Stateless server: no server-initiated stream (GET) or session to end (DELETE).
  app.all('/mcp', (req, res) => {
    res
      .set('Allow', 'POST')
      .status(405)
      .json({
        error: { code: 'method_not_allowed', message: 'Use POST for MCP requests' },
      });
  });

  // --- Everything below requires a signed-in user -----------------------------------------
  app.use(requireUser(verifier, config.ALLOWED_USER_IDS));
  app.use('/exercises', exercisesRouter(exercises, stats));
  app.use('/workouts', workoutsRouter(workouts));
  app.use('/sets', setsRouter(workouts));
  app.use('/routines', routinesRouter(routines));
  app.use('/stats', statsRouter(stats));

  app.use(notFoundHandler);
  // Reports 5xx errors to Sentry (no-op while Sentry is disabled), then our JSON error handler.
  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
