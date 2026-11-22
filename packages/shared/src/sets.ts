import { z } from 'zod';
import { NameSchema } from './common.ts';

/** RPE 1-10 in half steps. */
export const RpeSchema = z.number().min(1).max(10).multipleOf(0.5);

/**
 * A set as logged. Effort can be given as RPE or RIR (reps in reserve); it is stored as RPE,
 * using RPE = 10 - RIR. Weight is pounds: for bodyweight lifts the added load (omit if none).
 */
export const SetInputSchema = z
  .object({
    weightLb: z.number().min(0).max(2000).nullable().optional(),
    reps: z.number().int().min(0).max(1000),
    rpe: RpeSchema.optional(),
    rir: z.number().min(0).max(9).multipleOf(0.5).optional(),
    warmup: z.boolean().default(false),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((set) => set.rpe === undefined || set.rir === undefined, {
    message: 'Give RPE or RIR, not both',
    path: ['rir'],
  });
export type SetInput = z.input<typeof SetInputSchema>;

/** Sets for one exercise, named the way the user says it ("bench", "DB row"). */
export const ExerciseSetsInputSchema = z.object({
  exercise: NameSchema,
  sets: z.array(SetInputSchema).min(1),
});

export const WorkoutSetSchema = z.object({
  id: z.number().int(),
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  position: z.number().int(),
  weightLb: z.number().nullable(),
  reps: z.number().int(),
  rpe: z.number().nullable(),
  warmup: z.boolean(),
  notes: z.string().nullable(),
  /** Estimated one-rep max (Epley); null for warm-ups and sets without load or reps. */
  e1rmLb: z.number().nullable(),
});
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

export const UpdateSetSchema = z
  .object({
    weightLb: z.number().min(0).max(2000).nullable().optional(),
    reps: z.number().int().min(0).max(1000).optional(),
    rpe: RpeSchema.nullable().optional(),
    rir: z.number().min(0).max(9).multipleOf(0.5).optional(),
    warmup: z.boolean().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((set) => set.rpe === undefined || set.rir === undefined, {
    message: 'Give RPE or RIR, not both',
    path: ['rir'],
  });
export type UpdateSet = z.input<typeof UpdateSetSchema>;
