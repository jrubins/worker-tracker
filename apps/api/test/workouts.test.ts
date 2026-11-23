import {
  ApiErrorSchema,
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

const session = {
  date: '2026-11-20',
  notes: 'Felt strong',
  exercises: [
    {
      exercise: 'Bench Press',
      sets: [
        { weightLb: 135, reps: 10, warmup: true },
        { weightLb: 225, reps: 5, rpe: 8 },
        { weightLb: 225, reps: 5, rir: 1 },
      ],
    },
    { exercise: 'Pull-ups', sets: [{ reps: 10 }, { weightLb: 25, reps: 6, rpe: 9 }] },
  ],
};

describe('logging a workout', () => {
  it('records every set, converting RIR to RPE and estimating 1RM', async () => {
    const user = await newUser(app);
    const res = await user.post('/workouts', session).expect(201);
    const { workout, newExercises } = LogResultSchema.parse(res.body);

    expect(workout.date).toBe('2026-11-20');
    expect(workout.notes).toBe('Felt strong');
    expect(workout.sets.map((s) => [s.exerciseName, s.weightLb, s.reps, s.rpe, s.setType])).toEqual(
      [
        ['Bench Press', 135, 10, null, 'warmup'], // warmup: true is shorthand
        ['Bench Press', 225, 5, 8, 'working'],
        ['Bench Press', 225, 5, 9, 'working'], // RIR 1 → RPE 9
        ['Pull-ups', null, 10, null, 'working'],
        ['Pull-ups', 25, 6, 9, 'working'],
      ],
    );
    expect(workout.sets[1]?.e1rmLb).toBe(262.5);
    expect(workout.sets[0]?.e1rmLb).toBeNull(); // warm-ups don't count
    // A new user knows no exercises yet: both were created, unconfirmed.
    expect(newExercises.map((n) => [n.exercise.name, n.exercise.confirmed])).toEqual([
      ['Bench Press', false],
      ['Pull-ups', false],
    ]);
  });

  it('defaults the date to today in the app time zone', async () => {
    const user = await newUser(app);
    const res = await user.post('/workouts', { exercises: [] }).expect(201);
    const { workout } = LogResultSchema.parse(res.body);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(
      new Date(),
    );
    expect(workout.date).toBe(today);
  });

  it('adds sets to a workout in progress, after the existing ones', async () => {
    const user = await newUser(app);
    const started = LogResultSchema.parse((await user.post('/workouts', { exercises: [] })).body);
    const id = started.workout.id;

    await user
      .post(`/workouts/${id}/sets`, {
        exercises: [{ exercise: 'Squat', sets: [{ weightLb: 275, reps: 5 }] }],
      })
      .expect(201);
    const res = await user
      .post(`/workouts/${id}/sets`, {
        exercises: [{ exercise: 'squats', sets: [{ weightLb: 285, reps: 3 }] }],
      })
      .expect(201);

    const { workout, newExercises } = LogResultSchema.parse(res.body);
    expect(workout.sets.map((s) => [s.exerciseName, s.weightLb, s.position])).toEqual([
      ['Squat', 275, 0],
      ['Squat', 285, 1], // "squats" resolved to the existing "Squat"
    ]);
    expect(newExercises).toEqual([]);
  });

  it('rejects RPE and RIR on the same set', async () => {
    const user = await newUser(app);
    const res = await user
      .post('/workouts', {
        exercises: [{ exercise: 'Squat', sets: [{ reps: 5, rpe: 8, rir: 2 }] }],
      })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('validation_error');
  });
});

describe('workout history', () => {
  it('lists summaries newest first', async () => {
    const user = await newUser(app);
    await user.post('/workouts', { ...session, date: '2026-11-18' }).expect(201);
    await user.post('/workouts', session).expect(201);

    const res = await user.get('/workouts').expect(200);
    const summaries = WorkoutSummarySchema.array().parse(res.body);
    expect(summaries.map((s) => s.date)).toEqual(['2026-11-20', '2026-11-18']);
    expect(summaries[0]).toMatchObject({
      exerciseNames: ['Bench Press', 'Pull-ups'],
      workingSets: 4,
      volumeLb: 225 * 5 * 2 + 25 * 6,
    });
  });

  it('fixes and deletes sets, and deletes workouts', async () => {
    const user = await newUser(app);
    const { workout } = LogResultSchema.parse((await user.post('/workouts', session)).body);
    const [warmup, firstWorking] = workout.sets;
    if (!warmup || !firstWorking) throw new Error('expected sets');

    const fixed = WorkoutSetSchema.parse(
      (await user.patch(`/sets/${firstWorking.id}`, { weightLb: 230, rir: 2 }).expect(200)).body,
    );
    expect(fixed).toMatchObject({ weightLb: 230, rpe: 8 });

    await user.delete(`/sets/${warmup.id}`).expect(204);
    const after = WorkoutSchema.parse((await user.get(`/workouts/${workout.id}`).expect(200)).body);
    expect(after.sets.map((s) => s.id)).not.toContain(warmup.id);

    await user.delete(`/workouts/${workout.id}`).expect(204);
    await user.get(`/workouts/${workout.id}`).expect(404);
  });

  it("keeps each user's workouts private", async () => {
    const owner = await newUser(app);
    const other = await newUser(app);
    const { workout } = LogResultSchema.parse((await owner.post('/workouts', session)).body);
    const set = workout.sets[0];
    if (!set) throw new Error('expected a set');

    await other.get(`/workouts/${workout.id}`).expect(404);
    await other.patch(`/sets/${set.id}`, { reps: 1 }).expect(404);
    await other.delete(`/workouts/${workout.id}`).expect(404);
    expect(WorkoutSummarySchema.array().parse((await other.get('/workouts')).body)).toEqual([]);
    await owner.get(`/workouts/${workout.id}`).expect(200);
  });
});
