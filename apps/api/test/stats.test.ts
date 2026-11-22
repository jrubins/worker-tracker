import {
  DashboardSchema,
  ExerciseDetailSchema,
  ExerciseSchema,
  PersonalRecordsSchema,
} from '@app/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { addDays, localDate, weekStart } from '../src/lib/training.ts';
import { createTestApp, newUser } from './helpers.ts';

const { app, db } = createTestApp();

afterAll(async () => {
  await db.close();
});

const today = localDate('America/Chicago');

const squat = (date: string, sets: { weightLb: number; reps: number; warmup?: boolean }[]) => ({
  date,
  exercises: [{ exercise: 'Squat', sets }],
});

describe('exercise stats', () => {
  it('reports last session, records and progress', async () => {
    const user = await newUser(app);
    const exercise = ExerciseSchema.parse((await user.post('/exercises', { name: 'Squat' })).body);
    await user
      .post(
        '/workouts',
        squat(addDays(today, -14), [
          { weightLb: 275, reps: 5 },
          { weightLb: 295, reps: 3 },
        ]),
      )
      .expect(201);
    await user
      .post(
        '/workouts',
        squat(addDays(today, -7), [
          { weightLb: 405, reps: 1, warmup: true }, // warm-ups never count
          { weightLb: 285, reps: 5 },
          { weightLb: 285, reps: 5 },
        ]),
      )
      .expect(201);

    const detail = ExerciseDetailSchema.parse(
      (await user.get(`/exercises/${exercise.id}`).expect(200)).body,
    );

    expect(detail.lastSession?.date).toBe(addDays(today, -7));
    expect(detail.lastSession?.sets.map((s) => s.weightLb)).toEqual([405, 285, 285]);
    // 285×5 → 332.5 beats 295×3 → 324.5
    expect(detail.records.bestE1rm).toMatchObject({ weightLb: 285, reps: 5, e1rmLb: 332.5 });
    expect(detail.records.heaviest).toMatchObject({ weightLb: 295, reps: 3 });
    expect(detail.records.repMaxes.map((r) => [r.reps, r.weightLb])).toEqual([
      [3, 295],
      [5, 285],
    ]);
    expect(detail.progress.points.map((p) => [p.topSetWeightLb, p.bestE1rmLb, p.volumeLb])).toEqual(
      [
        [295, 324.5, 275 * 5 + 295 * 3],
        [285, 332.5, 285 * 10],
      ],
    );
  });

  it('lists records for every exercise', async () => {
    const user = await newUser(app);
    await user.post('/workouts', squat(today, [{ weightLb: 315, reps: 2 }])).expect(201);
    const records = PersonalRecordsSchema.array().parse((await user.get('/stats/records')).body);
    expect(records.map((r) => [r.exerciseName, r.bestE1rm?.weightLb])).toEqual([['Squat', 315]]);
  });
});

describe('dashboard', () => {
  it('summarizes weeks, the streak and recent PRs', async () => {
    const user = await newUser(app);
    const thisWeek = weekStart(today);
    await user
      .post('/workouts', squat(addDays(thisWeek, -14), [{ weightLb: 225, reps: 5 }]))
      .expect(201);
    await user
      .post('/workouts', squat(addDays(thisWeek, -7), [{ weightLb: 235, reps: 5 }]))
      .expect(201);
    await user.post('/workouts', squat(thisWeek, [{ weightLb: 245, reps: 5 }])).expect(201);

    const dashboard = DashboardSchema.parse((await user.get('/stats/dashboard').expect(200)).body);

    expect(dashboard.today).toBe(today);
    expect(dashboard.weekly.weeks).toHaveLength(8);
    expect(dashboard.weekly.weeks.at(-1)).toMatchObject({
      weekStart: thisWeek,
      sessions: 1,
      workingSets: 1,
      volumeLb: 245 * 5,
    });
    expect(dashboard.weekly.streakWeeks).toBe(3);
    // Each session beat the last, so Squat's latest PR is this week's, with the previous best.
    expect(dashboard.recentPrs).toHaveLength(1);
    expect(dashboard.recentPrs[0]).toMatchObject({
      exerciseName: 'Squat',
      weightLb: 245,
      previousBestE1rmLb: 274.2,
    });
  });

  it('is empty for a new user', async () => {
    const user = await newUser(app);
    const dashboard = DashboardSchema.parse((await user.get('/stats/dashboard').expect(200)).body);
    expect(dashboard.weekly.streakWeeks).toBe(0);
    expect(dashboard.recentPrs).toEqual([]);
  });
});
