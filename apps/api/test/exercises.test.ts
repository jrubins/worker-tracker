import {
  ExerciseDetailSchema,
  ExerciseSchema,
  LogResultSchema,
  NewExerciseNoticeSchema,
} from '@app/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, newUser } from './helpers.ts';

const { app, db } = createTestApp();

afterAll(async () => {
  await db.close();
});

const logSets = (exercise: string, weightLb = 60) => ({
  date: '2026-11-20',
  exercises: [{ exercise, sets: [{ weightLb, reps: 10 }] }],
});

describe('exercise names', () => {
  it('resolves names and aliases however they are typed', async () => {
    const user = await newUser(app);
    await user.post('/exercises', { name: 'Dumbbell Row', aliases: ['One-Arm Row'] }).expect(201);

    for (const typed of ['DB rows', 'dumbbell-row', 'Row, Dumbbell', 'one arm rows']) {
      const { workout, newExercises } = LogResultSchema.parse(
        (await user.post('/workouts', logSets(typed)).expect(201)).body,
      );
      expect(workout.sets[0]?.exerciseName).toBe('Dumbbell Row');
      expect(newExercises).toEqual([]);
    }
  });

  it('logs unrecognized names under a new unconfirmed exercise, suggesting similar ones', async () => {
    const user = await newUser(app);
    await user.post('/exercises', { name: 'Incline Dumbbell Press' }).expect(201);

    const { newExercises } = LogResultSchema.parse(
      (await user.post('/workouts', logSets('Incline DB Bench')).expect(201)).body,
    );

    expect(newExercises).toHaveLength(1);
    expect(newExercises[0]?.exercise).toMatchObject({ name: 'Incline DB Bench', confirmed: false });
    expect(newExercises[0]?.similar.map((s) => s.exercise.name)).toEqual([
      'Incline Dumbbell Press',
    ]);
  });

  it('merges a new exercise into the one that was meant, so the name is known next time', async () => {
    const user = await newUser(app);
    const target = ExerciseSchema.parse(
      (await user.post('/exercises', { name: 'Romanian Deadlift' }).expect(201)).body,
    );
    const logged = LogResultSchema.parse(
      (await user.post('/workouts', logSets('Stiff Deadlift', 185)).expect(201)).body,
    );
    const review = NewExerciseNoticeSchema.array().parse(
      (await user.get('/exercises/unconfirmed').expect(200)).body,
    );
    const fromId = review[0]?.exercise.id;
    expect(review.map((r) => r.exercise.name)).toEqual(['Stiff Deadlift']);

    const merged = ExerciseSchema.parse(
      (
        await user
          .post('/exercises/merge', { fromExerciseId: fromId, intoExerciseId: target.id })
          .expect(200)
      ).body,
    );
    expect(merged.aliases).toContain('Stiff Deadlift');

    // The logged set moved over, the review is empty, and the old name now resolves.
    const detail = ExerciseDetailSchema.parse((await user.get(`/exercises/${target.id}`)).body);
    expect(detail.lastSession?.workoutId).toBe(logged.workout.id);
    expect((await user.get('/exercises/unconfirmed')).body).toEqual([]);
    const again = LogResultSchema.parse(
      (await user.post('/workouts', logSets('stiff deadlift'))).body,
    );
    expect(again.workout.sets[0]?.exerciseName).toBe('Romanian Deadlift');
  });

  it('confirms a genuinely new exercise', async () => {
    const user = await newUser(app);
    const { newExercises } = LogResultSchema.parse(
      (await user.post('/workouts', logSets('Landmine Press')).expect(201)).body,
    );
    const id = newExercises[0]?.exercise.id;

    const confirmed = ExerciseSchema.parse(
      (await user.post(`/exercises/${id}/confirm`).expect(200)).body,
    );
    expect(confirmed.confirmed).toBe(true);
    expect((await user.get('/exercises/unconfirmed')).body).toEqual([]);
  });

  it('refuses a duplicate name or alias', async () => {
    const user = await newUser(app);
    await user
      .post('/exercises', { name: 'Overhead Press', aliases: ['Military Press'] })
      .expect(201);
    await user.post('/exercises', { name: 'OHP' }).expect(409);
    await user.post('/exercises', { name: 'military presses' }).expect(409);
  });
});
