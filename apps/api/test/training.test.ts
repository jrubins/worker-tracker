import { describe, expect, it } from 'vitest';
import { nameKey, nameSimilarity, sameExerciseName } from '../src/lib/exercise-names.ts';
import {
  addDays,
  bodyweightOn,
  effortAsRpe,
  estimateOneRepMax,
  localDate,
  setMetrics,
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

describe('set metrics', () => {
  const set = {
    setType: 'working',
    loadType: 'total',
    weightLb: 100,
    reps: 10,
    bodyweightLb: null,
  } as const;

  it('counts total load once and per-hand load twice', () => {
    expect(setMetrics(set)).toEqual({ loadLb: 100, volumeLb: 1000, e1rmLb: 133.3, counts: true });
    expect(setMetrics({ ...set, loadType: 'per_hand', weightLb: 30 })).toEqual({
      loadLb: 30, // estimates stay per dumbbell
      volumeLb: 600,
      e1rmLb: 40,
      counts: true,
    });
  });

  it('adds bodyweight for bodyweight_plus, and estimates nothing without it', () => {
    const pullUp = { ...set, loadType: 'bodyweight_plus', weightLb: 10 } as const;
    expect(setMetrics({ ...pullUp, bodyweightLb: 180 })).toEqual({
      loadLb: 190,
      volumeLb: 1900,
      e1rmLb: 253.3,
      counts: true,
    });
    expect(setMetrics(pullUp)).toEqual({ loadLb: null, volumeLb: 100, e1rmLb: null, counts: true });
    expect(setMetrics({ ...pullUp, weightLb: null, bodyweightLb: 180 }).loadLb).toBe(180);
  });

  it('gives warm-ups nothing and drops volume only', () => {
    expect(setMetrics({ ...set, setType: 'warmup' })).toEqual({
      loadLb: 100,
      volumeLb: 0,
      e1rmLb: null,
      counts: false,
    });
    expect(setMetrics({ ...set, setType: 'drop', reps: 3 })).toEqual({
      loadLb: 100,
      volumeLb: 300,
      e1rmLb: null,
      counts: false,
    });
  });

  it('gives timed sets no volume or estimate', () => {
    expect(setMetrics({ ...set, weightLb: null, reps: null })).toEqual({
      loadLb: null,
      volumeLb: 0,
      e1rmLb: null,
      counts: true,
    });
  });

  it('uses the nearest logged bodyweight', () => {
    const logged = [
      { date: '2026-03-01', bodyweightLb: 180 },
      { date: '2026-06-01', bodyweightLb: 175 },
    ];
    expect(bodyweightOn(logged, '2026-04-15')).toBe(180); // latest before
    expect(bodyweightOn(logged, '2026-06-01')).toBe(175); // same day
    expect(bodyweightOn(logged, '2026-01-10')).toBe(180); // before the first: the earliest
    expect(bodyweightOn([], '2026-01-10')).toBeNull();
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
