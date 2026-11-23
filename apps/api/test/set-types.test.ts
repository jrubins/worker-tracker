import {
  ApiErrorSchema,
  ExerciseDetailSchema,
  ExerciseSchema,
  LogResultSchema,
  WorkoutSchema,
  WorkoutSetSchema,
  WorkoutSummarySchema,
} from '@app/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, newUser } from './helpers.ts';

const { app, db } = createTestApp();

afterAll(async () => {
  await db.close();
});

type User = Awaited<ReturnType<typeof newUser>>;

const createExercise = async (user: User, body: object) =>
  ExerciseSchema.parse((await user.post('/exercises', body).expect(201)).body);

const log = async (user: User, body: object) =>
  LogResultSchema.parse((await user.post('/workouts', body).expect(201)).body).workout;

const records = async (user: User, exerciseId: number) =>
  ExerciseDetailSchema.parse((await user.get(`/exercises/${exerciseId}`).expect(200)).body).records;

describe('drop sets', () => {
  it('add volume but are not sets of their own and never set records', async () => {
    const user = await newUser(app);
    const curl = await createExercise(user, { name: 'Cable Curl', equipment: 'cable' });
    const workout = await log(user, {
      date: '2026-11-10',
      exercises: [
        {
          exercise: 'Cable Curl',
          sets: [
            { weightLb: 40, reps: 12 },
            { weightLb: 40, reps: 12 },
            { weightLb: 40, reps: 9 },
            { weightLb: 20, reps: 3, setType: 'drop' },
            { weightLb: 10, reps: 30, setType: 'drop' }, // would be a big "record" if counted
          ],
        },
      ],
    });
    expect(workout.sets.map((s) => s.setType)).toEqual([
      'working',
      'working',
      'working',
      'drop',
      'drop',
    ]);
    expect(workout.sets[3]?.e1rmLb).toBeNull();

    const [summary] = (await user.get('/workouts').expect(200)).body as unknown[];
    const parsed = WorkoutSummarySchema.parse(summary);
    expect(parsed.workingSets).toBe(3); // 12, 12, 9+3+30
    expect(parsed.volumeLb).toBe(40 * 33 + 20 * 3 + 10 * 30);

    const best = await records(user, curl.id);
    expect(best.mostReps?.reps).toBe(12);
    expect(best.repMaxes.map((r) => r.reps)).toEqual([9, 12]);
  });
});

describe('timed sets', () => {
  it('log a duration without reps, and report the longest hold', async () => {
    const user = await newUser(app);
    const plank = await createExercise(user, { name: 'Plank', equipment: 'bodyweight' });
    const workout = await log(user, {
      date: '2026-11-11',
      exercises: [
        { exercise: 'Plank', sets: [{ durationSeconds: 60 }, { durationSeconds: 90 }] },
        { exercise: 'Core Video', sets: [{ durationSeconds: 300 }] },
      ],
    });
    expect(workout.sets.map((s) => [s.reps, s.durationSeconds, s.volumeLb, s.e1rmLb])).toEqual([
      [null, 60, 0, null],
      [null, 90, 0, null],
      [null, 300, 0, null],
    ]);
    expect((await records(user, plank.id)).longestHold).toMatchObject({
      durationSeconds: 90,
      date: '2026-11-11',
    });
  });

  it('need reps or a duration', async () => {
    const user = await newUser(app);
    const res = await user
      .post('/workouts', { exercises: [{ exercise: 'Plank', sets: [{ weightLb: 25 }] }] })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('validation_error');

    const workout = await log(user, {
      exercises: [{ exercise: 'Plank', sets: [{ durationSeconds: 45 }] }],
    });
    const setId = workout.sets[0]?.id;
    await user.patch(`/sets/${setId}`, { durationSeconds: null }).expect(400);
    const fixed = WorkoutSetSchema.parse(
      (await user.patch(`/sets/${setId}`, { reps: 1, durationSeconds: null }).expect(200)).body,
    );
    expect([fixed.reps, fixed.durationSeconds]).toEqual([1, null]);
  });
});

describe('load types', () => {
  it('default from equipment and count both hands for per_hand volume', async () => {
    const user = await newUser(app);
    const press = await createExercise(user, { name: 'DB Press', equipment: 'dumbbell' });
    const goblet = await createExercise(user, {
      name: 'Goblet Squat',
      equipment: 'dumbbell',
      loadType: 'total',
    });
    const dips = await createExercise(user, { name: 'Dips', equipment: 'bodyweight' });
    expect([press.loadType, goblet.loadType, dips.loadType]).toEqual([
      'per_hand',
      'total',
      'bodyweight_plus',
    ]);

    const workout = await log(user, {
      exercises: [
        { exercise: 'DB Press', sets: [{ weightLb: 50, reps: 10 }] },
        { exercise: 'Goblet Squat', sets: [{ weightLb: 50, reps: 10 }] },
      ],
    });
    expect(workout.sets.map((s) => [s.loadType, s.volumeLb, s.e1rmLb])).toEqual([
      ['per_hand', 1000, 66.7], // estimate stays per dumbbell
      ['total', 500, 66.7],
    ]);
  });

  it('estimate weighted bodyweight lifts from bodyweight plus added load', async () => {
    const user = await newUser(app);
    const pullUp = await createExercise(user, {
      name: 'Pull-up',
      equipment: 'bodyweight',
    });
    const sets = { exercise: 'Pull-up', sets: [{ reps: 10 }, { weightLb: 10, reps: 6 }] };

    // No bodyweight yet: records are best reps at +X, with no estimate.
    const before = await log(user, { date: '2026-10-01', exercises: [sets] });
    expect(before.sets.map((s) => s.e1rmLb)).toEqual([null, null]);
    let best = await records(user, pullUp.id);
    expect(best.bestE1rm).toBeNull();
    expect(best.heaviest).toMatchObject({ weightLb: 10, reps: 6, e1rmLb: null });
    expect(best.mostReps).toMatchObject({ weightLb: null, reps: 10 });

    // A later weigh-in also applies to the earlier session (the nearest logged bodyweight).
    await log(user, { date: '2026-11-01', bodyweightLb: 180, exercises: [] });
    const after = WorkoutSchema.parse((await user.get(`/workouts/${before.id}`).expect(200)).body);
    expect(after.bodyweightLb).toBeNull();
    expect(after.sets.map((s) => [s.loadLb, s.e1rmLb])).toEqual([
      [180, 240],
      [190, 228],
    ]);
    best = await records(user, pullUp.id);
    expect(best.bestE1rm).toMatchObject({ reps: 10, e1rmLb: 240 });

    // Bodyweight can be corrected on the session itself.
    const updated = WorkoutSchema.parse(
      (await user.patch(`/workouts/${before.id}`, { bodyweightLb: 170 }).expect(200)).body,
    );
    expect(updated.bodyweightLb).toBe(170);
    expect(updated.sets[1]?.loadLb).toBe(180);
  });
});

describe('exercise links', () => {
  it('are saved, replaced and kept when merging', async () => {
    const user = await newUser(app);
    const video = { url: 'https://www.youtube.com/watch?v=abc', label: 'Form video' };
    const kept = await createExercise(user, { name: 'Romanian Deadlift', links: [video] });
    expect(kept.links).toEqual([video]);

    await user
      .patch(`/exercises/${kept.id}`, { links: [{ url: 'javascript:alert(1)' }] })
      .expect(400);
    const article = { url: 'https://example.com/rdl', label: null };
    const replaced = ExerciseSchema.parse(
      (
        await user
          .patch(`/exercises/${kept.id}`, { links: [video, { url: article.url }] })
          .expect(200)
      ).body,
    );
    expect(replaced.links).toEqual([video, article]);

    const other = await createExercise(user, {
      name: 'RDL Variation',
      links: [{ url: 'https://example.com/other' }, { url: article.url }],
    });
    const merged = ExerciseSchema.parse(
      (
        await user
          .post('/exercises/merge', { fromExerciseId: other.id, intoExerciseId: kept.id })
          .expect(200)
      ).body,
    );
    expect(merged.links.map((l) => l.url)).toEqual([
      video.url,
      article.url,
      'https://example.com/other',
    ]);
  });
});
