import { Router } from 'express';
import {
  CreateExerciseSchema,
  IdParamsSchema,
  MergeExercisesSchema,
  ProgressQuerySchema,
  UpdateExerciseSchema,
} from '@app/shared';
import { currentUserId } from '../../auth/middleware.ts';
import { validate } from '../../lib/validate.ts';
import type { StatsService } from '../stats/stats.service.ts';
import type { ExercisesService } from './exercises.service.ts';

export function exercisesRouter(exercises: ExercisesService, stats: StatsService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await exercises.list(currentUserId(req)));
  });

  router.post('/', async (req, res) => {
    res
      .status(201)
      .json(await exercises.create(currentUserId(req), validate(CreateExerciseSchema, req.body)));
  });

  /** Exercises created from unrecognized names, with likely matches. */
  router.get('/unconfirmed', async (req, res) => {
    res.json(await exercises.listUnconfirmed(currentUserId(req)));
  });

  router.post('/merge', async (req, res) => {
    const { fromExerciseId, intoExerciseId } = validate(MergeExercisesSchema, req.body);
    res.json(await exercises.merge(currentUserId(req), fromExerciseId, intoExerciseId));
  });

  /** Exercise page: details, last session, records and progress. */
  router.get('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    const { weeks } = validate(ProgressQuerySchema, req.query);
    res.json(await stats.exerciseDetail(currentUserId(req), id, weeks));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    res.json(
      await exercises.update(currentUserId(req), id, validate(UpdateExerciseSchema, req.body)),
    );
  });

  router.post('/:id/confirm', async (req, res) => {
    const { id } = validate(IdParamsSchema, req.params);
    res.json(await exercises.confirm(currentUserId(req), id));
  });

  return router;
}
