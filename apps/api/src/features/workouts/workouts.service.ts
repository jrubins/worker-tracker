import * as Sentry from '@sentry/node';
import type { Db } from '@app/db';
import type {
  AddSets,
  LogResult,
  LogWorkout,
  NewExerciseNotice,
  UpdateSet,
  Workout,
  WorkoutSet,
  WorkoutSummary,
} from '@app/shared';
import { notFound } from '../../lib/http-error.ts';
import { effortAsRpe, estimateOneRepMax, localDate } from '../../lib/training.ts';
import type { ExercisesService, Orm } from '../exercises/exercises.service.ts';
import type { RoutinesService } from '../routines/routines.service.ts';

const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));
const decimal = (value: number | null): string | null => (value === null ? null : String(value));

interface SetRow {
  id: number;
  exerciseId: number;
  position: number;
  weightLb: string | null;
  reps: number;
  rpe: string | null;
  warmup: boolean;
  notes: string | null;
  exercise: { name: string } | null;
}

export const toWorkoutSet = (row: SetRow): WorkoutSet => {
  const weightLb = toNumber(row.weightLb);
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exercise?.name ?? 'Unknown exercise',
    position: row.position,
    weightLb,
    reps: row.reps,
    rpe: toNumber(row.rpe),
    warmup: row.warmup,
    notes: row.notes,
    e1rmLb: row.warmup ? null : estimateOneRepMax(weightLb, row.reps),
  };
};

/** Working (non-warm-up) volume: weight × reps. */
export const volumeOf = (sets: readonly WorkoutSet[]) =>
  sets.reduce((sum, set) => (set.warmup ? sum : sum + (set.weightLb ?? 0) * set.reps), 0);

export function createWorkoutsService(
  db: Db,
  deps: { exercises: ExercisesService; routines: RoutinesService; timeZone: string },
) {
  const withDetails = (orm: Orm) =>
    orm.public.Workout.include('sets', (sets) =>
      sets
        .orderBy([(s) => s.position.asc(), (s) => s.id.asc()])
        .include('exercise', (e) => e.select('name')),
    ).include('routineVersion', (version) =>
      version.include('routine', (routine) => routine.select('id', 'name')),
    );

  const load = async (orm: Orm, userId: string, id: number): Promise<Workout> => {
    const row = await withDetails(orm).where({ id, userId }).first();
    if (!row) throw notFound(`Workout ${id} not found`);
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
      notes: row.notes,
      sets: row.sets.map(toWorkoutSet),
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
          weightLb: decimal(set.weightLb ?? null),
          reps: set.reps,
          rpe: decimal(effortAsRpe(set)),
          warmup: set.warmup ?? false,
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
      return rows.map((row) => {
        const sets = row.sets.map(toWorkoutSet);
        return {
          id: row.id,
          date: row.date,
          routineName: row.routineVersion?.routine?.name ?? null,
          exerciseNames: [...new Set(sets.map((s) => s.exerciseName))],
          workingSets: sets.filter((s) => !s.warmup).length,
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
      const rpe = patch.rir !== undefined ? effortAsRpe({ rir: patch.rir }) : patch.rpe;
      const updated = await db.orm.public.WorkoutSet.where({ id: setId, userId }).update({
        ...(patch.weightLb !== undefined ? { weightLb: decimal(patch.weightLb) } : {}),
        ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
        ...(rpe !== undefined ? { rpe: decimal(rpe) } : {}),
        ...(patch.warmup !== undefined ? { warmup: patch.warmup } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      if (!updated) throw notFound(`Set ${setId} not found`);
      const row = await db.orm.public.WorkoutSet.where({ id: setId, userId })
        .include('exercise', (e) => e.select('name'))
        .first();
      if (!row) throw notFound(`Set ${setId} not found`);
      return toWorkoutSet(row);
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
