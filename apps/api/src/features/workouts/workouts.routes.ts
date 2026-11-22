import { Router } from 'express';
import {
  ExerciseSetsInputSchema,
  IdParamsSchema,
  ListWorkoutsQuerySchema,
  LogWorkoutSchema,
  UpdateSetSchema,
} from '@app/shared';
import { z } from 'zod';
import { currentUserId } from '../../auth/middleware.ts';
import { validate } from '../../lib/validate.ts';
import type { WorkoutsService } from './workouts.service.ts';

/** Workouts: the same operations Claude has as MCP tools (see features/mcp). */
export function workoutsRouter(workouts: WorkoutsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { limit } = validate(ListWorkoutsQuerySchema, req.query);
    res.json(await workouts.list(currentUserId(req), limit));
  });

  router.post('/', async (req, res) => {
    res
      .status(201)
      .json(await workouts.log(currentUserId(req), validate(LogWorkoutSchema, req.body)));
  });

  router.get('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    res.json(await workouts.get(currentUserId(req), id));
  });

  router.post('/:id/sets', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    const { exercises } = validate(
      z.object({ exercises: z.array(ExerciseSetsInputSchema).min(1) }),
      req.body,
    );
    res.status(201).json(await workouts.addSets(currentUserId(req), { workoutId: id, exercises }));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    await workouts.deleteWorkout(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}

export function setsRouter(workouts: WorkoutsService): Router {
  const router = Router();

  router.patch('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    res.json(await workouts.updateSet(currentUserId(req), id, validate(UpdateSetSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    await workouts.deleteSet(currentUserId(req), id);
    res.status(204).end();
  });

  return router;
}
