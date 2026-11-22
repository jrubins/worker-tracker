import {
  LogResultSchema,
  RoutineHistorySchema,
  RoutineSchema,
  SaveRoutineResultSchema,
} from '@app/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp, newUser } from './helpers.ts';

const { app, db } = createTestApp();

afterAll(async () => {
  await db.close();
});

const pushA = {
  name: 'Push A',
  notes: 'Heavy pressing day',
  exercises: [
    { exercise: 'Bench Press', targetSets: 4, targetReps: '5', targetRpe: 8 },
    { exercise: 'Overhead Press', targetSets: 3, targetReps: '8-10' },
  ],
};

describe('routines', () => {
  it('creates a routine as version 1, in rotation order', async () => {
    const user = await newUser(app);
    parseSaved(await user.post('/routines', pushA).expect(200));
    await user.post('/routines', { ...pushA, name: 'Pull A' }).expect(200);

    const routines = RoutineSchema.array().parse((await user.get('/routines').expect(200)).body);
    expect(routines.map((r) => [r.name, r.position, r.current.version])).toEqual([
      ['Push A', 0, 1],
      ['Pull A', 1, 1],
    ]);
    expect(
      routines[0]?.current.exercises.map((e) => [e.exerciseName, e.targetReps, e.targetRpe]),
    ).toEqual([
      ['Bench Press', '5', 8],
      ['Overhead Press', '8-10', null],
    ]);
  });

  it('adds a version only when the plan changes, keeping the history', async () => {
    const user = await newUser(app);
    parseSaved(await user.post('/routines', pushA).expect(200));

    const same = parseSaved(await user.post('/routines', pushA).expect(200));
    expect(same.changed).toBe(false);
    expect(same.routine.current.version).toBe(1);

    const changed = parseSaved(
      await user
        .post('/routines', {
          ...pushA,
          changeNote: 'Swapped OHP for dips: shoulder irritation',
          exercises: [pushA.exercises[0], { exercise: 'Dips', targetSets: 3, targetReps: '10' }],
        })
        .expect(200),
    );
    expect(changed.changed).toBe(true);

    const history = RoutineHistorySchema.parse(
      (await user.get(`/routines/${changed.routine.id}`)).body,
    );
    expect(history.versions.map((v) => [v.version, v.changeNote])).toEqual([
      [2, 'Swapped OHP for dips: shoulder irritation'],
      [1, 'Created'],
    ]);
    expect(history.versions[1]?.exercises.map((e) => e.exerciseName)).toEqual([
      'Bench Press',
      'Overhead Press',
    ]);
  });

  it('links a logged workout to the version it followed', async () => {
    const user = await newUser(app);
    const saved = parseSaved(await user.post('/routines', pushA).expect(200));

    const { workout } = LogResultSchema.parse(
      (
        await user
          .post('/workouts', {
            routine: 'push a',
            exercises: [{ exercise: 'Bench Press', sets: [{ weightLb: 225, reps: 5 }] }],
          })
          .expect(201)
      ).body,
    );
    expect(workout.routine).toMatchObject({
      name: 'Push A',
      version: 1,
      routineId: saved.routine.id,
    });
  });

  it('reports an unknown routine when logging', async () => {
    const user = await newUser(app);
    await user.post('/workouts', { routine: 'Legs Z', exercises: [] }).expect(404);
  });

  it('archives a routine out of the rotation', async () => {
    const user = await newUser(app);
    const saved = parseSaved(await user.post('/routines', pushA).expect(200));
    await user.post(`/routines/${saved.routine.id}/archive`).expect(204);
    expect((await user.get('/routines')).body).toEqual([]);
  });
});

function parseSaved(res: { body: unknown }) {
  return SaveRoutineResultSchema.parse(res.body);
}
