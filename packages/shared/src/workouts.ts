import { z } from 'zod';
import { LocalDateSchema, NameSchema } from './common.ts';
import { NewExerciseNoticeSchema } from './exercises.ts';
import { ExerciseSetsInputSchema, WorkoutSetSchema } from './sets.ts';

export const WorkoutRoutineRefSchema = z.object({
  routineId: z.number().int(),
  name: z.string(),
  version: z.number().int(),
  routineVersionId: z.number().int(),
});

export const WorkoutSchema = z.object({
  id: z.number().int(),
  date: LocalDateSchema,
  routine: WorkoutRoutineRefSchema.nullable(),
  startedAt: z.iso.datetime().nullable(),
  durationMinutes: z.number().int().nullable(),
  notes: z.string().nullable(),
  sets: z.array(WorkoutSetSchema),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const WorkoutSummarySchema = z.object({
  id: z.number().int(),
  date: LocalDateSchema,
  routineName: z.string().nullable(),
  exerciseNames: z.array(z.string()),
  workingSets: z.number().int(),
  volumeLb: z.number(),
});
export type WorkoutSummary = z.infer<typeof WorkoutSummarySchema>;

export const LogWorkoutSchema = z.object({
  /** Defaults to today in the user's time zone. Use a past date to import old sessions. */
  date: LocalDateSchema.optional(),
  /** The routine this session followed (its current version is linked). */
  routine: NameSchema.optional(),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  durationMinutes: z.number().int().min(0).max(600).optional(),
  notes: z.string().trim().max(2000).optional(),
  exercises: z.array(ExerciseSetsInputSchema).default([]),
});
export type LogWorkout = z.input<typeof LogWorkoutSchema>;

export const AddSetsSchema = z.object({
  workoutId: z.number().int().positive(),
  exercises: z.array(ExerciseSetsInputSchema).min(1),
});
export type AddSets = z.input<typeof AddSetsSchema>;

/** The result of logging: the workout, plus exercises created from unrecognized names. */
export const LogResultSchema = z.object({
  workout: WorkoutSchema,
  newExercises: z.array(NewExerciseNoticeSchema),
});
export type LogResult = z.infer<typeof LogResultSchema>;

export const ListWorkoutsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
