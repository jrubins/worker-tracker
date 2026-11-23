import * as Sentry from '@sentry/node';
import type { Db } from '@app/db';
import {
  LoadTypeSchema,
  SetTypeSchema,
  setTypeOf,
  type AddSets,
  type LogResult,
  type LogWorkout,
  type NewExerciseNotice,
  type UpdateSet,
  type UpdateWorkout,
  type Workout,
  type WorkoutSet,
  type WorkoutSummary,
} from '@app/shared';
import { HttpError, notFound } from '../../lib/http-error.ts';
import { bodyweightOn, effortAsRpe, localDate, setMetrics } from '../../lib/training.ts';
import type { ExercisesService, Orm } from '../exercises/exercises.service.ts';
import type { RoutinesService } from '../routines/routines.service.ts';

const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));
const decimal = (value: number | null): string | null => (value === null ? null : String(value));

interface SetRow {
  id: number;
  exerciseId: number;
  position: number;
  setType: string;
  weightLb: string | null;
  reps: number | null;
  durationSeconds: number | null;
  rpe: string | null;
  notes: string | null;
  exercise: { name: string; loadType: string } | null;
}

/** A set as returned, with its load, volume and estimate (see `setMetrics`). */
export const toWorkoutSet = (row: SetRow, bodyweightLb: number | null): WorkoutSet => {
  const weightLb = toNumber(row.weightLb);
  const setType = SetTypeSchema.safeParse(row.setType).data ?? 'working';
  const loadType = LoadTypeSchema.safeParse(row.exercise?.loadType).data ?? 'total';
  const { loadLb, volumeLb, e1rmLb } = setMetrics({
    setType,
    loadType,
    weightLb,
    reps: row.reps,
    bodyweightLb,
  });
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exercise?.name ?? 'Unknown exercise',
    loadType,
    position: row.position,
    setType,
    weightLb,
    reps: row.reps,
    durationSeconds: row.durationSeconds,
    rpe: toNumber(row.rpe),
    notes: row.notes,
    loadLb,
    volumeLb,
    e1rmLb,
  };
};

/** Total volume of some sets (warm-ups add none; drop sets do). */
export const volumeOf = (sets: readonly WorkoutSet[]) =>
  Math.round(sets.reduce((sum, set) => sum + set.volumeLb, 0) * 10) / 10;

/** Sets of their own: working sets (warm-ups don't count; a drop continues the set before). */
export const countedSets = (sets: readonly WorkoutSet[]) =>
  sets.filter((set) => set.setType === 'working').length;

/** The exercise fields a set needs to compute its load. */
export const setExerciseFields = ['name', 'loadType'] as const;

/**
 * The user's logged bodyweights, and a function giving the bodyweight to use for a workout:
 * its own, else the nearest logged one (see `bodyweightOn`).
 */
export async function bodyweights(orm: Orm, userId: string) {
  const rows = await orm.public.Workout.where({ userId })
    .select('date', 'bodyweightLb')
    .all()
    .toArray();
  const logged = rows.flatMap((row) =>
    row.bodyweightLb === null ? [] : [{ date: row.date, bodyweightLb: Number(row.bodyweightLb) }],
  );
  return (workout: { date: string; bodyweightLb: string | null }) =>
    workout.bodyweightLb === null
      ? bodyweightOn(logged, workout.date)
      : Number(workout.bodyweightLb);
}

export function createWorkoutsService(
  db: Db,
  deps: { exercises: ExercisesService; routines: RoutinesService; timeZone: string },
) {
  const withDetails = (orm: Orm) =>
    orm.public.Workout.include('sets', (sets) =>
      sets
        .orderBy([(s) => s.position.asc(), (s) => s.id.asc()])
        .include('exercise', (e) => e.select(...setExerciseFields)),
    ).include('routineVersion', (version) =>
      version.include('routine', (routine) => routine.select('id', 'name')),
    );

  const load = async (orm: Orm, userId: string, id: number): Promise<Workout> => {
    const row = await withDetails(orm).where({ id, userId }).first();
    if (!row) throw notFound(`Workout ${id} not found`);
    const bodyweightLb = (await bodyweights(orm, userId))(row);
    const version = row.routineVersion;
    return {
      id: row.id,
      date: row.date,
      routine:
        version && version.routine
          ? {
              routineId: version.routine.id,
              name: version.routine.name,
              version: version.version,
              routineVersionId: version.id,
            }
          : null,
      startedAt: row.startedAt?.toISOString() ?? null,
      durationMinutes: row.durationMinutes,
      bodyweightLb: toNumber(row.bodyweightLb),
      notes: row.notes,
      sets: row.sets.map((set) => toWorkoutSet(set, bodyweightLb)),
    };
  };

  /** Appends sets (resolving exercise names) after the workout's last set. */
  const appendSets = async (
    orm: Orm,
    userId: string,
    workoutId: number,
    exercises: AddSets['exercises'],
  ): Promise<NewExerciseNotice[]> => {
    const last = await orm.public.WorkoutSet.where({ workoutId, userId })
      .orderBy((s) => s.position.desc())
      .first();
    let position = last ? last.position + 1 : 0;
    const notices: NewExerciseNotice[] = [];
    for (const group of exercises) {
      const { exercise, notice } = await deps.exercises.resolve(userId, group.exercise, orm);
      if (notice) notices.push(notice);
      // Custom metric (a no-op while Sentry is disabled).
      Sentry.metrics.count('sets.logged', group.sets.length);
      for (const set of group.sets) {
        await orm.public.WorkoutSet.create({
          userId,
          workoutId,
          exerciseId: exercise.id,
          position: position++,
          setType: setTypeOf(set),
          weightLb: decimal(set.weightLb ?? null),
          reps: set.reps ?? null,
          durationSeconds: set.durationSeconds ?? null,
          rpe: decimal(effortAsRpe(set)),
          notes: set.notes ?? null,
        });
      }
    }
    return notices;
  };

  const service = {
    get: (userId: string, id: number) => load(db.orm, userId, id),

    /** Recent workouts, newest first, as summaries. */
    async list(userId: string, limit: number): Promise<WorkoutSummary[]> {
      const rows = await withDetails(db.orm)
        .where({ userId })
        .orderBy([(w) => w.date.desc(), (w) => w.id.desc()])
        .limit(limit)
        .all()
        .toArray();
      const bodyweightFor = await bodyweights(db.orm, userId);
      return rows.map((row) => {
        const bodyweightLb = bodyweightFor(row);
        const sets = row.sets.map((set) => toWorkoutSet(set, bodyweightLb));
        return {
          id: row.id,
          date: row.date,
          routineName: row.routineVersion?.routine?.name ?? null,
          exerciseNames: [...new Set(sets.map((s) => s.exerciseName))],
          workingSets: countedSets(sets),
          volumeLb: volumeOf(sets),
        };
      });
    },

    /** Logs a whole session (or starts one to add sets to as you go). */
    async log(userId: string, input: LogWorkout): Promise<LogResult> {
      return db.transaction(async (tx) => {
        let routineVersionId: number | null = null;
        if (input.routine) {
          const routine = await deps.routines.findByName(userId, input.routine, tx.orm);
          if (!routine) throw notFound(`Routine "${input.routine}" not found`);
          routineVersionId = routine.current.id;
        }
        const workout = await tx.orm.public.Workout.create({
          userId,
          date: input.date ?? localDate(deps.timeZone),
          routineVersionId,
          startedAt: input.startedAt ? new Date(input.startedAt) : null,
          durationMinutes: input.durationMinutes ?? null,
          bodyweightLb: decimal(input.bodyweightLb ?? null),
          notes: input.notes ?? null,
        });
        const newExercises = await appendSets(tx.orm, userId, workout.id, input.exercises ?? []);
        Sentry.metrics.count('workouts.logged', 1);
        return { workout: await load(tx.orm, userId, workout.id), newExercises };
      });
    },

    /** Adds sets to an existing workout (live logging). */
    async addSets(userId: string, input: AddSets): Promise<LogResult> {
      return db.transaction(async (tx) => {
        await load(tx.orm, userId, input.workoutId);
        const newExercises = await appendSets(tx.orm, userId, input.workoutId, input.exercises);
        return { workout: await load(tx.orm, userId, input.workoutId), newExercises };
      });
    },

    async updateSet(userId: string, setId: number, patch: UpdateSet): Promise<WorkoutSet> {
      const current = await db.orm.public.WorkoutSet.where({ id: setId, userId }).first();
      if (!current) throw notFound(`Set ${setId} not found`);
      const reps = patch.reps !== undefined ? patch.reps : current.reps;
      const durationSeconds =
        patch.durationSeconds !== undefined ? patch.durationSeconds : current.durationSeconds;
      if (reps === null && durationSeconds === null) {
        throw new HttpError(400, 'validation_error', 'A set needs reps, durationSeconds, or both');
      }
      const rpe = patch.rir !== undefined ? effortAsRpe({ rir: patch.rir }) : patch.rpe;
      const setType =
        patch.setType ??
        (patch.warmup === undefined ? undefined : patch.warmup ? 'warmup' : 'working');
      await db.orm.public.WorkoutSet.where({ id: setId, userId }).update({
        ...(patch.weightLb !== undefined ? { weightLb: decimal(patch.weightLb) } : {}),
        reps,
        durationSeconds,
        ...(rpe !== undefined ? { rpe: decimal(rpe) } : {}),
        ...(setType !== undefined ? { setType } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      const workout = await load(db.orm, userId, current.workoutId);
      const set = workout.sets.find((s) => s.id === setId);
      if (!set) throw notFound(`Set ${setId} not found`);
      return set;
    },

    /** Corrects a workout's date, duration, bodyweight or notes. */
    async updateWorkout(userId: string, id: number, patch: UpdateWorkout): Promise<Workout> {
      const updated = await db.orm.public.Workout.where({ id, userId }).update({
        ...(patch.date !== undefined ? { date: patch.date } : {}),
        ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
        ...(patch.bodyweightLb !== undefined ? { bodyweightLb: decimal(patch.bodyweightLb) } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      if (!updated) throw notFound(`Workout ${id} not found`);
      return load(db.orm, userId, id);
    },

    async deleteSet(userId: string, setId: number): Promise<void> {
      const deleted = await db.orm.public.WorkoutSet.where({ id: setId, userId }).delete();
      if (!deleted) throw notFound(`Set ${setId} not found`);
    },

    async deleteWorkout(userId: string, id: number): Promise<void> {
      const deleted = await db.orm.public.Workout.where({ id, userId }).delete();
      if (!deleted) throw notFound(`Workout ${id} not found`);
    },
  };

  return service;
}

export type WorkoutsService = ReturnType<typeof createWorkoutsService>;
