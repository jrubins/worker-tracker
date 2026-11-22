import { z } from 'zod';
import { NameSchema } from './common.ts';

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'other',
] as const;
export const EquipmentSchema = z.enum(EQUIPMENT);
export type Equipment = z.infer<typeof EquipmentSchema>;

export const ExerciseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  aliases: z.array(z.string()),
  equipment: EquipmentSchema.nullable(),
  notes: z.string().nullable(),
  /** False when created automatically from an unrecognized name: review it after the workout. */
  confirmed: z.boolean(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const CreateExerciseSchema = z.object({
  name: NameSchema,
  aliases: z.array(NameSchema).default([]),
  equipment: EquipmentSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateExercise = z.input<typeof CreateExerciseSchema>;

export const UpdateExerciseSchema = z.object({
  name: NameSchema.optional(),
  /** Names to add as aliases. */
  addAliases: z.array(NameSchema).optional(),
  equipment: EquipmentSchema.nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type UpdateExercise = z.input<typeof UpdateExerciseSchema>;

/** An existing exercise that looks like a name that wasn't recognized. */
export const SimilarExerciseSchema = z.object({
  exercise: ExerciseSchema,
  /** 0..1, higher is more similar. */
  similarity: z.number(),
});
export type SimilarExercise = z.infer<typeof SimilarExerciseSchema>;

/** An exercise created while logging because its name wasn't recognized. */
export const NewExerciseNoticeSchema = z.object({
  exercise: ExerciseSchema,
  similar: z.array(SimilarExerciseSchema),
});
export type NewExerciseNotice = z.infer<typeof NewExerciseNoticeSchema>;

export const MergeExercisesSchema = z.object({
  /** The exercise to fold away (usually an unconfirmed one). */
  fromExerciseId: z.number().int().positive(),
  /** The exercise that keeps the sets; `from`'s name becomes its alias. */
  intoExerciseId: z.number().int().positive(),
});
