import { describe, expect, it } from 'vitest';
import { nameKey, nameSimilarity, sameExerciseName } from '../src/lib/exercise-names.ts';
import {
  addDays,
  effortAsRpe,
  estimateOneRepMax,
  localDate,
  weekStart,
} from '../src/lib/training.ts';

describe('exercise names', () => {
  it('normalizes case, punctuation, abbreviations and plurals', () => {
    expect(nameKey('DB Rows')).toBe('dumbbell row');
    expect(nameKey('Dumbbell-Row')).toBe('dumbbell row');
    expect(nameKey('OHP')).toBe('overhead press');
    expect(nameKey('Bench Press')).toBe('bench press');
    expect(nameKey('Triceps Pushdowns')).toBe('triceps pushdown');
    expect(nameKey('Military Presses')).toBe('military press');
    expect(nameKey('Cable Crunches')).toBe('cable crunch');
  });

  it('treats word order as the same exercise', () => {
    expect(sameExerciseName('Row - Dumbbell', 'dumbbell row')).toBe(true);
    expect(sameExerciseName('Incline Bench', 'Bench Press')).toBe(false);
  });

  it('scores similar names above unrelated ones', () => {
    expect(nameSimilarity('Incline DB Press', 'Incline Dumbbell Press')).toBe(1);
    expect(nameSimilarity('benhc press', 'Bench Press')).toBeGreaterThanOrEqual(0.5);
    expect(nameSimilarity('Squat', 'Bench Press')).toBeLessThan(0.5);
  });
});

describe('training maths', () => {
  it('estimates one-rep max with Epley', () => {
    expect(estimateOneRepMax(225, 5)).toBe(262.5);
    expect(estimateOneRepMax(315, 1)).toBe(315);
    expect(estimateOneRepMax(null, 10)).toBeNull();
    expect(estimateOneRepMax(135, 0)).toBeNull();
  });

  it('stores effort as RPE, converting RIR', () => {
    expect(effortAsRpe({ rpe: 8.5 })).toBe(8.5);
    expect(effortAsRpe({ rir: 2 })).toBe(8);
    expect(effortAsRpe({})).toBeNull();
  });
});

describe('calendar', () => {
  it("uses the time zone's date, not UTC", () => {
    // 03:00 UTC on Nov 23 is still Nov 22 in Chicago (UTC-6).
    expect(localDate('America/Chicago', new Date('2026-11-23T03:00:00Z'))).toBe('2026-11-22');
  });

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(weekStart('2026-11-16')).toBe('2026-11-16'); // Monday
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});
