import { describe, expect, it } from 'vitest';
import { sampleSets } from './fixtures';
import { labelSets } from './set-labels';

describe('labelSets', () => {
  it('numbers sets in order and hangs drop sets off the set before', () => {
    const benchSets = sampleSets.filter((set) => set.exerciseName === 'Bench Press');
    expect(labelSets(benchSets).map(({ label, marker }) => [label, marker])).toEqual([
      ['set 1', '1'],
      ['set 2', '2'],
      ['set 3', '3'],
      ['drop set after set 3', '↳'],
    ]);
  });
});
