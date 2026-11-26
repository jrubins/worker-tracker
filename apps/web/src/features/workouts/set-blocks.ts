import type { WorkoutSet } from '@app/shared';

/** One exercise's sets within a block, in the order done. */
export interface ExerciseGroup {
  exerciseId: number;
  exerciseName: string;
  sets: WorkoutSet[];
}

/** A plain exercise (`superset` null, one exercise) or a superset of several. */
export interface SetBlock {
  superset: string | null;
  exercises: ExerciseGroup[];
}

/**
 * Groups a workout's sets for display. Consecutive sets of one exercise form a block; exercises
 * sharing a superset label form one block wherever their sets fall, so sets logged round by
 * round (bench, row, bench, row) read as bench's sets, then row's.
 */
export function groupSets(sets: readonly WorkoutSet[]): SetBlock[] {
  const blocks: SetBlock[] = [];
  for (const set of sets) {
    const block = set.superset
      ? blocks.findLast((candidate) => candidate.superset === set.superset)
      : blocks.at(-1)?.superset === null
        ? blocks.at(-1)
        : undefined;
    const group = block?.exercises.find((candidate) => candidate.exerciseId === set.exerciseId);
    if (block && group) {
      group.sets.push(set);
    } else if (block && set.superset) {
      block.exercises.push(exerciseGroup(set));
    } else {
      blocks.push({ superset: set.superset, exercises: [exerciseGroup(set)] });
    }
  }
  return blocks;
}

const exerciseGroup = (set: WorkoutSet): ExerciseGroup => ({
  exerciseId: set.exerciseId,
  exerciseName: set.exerciseName,
  sets: [set],
});

/** Rounds in a superset: the most working sets any of its exercises has. */
export const roundsOf = (block: SetBlock) =>
  Math.max(
    0,
    ...block.exercises.map((group) => group.sets.filter((s) => s.setType === 'working').length),
  );
