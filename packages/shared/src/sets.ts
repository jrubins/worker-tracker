import { z } from 'zod';
import { NameSchema } from './common.ts';
import { LoadTypeSchema } from './exercises.ts';

/** RPE 1-10 in half steps. */
export const RpeSchema = z.number().min(1).max(10).multipleOf(0.5);

/**
 * `working` sets count toward everything. `warmup` sets count toward nothing. A `drop` set
 * continues the set logged just before it: its reps add volume, but it isn't a set of its own
 * and never sets a record or an estimated 1RM.
 */
export const SET_TYPES = ['working', 'warmup', 'drop'] as const;
export const SetTypeSchema = z.enum(SET_TYPES);
export type SetType = z.infer<typeof SetTypeSchema>;

const RepsSchema = z.number().int().min(0).max(1000);
/** Time under load for holds and carries (planks, dead hangs, a 5-minute core video). */
const DurationSchema = z
  .number()
  .int()
  .min(1)
  .max(24 * 60 * 60);
const RirSchema = z.number().min(0).max(9).multipleOf(0.5);

/**
 * A set as logged. Weight is pounds as the exercise's load type reads it: per dumbbell for
 * `per_hand` exercises, the added load for `bodyweight_plus` ones (omit when none). A set has
 * reps, a duration, or both. Effort can be given as RPE or RIR (reps in reserve); it is stored
 * as RPE, using RPE = 10 - RIR.
 */
export const SetInputSchema = z
  .object({
    weightLb: z.number().min(0).max(2000).nullable().optional(),
    reps: RepsSchema.nullable().optional(),
    durationSeconds: DurationSchema.optional(),
    rpe: RpeSchema.optional(),
    rir: RirSchema.optional(),
    /** Defaults to `working`. */
    setType: SetTypeSchema.optional(),
    /** Shorthand for `setType: "warmup"`. */
    warmup: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((set) => set.rpe === undefined || set.rir === undefined, {
    message: 'Give RPE or RIR, not both',
    path: ['rir'],
  })
  .refine((set) => (set.reps ?? null) !== null || set.durationSeconds !== undefined, {
    message: 'Give reps, durationSeconds, or both',
    path: ['reps'],
  })
  .refine((set) => !set.warmup || set.setType === undefined || set.setType === 'warmup', {
    message: 'warmup: true means setType "warmup"; give one or the other',
    path: ['warmup'],
  });
export type SetInput = z.input<typeof SetInputSchema>;

/** The set type an input means (`warmup: true` is shorthand for `setType: "warmup"`). */
export function setTypeOf(set: { setType?: SetType | undefined; warmup?: boolean | undefined }) {
  return set.setType ?? (set.warmup ? 'warmup' : 'working');
}

/** Sets for one exercise, named the way the user says it ("bench", "DB row"). */
export const ExerciseSetsInputSchema = z.object({
  exercise: NameSchema,
  sets: z.array(SetInputSchema).min(1),
});

export const WorkoutSetSchema = z.object({
  id: z.number().int(),
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  /** The exercise's load type: how `weightLb` reads. */
  loadType: LoadTypeSchema,
  position: z.number().int(),
  setType: SetTypeSchema,
  /** As logged: per dumbbell for per_hand, the added load for bodyweight_plus. */
  weightLb: z.number().nullable(),
  reps: z.number().int().nullable(),
  durationSeconds: z.number().int().nullable(),
  rpe: z.number().nullable(),
  notes: z.string().nullable(),
  /**
   * The load estimates use: the weight (per dumbbell for per_hand), or bodyweight plus the
   * added weight for bodyweight_plus (null while the user's bodyweight is unknown).
   */
  loadLb: z.number().nullable(),
  /** This set's volume: 0 for warm-ups and timed sets, both hands for per_hand. */
  volumeLb: z.number(),
  /** Estimated one-rep max (Epley) of a working set with load and reps; otherwise null. */
  e1rmLb: z.number().nullable(),
});
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

export const UpdateSetSchema = z
  .object({
    weightLb: z.number().min(0).max(2000).nullable().optional(),
    reps: RepsSchema.nullable().optional(),
    durationSeconds: DurationSchema.nullable().optional(),
    rpe: RpeSchema.nullable().optional(),
    rir: RirSchema.optional(),
    setType: SetTypeSchema.optional(),
    /** Shorthand: true means setType "warmup", false means "working". */
    warmup: z.boolean().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((set) => set.rpe === undefined || set.rir === undefined, {
    message: 'Give RPE or RIR, not both',
    path: ['rir'],
  })
  .refine((set) => set.warmup === undefined || set.setType === undefined, {
    message: 'Give setType or warmup, not both',
    path: ['warmup'],
  });
export type UpdateSet = z.input<typeof UpdateSetSchema>;
