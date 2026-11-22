import type { Db } from '@app/db';
import type {
  Dashboard,
  ExerciseDetail,
  ExerciseProgress,
  LastSession,
  PersonalRecords,
  RecentPr,
  RecordSet,
  WeeklySummary,
  WorkoutSet,
} from '@app/shared';
import { addDays, localDate, weekStart } from '../../lib/training.ts';
import type { ExercisesService } from '../exercises/exercises.service.ts';
import { toWorkoutSet, volumeOf } from '../workouts/workouts.service.ts';

/** A set with the date and workout it belongs to. */
interface DatedSet {
  set: WorkoutSet;
  date: string;
  workoutId: number;
}

const byTime = (a: DatedSet, b: DatedSet) =>
  a.date.localeCompare(b.date) || a.workoutId - b.workoutId || a.set.position - b.set.position;

const asRecord = ({ set, date, workoutId }: DatedSet): RecordSet | null =>
  set.weightLb !== null && set.e1rmLb !== null
    ? { weightLb: set.weightLb, reps: set.reps, e1rmLb: set.e1rmLb, date, workoutId }
    : null;

/** Working sets that carry load and reps: the ones records and estimates are based on. */
const isScored = (entry: DatedSet) => !entry.set.warmup && entry.set.e1rmLb !== null;

function recordsOf(exerciseId: number, exerciseName: string, sets: DatedSet[]): PersonalRecords {
  const scored = sets.filter(isScored);
  const best = (score: (entry: DatedSet) => number) =>
    scored.reduce<DatedSet | null>(
      (top, entry) => (!top || score(entry) > score(top) ? entry : top),
      null,
    );
  const bestE1rm = best((e) => e.set.e1rmLb ?? 0);
  const heaviest = best((e) => (e.set.weightLb ?? 0) * 1000 + e.set.reps);

  const repMaxes: RecordSet[] = [];
  for (let reps = 1; reps <= 12; reps++) {
    const top = scored
      .filter((e) => e.set.reps === reps)
      .reduce<DatedSet | null>(
        (max, e) => (!max || (e.set.weightLb ?? 0) > (max.set.weightLb ?? 0) ? e : max),
        null,
      );
    const record = top && asRecord(top);
    if (record) repMaxes.push(record);
  }

  return {
    exerciseId,
    exerciseName,
    bestE1rm: bestE1rm && asRecord(bestE1rm),
    heaviest: heaviest && asRecord(heaviest),
    repMaxes,
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
      .include('exercise', (e) => e.select('name'))
      .include('workout', (w) => w.select('id', 'date'))
      .all()
      .toArray();
    return rows
      .filter((row) => row.workout !== null)
      .map((row) => ({
        set: toWorkoutSet(row),
        date: row.workout?.date ?? '',
        workoutId: row.workout?.id ?? 0,
      }))
      .sort(byTime);
  };

  const today = () => localDate(deps.timeZone);

  const service = {
    async records(userId: string, exerciseId: number): Promise<PersonalRecords> {
      const exercise = await deps.exercises.get(userId, exerciseId);
      return recordsOf(exercise.id, exercise.name, await datedSets(userId, exerciseId));
    },

    /** Records for every exercise that has scored sets, by best estimated one-rep max. */
    async allRecords(userId: string): Promise<PersonalRecords[]> {
      const sets = await datedSets(userId);
      const byExercise = Map.groupBy(sets, (entry) => entry.set.exerciseId);
      return [...byExercise.values()]
        .flatMap((entries) => {
          const first = entries[0];
          const records = first && recordsOf(first.set.exerciseId, first.set.exerciseName, entries);
          return records?.bestE1rm ? [records] : [];
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
        const working = entries.filter((e) => !e.set.warmup);
        const top = working.reduce<DatedSet | null>(
          (max, e) =>
            !max ||
            (e.set.weightLb ?? 0) > (max.set.weightLb ?? 0) ||
            ((e.set.weightLb ?? 0) === (max.set.weightLb ?? 0) && e.set.reps > max.set.reps)
              ? e
              : max,
          null,
        );
        const e1rms = working.map((e) => e.set.e1rmLb).filter((v) => v !== null);
        const first = entries[0];
        return {
          date: first?.date ?? '',
          workoutId: first?.workoutId ?? 0,
          topSetWeightLb: top?.set.weightLb ?? null,
          topSetReps: top?.set.reps ?? null,
          bestE1rmLb: e1rms.length ? Math.max(...e1rms) : null,
          volumeLb: volumeOf(entries.map((e) => e.set)),
          workingSets: working.length,
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
          workingSets: weekSets.filter((s) => !s.warmup).length,
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
      for (const entry of (await datedSets(userId)).filter(isScored)) {
        const previous = best.get(entry.set.exerciseId) ?? null;
        const e1rm = entry.set.e1rmLb ?? 0;
        if (previous === null || e1rm > previous) {
          best.set(entry.set.exerciseId, e1rm);
          const record = asRecord(entry);
          if (record && entry.date >= since) {
            prs.push({
              ...record,
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
