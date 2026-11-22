import type { Db } from '@app/db';
import type {
  NewExerciseNotice,
  Routine,
  RoutineHistory,
  RoutineVersion,
  SaveRoutine,
  SaveRoutineResult,
} from '@app/shared';
import { nameKey } from '../../lib/exercise-names.ts';
import { notFound } from '../../lib/http-error.ts';
import type { ExercisesService, Orm } from '../exercises/exercises.service.ts';

const toNumber = (value: string | null): number | null => (value === null ? null : Number(value));

interface VersionRow {
  id: number;
  version: number;
  notes: string | null;
  changeNote: string | null;
  createdAt: Date;
  exercises: readonly {
    exerciseId: number;
    position: number;
    targetSets: number | null;
    targetReps: string | null;
    targetRpe: string | null;
    notes: string | null;
    exercise: { name: string } | null;
  }[];
}

const toVersion = (row: VersionRow): RoutineVersion => ({
  id: row.id,
  version: row.version,
  notes: row.notes,
  changeNote: row.changeNote,
  createdAt: row.createdAt.toISOString(),
  exercises: [...row.exercises]
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exercise?.name ?? 'Unknown exercise',
      position: e.position,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetRpe: toNumber(e.targetRpe),
      notes: e.notes,
    })),
});

/** The parts of a version that define the plan, for "did anything change?". */
const planSignature = (version: Pick<RoutineVersion, 'notes' | 'exercises'>) =>
  JSON.stringify({
    notes: version.notes ?? null,
    exercises: version.exercises.map((e) => [
      e.exerciseId,
      e.targetSets,
      e.targetReps,
      e.targetRpe,
      e.notes ?? null,
    ]),
  });

/**
 * Routines (the rotation) and their version history. Saving a changed plan adds a new
 * immutable version with a change note; workouts link the version they followed.
 */
export function createRoutinesService(db: Db, exercises: ExercisesService) {
  const withVersions = (orm: Orm) =>
    orm.public.Routine.include('versions', (versions) =>
      versions
        .orderBy((v) => v.version.desc())
        .include('exercises', (entries) => entries.include('exercise', (e) => e.select('name'))),
    );

  const toHistory = (row: {
    id: number;
    name: string;
    position: number;
    archived: boolean;
    versions: readonly VersionRow[];
  }): RoutineHistory => {
    const versions = row.versions.map(toVersion);
    const current = versions[0];
    if (!current) throw new Error(`Routine ${row.id} has no versions`);
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      archived: row.archived,
      current,
      versions,
    };
  };

  const toRoutine = (history: RoutineHistory): Routine => ({
    id: history.id,
    name: history.name,
    position: history.position,
    archived: history.archived,
    current: history.current,
  });

  const service = {
    /** Active routines in rotation order, each with its current plan. */
    async list(userId: string): Promise<Routine[]> {
      const rows = await withVersions(db.orm)
        .where({ userId, archived: false })
        .orderBy([(r) => r.position.asc(), (r) => r.id.asc()])
        .all()
        .toArray();
      return rows.map((row) => toRoutine(toHistory(row)));
    },

    /** One routine with every version, newest first. */
    async history(userId: string, id: number): Promise<RoutineHistory> {
      const row = await withVersions(db.orm).where({ id, userId }).first();
      if (!row) throw notFound(`Routine ${id} not found`);
      return toHistory(row);
    },

    async findByName(
      userId: string,
      name: string,
      orm: Orm = db.orm,
    ): Promise<RoutineHistory | null> {
      const row = await withVersions(orm)
        .where({ userId, nameKey: nameKey(name) })
        .first();
      return row ? toHistory(row) : null;
    },

    /** Creates the routine or adds a version when its plan changed. */
    async save(userId: string, input: SaveRoutine): Promise<SaveRoutineResult> {
      return db.transaction(async (tx) => {
        const newExercises: NewExerciseNotice[] = [];
        const entries = [];
        for (const [index, entry] of input.exercises.entries()) {
          const { exercise, notice } = await exercises.resolve(userId, entry.exercise, tx.orm, {
            confirmed: true,
          });
          if (notice) newExercises.push(notice);
          entries.push({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            position: index,
            targetSets: entry.targetSets ?? null,
            targetReps: entry.targetReps ?? null,
            targetRpe: entry.targetRpe ?? null,
            notes: entry.notes ?? null,
          });
        }

        let routine = await tx.orm.public.Routine.where({
          userId,
          nameKey: nameKey(input.name),
        }).first();
        const existing = routine ? await service.findByName(userId, input.name, tx.orm) : null;
        const proposed = { notes: input.notes ?? null, exercises: entries };
        if (existing && planSignature(existing.current) === planSignature(proposed)) {
          return { routine: toRoutine(existing), changed: false, newExercises };
        }

        if (!routine) {
          const last = await tx.orm.public.Routine.where({ userId })
            .orderBy((r) => r.position.desc())
            .first();
          routine = await tx.orm.public.Routine.create({
            userId,
            name: input.name,
            nameKey: nameKey(input.name),
            position: input.position ?? (last ? last.position + 1 : 0),
            archived: false,
          });
        } else if (input.position !== undefined || routine.archived) {
          routine =
            (await tx.orm.public.Routine.where({ id: routine.id, userId }).update({
              position: input.position ?? routine.position,
              archived: false,
            })) ?? routine;
        }

        const version = await tx.orm.public.RoutineVersion.create({
          routineId: routine.id,
          version: (existing?.current.version ?? 0) + 1,
          notes: input.notes ?? null,
          changeNote: input.changeNote ?? (existing ? null : 'Created'),
        });
        for (const entry of entries) {
          await tx.orm.public.RoutineVersionExercise.create({
            routineVersionId: version.id,
            exerciseId: entry.exerciseId,
            position: entry.position,
            targetSets: entry.targetSets,
            targetReps: entry.targetReps,
            targetRpe: entry.targetRpe === null ? null : String(entry.targetRpe),
            notes: entry.notes,
          });
        }

        const saved = await service.findByName(userId, input.name, tx.orm);
        if (!saved) throw new Error('Routine vanished while saving');
        return { routine: toRoutine(saved), changed: true, newExercises };
      });
    },

    async archive(userId: string, id: number): Promise<void> {
      const updated = await db.orm.public.Routine.where({ id, userId }).update({ archived: true });
      if (!updated) throw notFound(`Routine ${id} not found`);
    },
  };

  return service;
}

export type RoutinesService = ReturnType<typeof createRoutinesService>;
