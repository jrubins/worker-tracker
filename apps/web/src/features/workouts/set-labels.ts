import type { WorkoutSet } from '@app/shared';

/**
 * Names each set of an exercise: sets are numbered in order, and a drop set belongs to the set
 * before it ("drop set after set 3"), so 12, 12, 9 + 3 reads as three sets.
 */
export function labelSets(sets: readonly WorkoutSet[]) {
  let number = 0;
  return sets.map((set) => {
    if (set.setType === 'drop' && number > 0) {
      return { set, label: `drop set after set ${number}`, marker: '↳' };
    }
    number += 1;
    return { set, label: `set ${number}`, marker: String(number) };
  });
}
