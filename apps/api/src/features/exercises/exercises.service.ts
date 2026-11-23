import type { Db } from '@app/db';
import {
  EquipmentSchema,
  LoadTypeSchema,
  type CreateExercise,
  type Equipment,
  type Exercise,
  type ExerciseLink,
  type LoadType,
  type NewExerciseNotice,
  type SimilarExercise,
  type UpdateExercise,
} from '@app/shared';
import {
  nameKey,
  nameSimilarity,
  sameExerciseName,
  SIMILAR_THRESHOLD,
} from '../../lib/exercise-names.ts';
import { HttpError, notFound } from '../../lib/http-error.ts';

/** `db.orm`, or a transaction's `tx.orm`: services accept either so callers can compose them. */
export type Orm = Db['orm'];

interface ExerciseRow {
  id: number;
  name: string;
  aliases: readonly string[];
  equipment: string | null;
  loadType: string;
  notes: string | null;
  links: readonly { url: string; label?: string | null }[];
  confirmed: boolean;
}

export const toExercise = (row: ExerciseRow): Exercise => ({
  id: row.id,
  name: row.name,
  aliases: [...row.aliases],
  equipment: EquipmentSchema.safeParse(row.equipment).data ?? null,
  loadType: LoadTypeSchema.safeParse(row.loadType).data ?? 'total',
  notes: row.notes,
  links: row.links.map((link) => ({ url: link.url, label: link.label ?? null })),
  confirmed: row.confirmed,
});

/** The load type an exercise gets when none is given: what its equipment usually means. */
export const defaultLoadType = (equipment: Equipment | null | undefined): LoadType =>
  equipment === 'dumbbell' ? 'per_hand' : equipment === 'bodyweight' ? 'bodyweight_plus' : 'total';

/** Links as stored: no duplicate addresses, a label or null. */
const toLinks = (links: readonly { url: string; label?: string | null }[]): ExerciseLink[] => {
  const seen = new Set<string>();
  return links.flatMap((link) => {
    if (seen.has(link.url)) return [];
    seen.add(link.url);
    return [{ url: link.url, label: link.label ?? null }];
  });
};

const conflict = (message: string) => new HttpError(409, 'conflict', message);

/** An exercise whose name or one of its aliases matches `name`. */
function findByName<T extends ExerciseRow>(rows: T[], name: string): T | undefined {
  return rows.find(
    (row) =>
      sameExerciseName(row.name, name) ||
      row.aliases.some((alias) => sameExerciseName(alias, name)),
  );
}

/** Confirmed exercises resembling `name`: the candidates to merge an unrecognized name into. */
function similarTo(rows: ExerciseRow[], name: string, excludeId?: number): SimilarExercise[] {
  return rows
    .filter((row) => row.confirmed && row.id !== excludeId)
    .map((row) => ({
      exercise: toExercise(row),
      similarity: Math.max(
        nameSimilarity(row.name, name),
        ...row.aliases.map((alias) => nameSimilarity(alias, name)),
      ),
    }))
    .filter((match) => match.similarity >= SIMILAR_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

/**
 * Exercises and their names. Unrecognized names met while logging become *unconfirmed*
 * exercises (so logging is never blocked), returned with similar existing exercises; the user
 * later confirms each one or merges it into the exercise they meant.
 */
export function createExercisesService(db: Db) {
  const all = (orm: Orm, userId: string) =>
    orm.public.Exercise.where({ userId })
      .orderBy([(e) => e.name.asc(), (e) => e.id.asc()])
      .all()
      .toArray();

  const owned = async (orm: Orm, userId: string, id: number) => {
    const row = await orm.public.Exercise.where({ id, userId }).first();
    if (!row) throw notFound(`Exercise ${id} not found`);
    return row;
  };

  const service = {
    async list(userId: string): Promise<Exercise[]> {
      return (await all(db.orm, userId)).map(toExercise);
    },

    async get(userId: string, id: number): Promise<Exercise> {
      return toExercise(await owned(db.orm, userId, id));
    },

    async create(userId: string, input: CreateExercise, orm: Orm = db.orm): Promise<Exercise> {
      const rows = await all(orm, userId);
      for (const name of [input.name, ...(input.aliases ?? [])]) {
        const existing = findByName(rows, name);
        if (existing) throw conflict(`"${name}" is already the exercise "${existing.name}"`);
      }
      const row = await orm.public.Exercise.create({
        userId,
        name: input.name,
        nameKey: nameKey(input.name),
        aliases: input.aliases ?? [],
        equipment: input.equipment ?? null,
        loadType: input.loadType ?? defaultLoadType(input.equipment),
        notes: input.notes ?? null,
        links: toLinks(input.links ?? []),
        confirmed: true,
      });
      return toExercise(row);
    },

    async update(userId: string, id: number, patch: UpdateExercise): Promise<Exercise> {
      const current = await owned(db.orm, userId, id);
      const others = (await all(db.orm, userId)).filter((row) => row.id !== id);
      for (const name of [patch.name, ...(patch.addAliases ?? [])].filter((n) => n !== undefined)) {
        const existing = findByName(others, name);
        if (existing) throw conflict(`"${name}" is already the exercise "${existing.name}"`);
      }
      const aliases = [...current.aliases];
      for (const alias of patch.addAliases ?? []) {
        if (!aliases.some((a) => sameExerciseName(a, alias))) aliases.push(alias);
      }
      const updated = await db.orm.public.Exercise.where({ id, userId }).update({
        ...(patch.name ? { name: patch.name, nameKey: nameKey(patch.name) } : {}),
        aliases,
        ...(patch.equipment !== undefined ? { equipment: patch.equipment } : {}),
        ...(patch.loadType !== undefined ? { loadType: patch.loadType } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.links !== undefined ? { links: toLinks(patch.links) } : {}),
      });
      if (!updated) throw notFound(`Exercise ${id} not found`);
      return toExercise(updated);
    },

    /** The exercise a typed name refers to; when none, the most similar ones (for a hint). */
    async lookup(
      userId: string,
      name: string,
    ): Promise<{ exercise: Exercise | null; similar: SimilarExercise[] }> {
      const rows = await all(db.orm, userId);
      const match = findByName(rows, name);
      return match
        ? { exercise: toExercise(match), similar: [] }
        : { exercise: null, similar: similarTo(rows, name) };
    },

    /** Like `lookup`, but a missing name is a 404 that suggests similar exercises. */
    async require(userId: string, name: string): Promise<Exercise> {
      const { exercise, similar } = await service.lookup(userId, name);
      if (exercise) return exercise;
      const hint = similar.length
        ? ` Did you mean ${similar.map((s) => `"${s.exercise.name}"`).join(' or ')}?`
        : '';
      throw notFound(`No exercise named "${name}".${hint}`);
    },

    /**
     * Finds the exercise a typed name refers to (by name or alias), or creates an unconfirmed
     * one and reports the most similar existing exercises.
     */
    async resolve(
      userId: string,
      name: string,
      orm: Orm,
      /** Deliberate names (a saved routine) start confirmed; names met while logging don't. */
      options: { confirmed: boolean } = { confirmed: false },
    ): Promise<{ exercise: Exercise; notice: NewExerciseNotice | null }> {
      const rows = await all(orm, userId);
      const existing = findByName(rows, name);
      if (existing) return { exercise: toExercise(existing), notice: null };

      const row = await orm.public.Exercise.create({
        userId,
        name,
        nameKey: nameKey(name),
        aliases: [],
        equipment: null,
        loadType: 'total',
        notes: null,
        links: [],
        confirmed: options.confirmed,
      });
      const exercise = toExercise(row);
      return { exercise, notice: { exercise, similar: similarTo(rows, name) } };
    },

    /** Unconfirmed exercises with their likely matches: what to review after a workout. */
    async listUnconfirmed(userId: string): Promise<NewExerciseNotice[]> {
      const rows = await all(db.orm, userId);
      return rows
        .filter((row) => !row.confirmed)
        .map((row) => ({ exercise: toExercise(row), similar: similarTo(rows, row.name, row.id) }));
    },

    async confirm(userId: string, id: number): Promise<Exercise> {
      await owned(db.orm, userId, id);
      const updated = await db.orm.public.Exercise.where({ id, userId }).update({
        confirmed: true,
      });
      if (!updated) throw notFound(`Exercise ${id} not found`);
      return toExercise(updated);
    },

    /**
     * Folds `fromId` into `intoId`: its sets and planned entries move over, its name and aliases
     * become aliases of `intoId`, its links are added to `intoId`'s, and it is deleted.
     */
    async merge(userId: string, fromId: number, intoId: number): Promise<Exercise> {
      if (fromId === intoId)
        throw new HttpError(400, 'bad_request', 'Cannot merge an exercise into itself');
      return db.transaction(async (tx) => {
        const from = await owned(tx.orm, userId, fromId);
        const into = await owned(tx.orm, userId, intoId);

        await tx.orm.public.WorkoutSet.where({ userId, exerciseId: fromId }).updateAll({
          exerciseId: intoId,
        });
        await tx.orm.public.RoutineVersionExercise.where({ exerciseId: fromId }).updateAll({
          exerciseId: intoId,
        });

        const aliases = [...into.aliases];
        for (const alias of [from.name, ...from.aliases]) {
          if (
            !sameExerciseName(alias, into.name) &&
            !aliases.some((a) => sameExerciseName(a, alias))
          ) {
            aliases.push(alias);
          }
        }
        await tx.orm.public.Exercise.where({ id: fromId, userId }).delete();
        const merged = await tx.orm.public.Exercise.where({ id: intoId, userId }).update({
          aliases,
          links: toLinks([...into.links, ...from.links]),
          confirmed: true,
        });
        if (!merged) throw notFound(`Exercise ${intoId} not found`);
        return toExercise(merged);
      });
    },
  };

  return service;
}

export type ExercisesService = ReturnType<typeof createExercisesService>;
