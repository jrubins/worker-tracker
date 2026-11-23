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

/**
 * How a set's weight turns into load:
 * - `total`: the weight is the load (barbell, machine, goblet squat, glute bridge).
 * - `per_hand`: one dumbbell per hand; weight is per dumbbell, volume counts both hands.
 * - `bodyweight_plus`: pull-ups, dips, push-ups; weight is the added load on top of
 *   bodyweight, and estimates use bodyweight + added load once the bodyweight is known.
 */
export const LOAD_TYPES = ['total', 'per_hand', 'bodyweight_plus'] as const;
export const LoadTypeSchema = z.enum(LOAD_TYPES);
export type LoadType = z.infer<typeof LoadTypeSchema>;

/** A reference for an exercise: a how-to video, an article. */
export const ExerciseLinkSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: 'Enter a web address (http or https)' }),
  label: z.string().trim().min(1).max(120).nullable(),
});
export type ExerciseLink = z.infer<typeof ExerciseLinkSchema>;

const ExerciseLinkInputSchema = ExerciseLinkSchema.extend({
  label: z.string().trim().min(1).max(120).nullable().optional(),
});

export const ExerciseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  aliases: z.array(z.string()),
  equipment: EquipmentSchema.nullable(),
  loadType: LoadTypeSchema,
  notes: z.string().nullable(),
  links: z.array(ExerciseLinkSchema),
  /** False when created automatically from an unrecognized name: review it after the workout. */
  confirmed: z.boolean(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const CreateExerciseSchema = z.object({
  name: NameSchema,
  aliases: z.array(NameSchema).default([]),
  equipment: EquipmentSchema.optional(),
  /** Defaults from equipment: dumbbell → per_hand, bodyweight → bodyweight_plus, else total. */
  loadType: LoadTypeSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  links: z.array(ExerciseLinkInputSchema).max(20).optional(),
});
export type CreateExercise = z.input<typeof CreateExerciseSchema>;

export const UpdateExerciseSchema = z.object({
  name: NameSchema.optional(),
  /** Names to add as aliases. */
  addAliases: z.array(NameSchema).optional(),
  equipment: EquipmentSchema.nullable().optional(),
  loadType: LoadTypeSchema.optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  /** Replaces the exercise's links (send the full list; [] removes them all). */
  links: z.array(ExerciseLinkInputSchema).max(20).optional(),
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
