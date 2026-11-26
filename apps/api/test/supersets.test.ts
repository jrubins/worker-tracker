import {
  ApiErrorSchema,
  LogResultSchema,
  RoutineHistorySchema,
  SaveRoutineResultSchema,
  WorkoutSchema,
  type Workout,
} from '@app/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, newUser } from './helpers.ts';

const { app, db } = createTestApp();

afterAll(async () => {
  await db.close();
});

type User = Awaited<ReturnType<typeof newUser>>;

const log = async (user: User, body: object) =>
  LogResultSchema.parse((await user.post('/workouts', body).expect(201)).body).workout;

const addSets = async (user: User, workoutId: number, exercises: object[]) =>
  LogResultSchema.parse(
    (await user.post(`/workouts/${workoutId}/sets`, { exercises }).expect(201)).body,
  ).workout;

/** [exercise, superset] for each set, in order. */
const labels = (workout: Workout) => workout.sets.map((s) => [s.exerciseName, s.superset]);

describe('supersets in workouts', () => {
  it('label every set of the exercises logged together', async () => {
    const user = await newUser(app);
    const workout = await log(user, {
      exercises: [
        { exercise: 'Bench Press', superset: 'a', sets: [{ weightLb: 185, reps: 8 }] },
        { exercise: 'Barbell Row', superset: 'A', sets: [{ weightLb: 135, reps: 10 }] },
        { exercise: 'Lateral Raise', sets: [{ weightLb: 20, reps: 15 }] },
      ],
    });
    // Lowercase is accepted and stored as "A".
    expect(labels(workout)).toEqual([
      ['Bench Press', 'A'],
      ['Barbell Row', 'A'],
      ['Lateral Raise', null],
    ]);

    const res = await user
      .post('/workouts', { exercises: [{ exercise: 'Dip', superset: 'A1', sets: [{ reps: 8 }] }] })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('validation_error');
  });

  it('stick to the exercise while logging live, round by round', async () => {
    const user = await newUser(app);
    const { id } = await log(user, {});
    await addSets(user, id, [
      { exercise: 'Bench Press', sets: [{ weightLb: 185, reps: 8 }] },
      { exercise: 'Barbell Row', superset: 'A', sets: [{ weightLb: 135, reps: 10 }] },
    ]);
    // Labeling bench now also labels its earlier set; later rounds keep the label.
    await addSets(user, id, [
      { exercise: 'Bench Press', superset: 'A', sets: [{ weightLb: 185, reps: 8 }] },
      { exercise: 'Barbell Row', sets: [{ weightLb: 135, reps: 9 }] },
    ]);
    const workout = await addSets(user, id, [
      { exercise: 'Bench Press', sets: [{ weightLb: 185, reps: 7 }] },
    ]);
    expect(labels(workout)).toEqual([
      ['Bench Press', 'A'],
      ['Barbell Row', 'A'],
      ['Bench Press', 'A'],
      ['Barbell Row', 'A'],
      ['Bench Press', 'A'],
    ]);
  });

  it('can be marked and cleared after the fact', async () => {
    const user = await newUser(app);
    const workout = await log(user, {
      exercises: [
        {
          exercise: 'Curl',
          sets: [
            { weightLb: 30, reps: 10 },
            { weightLb: 30, reps: 9 },
          ],
        },
        { exercise: 'Triceps Pushdown', sets: [{ weightLb: 50, reps: 12 }] },
      ],
    });
    const [curl, pushdown] = [workout.sets[0]?.exerciseId, workout.sets[2]?.exerciseId];

    const marked = WorkoutSchema.parse(
      (
        await user
          .patch(`/workouts/${workout.id}`, {
            notes: 'Arms superset',
            supersets: [
              { exerciseId: curl, superset: 'b' },
              { exerciseId: pushdown, superset: 'B' },
            ],
          })
          .expect(200)
      ).body,
    );
    expect(marked.notes).toBe('Arms superset');
    expect(labels(marked)).toEqual([
      ['Curl', 'B'],
      ['Curl', 'B'],
      ['Triceps Pushdown', 'B'],
    ]);

    const cleared = WorkoutSchema.parse(
      (
        await user
          .patch(`/workouts/${workout.id}`, {
            supersets: [{ exerciseId: pushdown, superset: null }],
          })
          .expect(200)
      ).body,
    );
    expect(cleared.sets.map((s) => s.superset)).toEqual(['B', 'B', null]);

    // An exercise that isn't in the workout is an error, and nothing changes.
    const other = await log(user, { exercises: [{ exercise: 'Squat', sets: [{ reps: 5 }] }] });
    const res = await user
      .patch(`/workouts/${workout.id}`, {
        supersets: [
          { exerciseId: curl, superset: null },
          { exerciseId: other.sets[0]?.exerciseId, superset: 'C' },
        ],
      })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('validation_error');
    const after = WorkoutSchema.parse((await user.get(`/workouts/${workout.id}`).expect(200)).body);
    expect(after.sets.map((s) => s.superset)).toEqual(['B', 'B', null]);

    // Another user's workout is not found.
    const stranger = await newUser(app);
    await stranger
      .patch(`/workouts/${workout.id}`, { supersets: [{ exerciseId: curl, superset: 'A' }] })
      .expect(404);
  });
});

describe('supersets in routines', () => {
  it('are part of the plan: a changed pairing is a new version', async () => {
    const user = await newUser(app);
    const plan = (supersets: [string | undefined, string | undefined]) => ({
      name: 'Upper A',
      exercises: [
        { exercise: 'Bench Press', targetSets: 3, targetReps: '8', superset: supersets[0] },
        { exercise: 'Barbell Row', targetSets: 3, targetReps: '10', superset: supersets[1] },
        { exercise: 'Lateral Raise', targetSets: 3, targetReps: '15' },
      ],
    });
    const created = SaveRoutineResultSchema.parse(
      (await user.post('/routines', plan(['A', 'A'])).expect(200)).body,
    );
    expect(created.routine.current.exercises.map((e) => e.superset)).toEqual(['A', 'A', null]);

    const same = SaveRoutineResultSchema.parse(
      (await user.post('/routines', plan(['a', 'A'])).expect(200)).body,
    );
    expect(same.changed).toBe(false);

    const unpaired = SaveRoutineResultSchema.parse(
      (
        await user
          .post('/routines', { ...plan([undefined, undefined]), changeNote: 'Straight sets' })
          .expect(200)
      ).body,
    );
    expect(unpaired.changed).toBe(true);
    const history = RoutineHistorySchema.parse(
      (await user.get(`/routines/${created.routine.id}`).expect(200)).body,
    );
    expect(history.versions.map((v) => v.exercises.map((e) => e.superset))).toEqual([
      [null, null, null],
      ['A', 'A', null],
    ]);
  });
});
