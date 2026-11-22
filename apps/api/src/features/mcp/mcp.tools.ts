import {
  AddSetsSchema,
  CreateExerciseSchema,
  LogWorkoutSchema,
  MergeExercisesSchema,
  NameSchema,
  SaveRoutineSchema,
  UpdateExerciseSchema,
  UpdateSetSchema,
} from '@app/shared';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { ExercisesService } from '../exercises/exercises.service.ts';
import type { RoutinesService } from '../routines/routines.service.ts';
import type { StatsService } from '../stats/stats.service.ts';
import type { WorkoutsService } from '../workouts/workouts.service.ts';

export interface McpServices {
  exercises: ExercisesService;
  routines: RoutinesService;
  workouts: WorkoutsService;
  stats: StatsService;
}

/** Shown to the assistant when it connects: how this server fits a training conversation. */
const INSTRUCTIONS = `
Workout tracker for one lifter. Weights are pounds (lb). Effort is RPE 1-10; you may log RIR instead (stored as RPE = 10 - RIR).
Dates are the user's local calendar dates (YYYY-MM-DD); omit a date to use today.

Planning a session: call list_routines (the user rotates through them), then get_last_session for the key lifts and get_personal_records to pick weights. Adjust to how the user feels; only call save_routine when they want the plan itself changed (always give a changeNote saying what changed and why).

Logging: log_workout for a whole session (also for importing past sessions with their date), or log_workout with no exercises followed by add_sets to log live. Use exercise names as the user says them; the server resolves names and aliases. When a name is not recognized, the sets are still logged under a new *unconfirmed* exercise and the response lists similar existing exercises: mention it in a short line and keep going. At the end of the workout, call review_new_exercises and ask the user, for each one, whether to merge it into a suggested match (merge_exercises) or keep it (confirm_exercise).

Corrections: get_workout, then update_set / delete_set / delete_workout.
`.trim();

/** Tool results as pretty JSON text (what the assistant reads). */
const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const ExerciseRef = z.object({
  exercise: NameSchema.describe('Exercise name or alias, as the user says it'),
});

/**
 * The tools Claude uses, all acting as `userId`. A fresh server is built per request (stateless
 * Streamable HTTP), so the user is fixed for its lifetime. Inputs reuse the shared Zod schemas.
 */
export function createMcpServer(services: McpServices, userId: string): McpServer {
  const { exercises, routines, workouts, stats } = services;
  const server = new McpServer(
    { name: 'workout-tracker', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );
  const readOnly = { readOnlyHint: true };

  // --- Routines --------------------------------------------------------------------------
  server.registerTool(
    'list_routines',
    {
      title: 'List routines',
      description:
        'The routines in rotation order, each with its current plan (exercises and targets).',
      annotations: readOnly,
    },
    async () => json(await routines.list(userId)),
  );

  server.registerTool(
    'get_routine',
    {
      title: 'Get routine history',
      description:
        'One routine with every saved version of its plan, newest first, and why each changed.',
      inputSchema: z.object({ name: NameSchema }),
      annotations: readOnly,
    },
    async ({ name }) => {
      const routine = await routines.findByName(userId, name);
      if (!routine) throw new Error(`No routine named "${name}". Call list_routines to see them.`);
      return json(routine);
    },
  );

  server.registerTool(
    'save_routine',
    {
      title: 'Save routine',
      description:
        'Create a routine or save a changed plan as a new version (old versions are kept). Pass the full exercise list. Not for one-day tweaks: those are just what gets logged.',
      inputSchema: SaveRoutineSchema,
    },
    async (input) => json(await routines.save(userId, input)),
  );

  // --- History and progress --------------------------------------------------------------
  server.registerTool(
    'get_last_session',
    {
      title: 'Last session for an exercise',
      description:
        'The most recent sets of an exercise (weights, reps, RPE): use it to plan today.',
      inputSchema: ExerciseRef,
      annotations: readOnly,
    },
    async ({ exercise }) => {
      const found = await exercises.require(userId, exercise);
      return json(
        (await stats.lastSession(userId, found.id)) ?? {
          message: `No sets logged for ${found.name} yet.`,
        },
      );
    },
  );

  server.registerTool(
    'get_personal_records',
    {
      title: 'Personal records',
      description:
        'Best estimated 1RM, heaviest set and rep maxes (1-12 reps) for one exercise, or for every exercise when none is given.',
      inputSchema: z.object({ exercise: NameSchema.optional() }),
      annotations: readOnly,
    },
    async ({ exercise }) => {
      if (!exercise) return json(await stats.allRecords(userId));
      const found = await exercises.require(userId, exercise);
      return json(await stats.records(userId, found.id));
    },
  );

  server.registerTool(
    'get_progress',
    {
      title: 'Progress for an exercise',
      description:
        'Per-session top set, best estimated 1RM and volume for an exercise over recent weeks.',
      inputSchema: ExerciseRef.extend({ weeks: z.number().int().min(1).max(520).default(26) }),
      annotations: readOnly,
    },
    async ({ exercise, weeks }) => {
      const found = await exercises.require(userId, exercise);
      return json(await stats.progress(userId, found.id, weeks));
    },
  );

  server.registerTool(
    'get_weekly_summary',
    {
      title: 'Weekly summary',
      description:
        'Sessions, working sets and volume per week (Monday start), and the current streak.',
      inputSchema: z.object({ weeks: z.number().int().min(1).max(104).default(8) }),
      annotations: readOnly,
    },
    async ({ weeks }) => json(await stats.weekly(userId, weeks)),
  );

  server.registerTool(
    'get_recent_workouts',
    {
      title: 'Recent workouts',
      description: 'Recent sessions, newest first, summarized (routine, exercises, sets, volume).',
      inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(10) }),
      annotations: readOnly,
    },
    async ({ limit }) => json(await workouts.list(userId, limit)),
  );

  server.registerTool(
    'get_workout',
    {
      title: 'Get workout',
      description: 'One session with every set (including set ids, for corrections).',
      inputSchema: z.object({ workoutId: z.number().int().positive() }),
      annotations: readOnly,
    },
    async ({ workoutId }) => json(await workouts.get(userId, workoutId)),
  );

  // --- Logging ---------------------------------------------------------------------------
  server.registerTool(
    'log_workout',
    {
      title: 'Log workout',
      description:
        'Log a session: all of it at once, or start one with no exercises and add sets as you go with add_sets. Give `date` to import a past session. Unrecognized exercise names come back in `newExercises` with similar matches.',
      inputSchema: LogWorkoutSchema,
    },
    async (input) => json(await workouts.log(userId, input)),
  );

  server.registerTool(
    'add_sets',
    {
      title: 'Add sets',
      description:
        'Append sets to a workout (live logging). Unrecognized names come back in `newExercises`.',
      inputSchema: AddSetsSchema,
    },
    async (input) => json(await workouts.addSets(userId, input)),
  );

  server.registerTool(
    'update_set',
    {
      title: 'Fix a set',
      description: 'Correct a logged set (weight, reps, RPE or RIR, warm-up flag, notes).',
      inputSchema: z.object({ setId: z.number().int().positive(), changes: UpdateSetSchema }),
    },
    async ({ setId, changes }) => json(await workouts.updateSet(userId, setId, changes)),
  );

  server.registerTool(
    'delete_set',
    {
      title: 'Delete a set',
      description: 'Remove a logged set.',
      inputSchema: z.object({ setId: z.number().int().positive() }),
      annotations: { destructiveHint: true },
    },
    async ({ setId }) => {
      await workouts.deleteSet(userId, setId);
      return json({ deleted: { setId } });
    },
  );

  server.registerTool(
    'delete_workout',
    {
      title: 'Delete a workout',
      description: 'Remove a whole session and its sets. Confirm with the user first.',
      inputSchema: z.object({ workoutId: z.number().int().positive() }),
      annotations: { destructiveHint: true },
    },
    async ({ workoutId }) => {
      await workouts.deleteWorkout(userId, workoutId);
      return json({ deleted: { workoutId } });
    },
  );

  // --- Exercises -------------------------------------------------------------------------
  server.registerTool(
    'list_exercises',
    {
      title: 'List exercises',
      description:
        'Every exercise with its aliases; unconfirmed ones were created from unrecognized names.',
      annotations: readOnly,
    },
    async () => json(await exercises.list(userId)),
  );

  server.registerTool(
    'create_exercise',
    {
      title: 'Create exercise',
      description: 'Add an exercise explicitly (logging creates unknown ones automatically).',
      inputSchema: CreateExerciseSchema,
    },
    async (input) => json(await exercises.create(userId, input)),
  );

  server.registerTool(
    'update_exercise',
    {
      title: 'Update exercise',
      description:
        'Rename an exercise, add aliases (other names for it), or set equipment and notes.',
      inputSchema: z.object({
        exerciseId: z.number().int().positive(),
        changes: UpdateExerciseSchema,
      }),
    },
    async ({ exerciseId, changes }) => json(await exercises.update(userId, exerciseId, changes)),
  );

  server.registerTool(
    'review_new_exercises',
    {
      title: 'Review new exercises',
      description:
        'Exercises created from unrecognized names, each with likely matches. Call at the end of a workout and ask the user: merge into a match, or keep as new.',
      annotations: readOnly,
    },
    async () => json(await exercises.listUnconfirmed(userId)),
  );

  server.registerTool(
    'confirm_exercise',
    {
      title: 'Keep a new exercise',
      description: 'Mark an unconfirmed exercise as a genuinely new exercise.',
      inputSchema: z.object({ exerciseId: z.number().int().positive() }),
    },
    async ({ exerciseId }) => json(await exercises.confirm(userId, exerciseId)),
  );

  server.registerTool(
    'merge_exercises',
    {
      title: 'Merge exercises',
      description:
        'Fold one exercise into another: its sets and planned entries move over and its name becomes an alias, so it is recognized next time.',
      inputSchema: MergeExercisesSchema,
      annotations: { destructiveHint: true },
    },
    async ({ fromExerciseId, intoExerciseId }) =>
      json(await exercises.merge(userId, fromExerciseId, intoExerciseId)),
  );

  return server;
}
