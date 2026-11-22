import { Router } from 'express';
import { WeeklyQuerySchema } from '@app/shared';
import { currentUserId } from '../../auth/middleware.ts';
import { validate } from '../../lib/validate.ts';
import type { StatsService } from './stats.service.ts';

export function statsRouter(stats: StatsService): Router {
  const router = Router();

  router.get('/dashboard', async (req, res) => {
    res.json(await stats.dashboard(currentUserId(req)));
  });

  router.get('/weekly', async (req, res) => {
    const { weeks } = validate(WeeklyQuerySchema, req.query);
    res.json(await stats.weekly(currentUserId(req), weeks));
  });

  router.get('/records', async (req, res) => {
    res.json(await stats.allRecords(currentUserId(req)));
  });

  return router;
}
