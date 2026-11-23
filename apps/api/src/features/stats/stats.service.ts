import type { Db } from '@app/db';
import type {
  Dashboard,
  ExerciseDetail,
  ExerciseProgress,
  LastSession,
  LoadType,
  LongestHold,
  PersonalRecords,
  RecentPr,
  RecordSet,
  WeeklySummary,
  WorkoutSet,
} from '@app/shared';
import { addDays, localDate, weekStart } from '../../lib/training.ts';
import type { ExercisesService } from '../exercises/exercises.service.ts';
import {
  bodyweights,
  countedSets,
  setExerciseFields,
  toWorkoutSet,
  volumeOf,
} from '../workouts/workouts.service.ts';

/** A set with the date and workout it belongs to. */
interface DatedSet {
  set: WorkoutSet;
  date: string;
  workoutId: number;
}

const byTime = (a: DatedSet, b: DatedSet) =>
  a.date.localeCompare(b.date) || a.workoutId - b.workoutId || a.set.position - b.set.position;

const asRecord = ({ set, date, workoutId }: DatedSet): RecordSet => ({
  weightLb: set.weightLb,
  reps: set.reps ?? 0,
  e1rmLb: set.e1rmLb,
  date,
  workoutId,
});

/**
 * Sets records are based on: working sets with reps, and with a weight unless the exercise is
 * bodyweight_plus (where no added weight is a bodyweight set). Warm-ups and drops never count.
 */
const isScored = ({ set }: DatedSet) =>
  set.setType === 'working' &&
  (set.reps ?? 0) >= 1 &&
  (set.loadType === 'bodyweight_plus' || (set.weightLb ?? 0) > 0);

/** Sets with an estimated one-rep max: what estimate-based records and PRs compare. */
const hasEstimate = (entry: DatedSet) => isScored(entry) && entry.set.e1rmLb !== null;

/** The first entry with the highest score (earliest wins a tie: when the record was set). */
const bestBy = (entries: DatedSet[], score: (entry: DatedSet) => number) =>
  entries.reduce<DatedSet | null>(
    (top, entry) => (!top || score(entry) > score(top) ? entry : top),
    null,
  );

function recordsOf(
  exercise: { id: number; name: string; loadType: LoadType },
  sets: DatedSet[],
): PersonalRecords {
  const scored = sets.filter(isScored);
  const weight = (e: DatedSet) => e.set.weightLb ?? 0;
  const reps = (e: DatedSet) => e.set.reps ?? 0;
  const bestE1rm = bestBy(scored.filter(hasEstimate), (e) => e.set.e1rmLb ?? 0);
  const heaviest = bestBy(scored, (e) => weight(e) * 10_000 + reps(e));
  const mostReps = bestBy(scored, (e) => reps(e) * 10_000 + weight(e));

  const repMaxes: RecordSet[] = [];
  for (let count = 1; count <= 12; count++) {
    const top = bestBy(
      scored.filter((e) => reps(e) === count),
      weight,
    );
    if (top) repMaxes.push(asRecord(top));
  }

  const timed = sets.filter((e) => e.set.setType === 'working' && e.set.durationSeconds !== null);
  const hold = bestBy(timed, (e) => e.set.durationSeconds ?? 0);
  const longestHold: LongestHold | null = hold
    ? {
        durationSeconds: hold.set.durationSeconds ?? 0,
        weightLb: hold.set.weightLb,
        date: hold.date,
        workoutId: hold.workoutId,
      }
    : null;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    loadType: exercise.loadType,
    bestE1rm: bestE1rm && asRecord(bestE1rm),
    heaviest: heaviest && asRecord(heaviest),
    mostReps: mostReps && asRecord(mostReps),
    repMaxes,
    longestHold,
  };
}

export function createStatsService(
  db: Db,
  deps: { exercises: ExercisesService; timeZone: string },
) {
  /** All of a user's sets (optionally for one exercise), oldest first. */
  const datedSets = async (userId: string, exerciseId?: number): Promise<DatedSet[]> => {
    const rows = await db.orm.public.WorkoutSet.where(
      exerciseId === undefined ? { userId } : { userId, exerciseId },
    )
      .include('exercise', (e) => e.select(...setExerciseFields))
      .include('workout', (w) => w.select('id', 'date', 'bodyweightLb'))
      .all()
      .toArray();
    const bodyweightFor = await bodyweights(db.orm, userId);
    return rows
      .flatMap((row) =>
        row.workout
          ? [
              {
                set: toWorkoutSet(row, bodyweightFor(row.workout)),
                date: row.workout.date,
                workoutId: row.workout.id,
              },
            ]
          : [],
      )
      .sort(byTime);
  };

  const today = () => localDate(deps.timeZone);

  const service = {
    async records(userId: string, exerciseId: number): Promise<PersonalRecords> {
      const exercise = await deps.exercises.get(userId, exerciseId);
      return recordsOf(exercise, await datedSets(userId, exerciseId));
    },

    /** Records for every exercise with a record, by best estimated one-rep max (none last). */
    async allRecords(userId: string): Promise<PersonalRecords[]> {
      const sets = await datedSets(userId);
      const byExercise = Map.groupBy(sets, (entry) => entry.set.exerciseId);
      return [...byExercise.values()]
        .flatMap((entries) => {
          const first = entries[0];
          const records =
            first &&
            recordsOf(
              {
                id: first.set.exerciseId,
                name: first.set.exerciseName,
                loadType: first.set.loadType,
              },
              entries,
            );
          return records && (records.heaviest || records.longestHold) ? [records] : [];
        })
        .sort((a, b) => (b.bestE1rm?.e1rmLb ?? 0) - (a.bestE1rm?.e1rmLb ?? 0));
    },

    /** The most recent session that included this exercise, with its sets. */
    async lastSession(userId: string, exerciseId: number): Promise<LastSession | null> {
      const exercise = await deps.exercises.get(userId, exerciseId);
      const sets = await datedSets(userId, exerciseId);
      const latest = sets.at(-1);
      if (!latest) return null;
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        workoutId: latest.workoutId,
        date: latest.date,
        sets: sets.filter((e) => e.workoutId === latest.workoutId).map((e) => e.set),
      };
    },

    /** Per-session numbers for an exercise over the last `weeks` weeks, oldest first. */
    async progress(userId: string, exerciseId: number, weeks: number): Promise<ExerciseProgress> {
      const exercise = await deps.exercises.get(userId, exerciseId);
      const since = addDays(today(), -weeks * 7);
      const sets = (await datedSets(userId, exerciseId)).filter((e) => e.date >= since);
      const sessions = Map.groupBy(sets, (e) => e.workoutId);
      const points = [...sessions.values()].map((entries) => {
        const scored = entries.filter(isScored);
        const top = bestBy(scored, (e) => (e.set.weightLb ?? 0) * 10_000 + (e.set.reps ?? 0));
        const e1rms = scored.map((e) => e.set.e1rmLb).filter((v) => v !== null);
        const sets = entries.map((e) => e.set);
        const first = entries[0];
        return {
          date: first?.date ?? '',
          workoutId: first?.workoutId ?? 0,
          topSetWeightLb: top?.set.weightLb ?? null,
          topSetReps: top?.set.reps ?? null,
          bestE1rmLb: e1rms.length ? Math.max(...e1rms) : null,
          volumeLb: volumeOf(sets),
          workingSets: countedSets(sets),
        };
      });
      return { exerciseId: exercise.id, exerciseName: exercise.name, points };
    },

    /** Sessions, sets and volume per Monday-start week, ending this week, plus the streak. */
    async weekly(userId: string, weeks: number): Promise<WeeklySummary> {
      const thisWeek = weekStart(today());
      const firstWeek = addDays(thisWeek, -(weeks - 1) * 7);
      const workouts = await db.orm.public.Workout.where({ userId })
        .select('id', 'date')
        .all()
        .toArray();
      const sets = await datedSets(userId);

      const summary = Array.from({ length: weeks }, (_, i) => {
        const start = addDays(firstWeek, i * 7);
        const inWeek = (date: string) => weekStart(date) === start;
        const weekSets = sets.filter((e) => inWeek(e.date)).map((e) => e.set);
        return {
          weekStart: start,
          sessions: workouts.filter((w) => inWeek(w.date)).length,
          workingSets: countedSets(weekSets),
          volumeLb: volumeOf(weekSets),
        };
      });

      // Streak: consecutive weeks with a session, counting back from this week (or from last
      // week when this week has none yet).
      const trained = new Set(workouts.map((w) => weekStart(w.date)));
      let cursor = trained.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
      let streakWeeks = 0;
      while (trained.has(cursor)) {
        streakWeeks++;
        cursor = addDays(cursor, -7);
      }
      return { weeks: summary, streakWeeks };
    },

    /** Sets in the last `days` days that beat the previous best estimated one-rep max. */
    async recentPrs(userId: string, days: number): Promise<RecentPr[]> {
      const since = addDays(today(), -days);
      const best = new Map<number, number>();
      const prs: RecentPr[] = [];
      for (const entry of (await datedSets(userId)).filter(hasEstimate)) {
        const previous = best.get(entry.set.exerciseId) ?? null;
        const e1rm = entry.set.e1rmLb ?? 0;
        if (previous === null || e1rm > previous) {
          best.set(entry.set.exerciseId, e1rm);
          if (entry.date >= since) {
            prs.push({
              ...asRecord(entry),
              e1rmLb: e1rm,
              loadType: entry.set.loadType,
              exerciseId: entry.set.exerciseId,
              exerciseName: entry.set.exerciseName,
              previousBestE1rmLb: previous,
            });
          }
        }
      }
      // Newest first; one entry per exercise (its latest PR).
      const latest = new Map<number, RecentPr>();
      for (const pr of prs.reverse()) if (!latest.has(pr.exerciseId)) latest.set(pr.exerciseId, pr);
      return [...latest.values()];
    },

    async dashboard(userId: string): Promise<Dashboard> {
      return {
        today: today(),
        weekly: await service.weekly(userId, 8),
        recentPrs: await service.recentPrs(userId, 30),
      };
    },

    async exerciseDetail(
      userId: string,
      exerciseId: number,
      weeks: number,
    ): Promise<ExerciseDetail> {
      return {
        exercise: await deps.exercises.get(userId, exerciseId),
        lastSession: await service.lastSession(userId, exerciseId),
        records: await service.records(userId, exerciseId),
        progress: await service.progress(userId, exerciseId, weeks),
      };
    },
  };

  return service;
}

export type StatsService = ReturnType<typeof createStatsService>;
