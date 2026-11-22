import { z } from 'zod';
import { NameSchema } from './common.ts';
import { NewExerciseNoticeSchema } from './exercises.ts';
import { RpeSchema } from './sets.ts';

export const RoutineExerciseInputSchema = z.object({
  exercise: NameSchema,
  targetSets: z.number().int().min(1).max(20).optional(),
  /** Free text: "5", "8-12", "AMRAP". */
  targetReps: z.string().trim().max(40).optional(),
  targetRpe: RpeSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const SaveRoutineSchema = z.object({
  name: NameSchema,
  notes: z.string().trim().max(2000).optional(),
  /** What changed and why. Recorded with the new version. */
  changeNote: z.string().trim().max(500).optional(),
  /** Order in the rotation (lowest first). Kept as-is when omitted for an existing routine. */
  position: z.number().int().min(0).optional(),
  exercises: z.array(RoutineExerciseInputSchema).min(1),
});
export type SaveRoutine = z.input<typeof SaveRoutineSchema>;

export const RoutineExerciseSchema = z.object({
  exerciseId: z.number().int(),
  exerciseName: z.string(),
  position: z.number().int(),
  targetSets: z.number().int().nullable(),
  targetReps: z.string().nullable(),
  targetRpe: z.number().nullable(),
  notes: z.string().nullable(),
});

export const RoutineVersionSchema = z.object({
  id: z.number().int(),
  version: z.number().int(),
  notes: z.string().nullable(),
  changeNote: z.string().nullable(),
  createdAt: z.iso.datetime(),
  exercises: z.array(RoutineExerciseSchema),
});
export type RoutineVersion = z.infer<typeof RoutineVersionSchema>;

export const RoutineSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  position: z.number().int(),
  archived: z.boolean(),
  current: RoutineVersionSchema,
});
export type Routine = z.infer<typeof RoutineSchema>;

/** A routine with every version, newest first. */
export const RoutineHistorySchema = RoutineSchema.extend({
  versions: z.array(RoutineVersionSchema),
});
export type RoutineHistory = z.infer<typeof RoutineHistorySchema>;

export const SaveRoutineResultSchema = z.object({
  routine: RoutineSchema,
  /** False when the plan was identical to the current version (no new version saved). */
  changed: z.boolean(),
  newExercises: z.array(NewExerciseNoticeSchema),
});
export type SaveRoutineResult = z.infer<typeof SaveRoutineResultSchema>;
