import { z } from 'zod';
import { LocalDateSchema } from './common.ts';
import { ExerciseSchema, LoadTypeSchema } from './exercises.ts';
import { WorkoutSetSchema } from './sets.ts';

/** A single best set, with when it happened. */
export const RecordSetSchema = z.object({
  /** As logged (per dumbbell for per_hand, added load for bodyweight_plus; null = none). */
  weightLb: z.number().nullable(),
  reps: z.number().int(),
  /** Null when the set has no estimate (e.g. bodyweight_plus before bodyweight is known). */
  e1rmLb: z.number().nullable(),
  date: LocalDateSchema,
  workoutId: z.number().int(),
});
export type RecordSet = z.infer<typeof RecordSetSchema>;

/** The longest timed set (holds, carries). */
export const LongestHoldSchema = z.object({
  durationSeconds: z.number().int(),
  weightLb: z.number().nullable(),
  date: LocalDateSchema,
  workoutId: z.number().int(),
});
export type LongestHold = z.infer<typeof LongestHoldSchema>;

/**
 * Records count working sets only: warm-ups and drop sets never set one. For bodyweight_plus
 * exercises, weights are the added load ("+10 lb"), and the estimated 1RM needs a known
 * bodyweight.
 */
export const PersonalRecordsSchema = z.object({
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  loadType: LoadTypeSchema,
  /** Highest estimated one-rep max. */
  bestE1rm: RecordSetSchema.nullable(),
  /** Heaviest working set (most reps breaks a tie). */
  heaviest: RecordSetSchema.nullable(),
  /** Most reps in one working set (heavier breaks a tie). */
  mostReps: RecordSetSchema.nullable(),
  /** Heaviest weight for each rep count (1-12), lowest reps first. */
  repMaxes: z.array(RecordSetSchema),
  longestHold: LongestHoldSchema.nullable(),
});
export type PersonalRecords = z.infer<typeof PersonalRecordsSchema>;

export const LastSessionSchema = z.object({
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  workoutId: z.number().int(),
  date: LocalDateSchema,
  sets: z.array(WorkoutSetSchema),
});
export type LastSession = z.infer<typeof LastSessionSchema>;

/** One session's numbers for an exercise. */
export const ProgressPointSchema = z.object({
  date: LocalDateSchema,
  workoutId: z.number().int(),
  topSetWeightLb: z.number().nullable(),
  topSetReps: z.number().int().nullable(),
  bestE1rmLb: z.number().nullable(),
  volumeLb: z.number(),
  workingSets: z.number().int(),
});
export type ProgressPoint = z.infer<typeof ProgressPointSchema>;

export const ExerciseProgressSchema = z.object({
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  points: z.array(ProgressPointSchema),
});
export type ExerciseProgress = z.infer<typeof ExerciseProgressSchema>;

export const WeekSummarySchema = z.object({
  /** Monday of the week. */
  weekStart: LocalDateSchema,
  sessions: z.number().int(),
  workingSets: z.number().int(),
  volumeLb: z.number(),
});
export type WeekSummary = z.infer<typeof WeekSummarySchema>;

export const WeeklySummarySchema = z.object({
  /** Oldest first, ending with the current week. */
  weeks: z.array(WeekSummarySchema),
  /** Consecutive weeks with at least one session, ending this week (or last week). */
  streakWeeks: z.number().int(),
});
export type WeeklySummary = z.infer<typeof WeeklySummarySchema>;

/** A set that beat the previous best estimated one-rep max for its exercise. */
export const RecentPrSchema = RecordSetSchema.extend({
  e1rmLb: z.number(),
  loadType: LoadTypeSchema,
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  previousBestE1rmLb: z.number().nullable(),
});
export type RecentPr = z.infer<typeof RecentPrSchema>;

export const DashboardSchema = z.object({
  today: LocalDateSchema,
  weekly: WeeklySummarySchema,
  recentPrs: z.array(RecentPrSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const ExerciseDetailSchema = z.object({
  exercise: ExerciseSchema,
  lastSession: LastSessionSchema.nullable(),
  records: PersonalRecordsSchema,
  progress: ExerciseProgressSchema,
});
export type ExerciseDetail = z.infer<typeof ExerciseDetailSchema>;

export const ProgressQuerySchema = z.object({
  /** How far back to look. */
  weeks: z.coerce.number().int().min(1).max(520).default(26),
});

export const WeeklyQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(104).default(8),
});
