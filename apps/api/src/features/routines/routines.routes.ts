import { Router } from 'express';
import { IdParamsSchema, SaveRoutineSchema } from '@app/shared';
import { currentUserId } from '../../auth/middleware.ts';
import { validate } from '../../lib/validate.ts';
import type { RoutinesService } from './routines.service.ts';

/** Routines: the same operations Claude has as MCP tools (see features/mcp). */
export function routinesRouter(routines: RoutinesService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await routines.list(currentUserId(req)));
  });

  /** Creates a routine, or saves a changed plan as a new version. */
  router.post('/', async (req, res) => {
    res.json(await routines.save(currentUserId(req), validate(SaveRoutineSchema, req.body)));
  });

  router.post('/:id/archive', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    await routines.archive(currentUserId(req), id);
    res.status(204).end();
  });

  /** A routine with its full version history. */
  router.get('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    res.json(await routines.history(currentUserId(req), id));
  });

  return router;
}
