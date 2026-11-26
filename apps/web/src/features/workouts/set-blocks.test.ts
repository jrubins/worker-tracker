import type { WorkoutSet } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { workingSet } from './fixtures';
import { groupSets, roundsOf } from './set-blocks';

let nextId = 1;
const set = (exerciseId: number, superset: string | null = null): WorkoutSet => ({
  ...workingSet,
  id: nextId,
  position: nextId++,
  exerciseId,
  exerciseName: `Exercise ${exerciseId}`,
  superset,
});

/** Each block as [superset, [exerciseId, set count]...]. */
const shape = (sets: WorkoutSet[]) =>
  groupSets(sets).map((block) => [
    block.superset,
    block.exercises.map((group) => [group.exerciseId, group.sets.length]),
  ]);

describe('groupSets', () => {
  it('groups consecutive sets of an exercise', () => {
    expect(shape([set(1), set(1), set(2), set(1)])).toEqual([
      [null, [[1, 2]]],
      [null, [[2, 1]]],
      [null, [[1, 1]]],
    ]);
  });

  it('gathers a superset logged round by round under each exercise', () => {
    const sets = [set(9), set(1, 'A'), set(2, 'A'), set(1, 'A'), set(2, 'A'), set(1, 'A')];
    expect(shape(sets)).toEqual([
      [null, [[9, 1]]],
      [
        'A',
        [
          [1, 3],
          [2, 2],
        ],
      ],
    ]);
    expect(roundsOf(groupSets(sets)[1]!)).toBe(3);
  });

  it('keeps separate supersets and plain exercises between them apart', () => {
    expect(
      shape([set(1, 'A'), set(2, 'A'), set(3), set(4, 'B'), set(5, 'B'), set(1, 'A')]),
    ).toEqual([
      [
        'A',
        [
          [1, 2],
          [2, 1],
        ],
      ],
      [null, [[3, 1]]],
      [
        'B',
        [
          [4, 1],
          [5, 1],
        ],
      ],
    ]);
  });
});
