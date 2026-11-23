/** Training maths and calendar helpers. Pure functions: no database, no clock unless passed. */
import type { LoadType, SetType } from '@app/shared';

/** Estimated one-rep max (Epley). Null when it isn't meaningful. */
export function estimateOneRepMax(weightLb: number | null, reps: number): number | null {
  if (weightLb === null || weightLb <= 0 || reps < 1) return null;
  const e1rm = reps === 1 ? weightLb : weightLb * (1 + reps / 30);
  return Math.round(e1rm * 10) / 10;
}

export interface SetFacts {
  setType: SetType;
  loadType: LoadType;
  /** As logged: per dumbbell for per_hand, the added load for bodyweight_plus. */
  weightLb: number | null;
  reps: number | null;
  /** The user's bodyweight for this set's workout, when known. */
  bodyweightLb: number | null;
}

/**
 * What a set counts for:
 * - `loadLb`: the load estimates use. The weight for total and per_hand (per dumbbell); for
 *   bodyweight_plus, bodyweight plus the added weight (null while bodyweight is unknown).
 * - `volumeLb`: weight × reps; both hands for per_hand; bodyweight + added for
 *   bodyweight_plus (just the added load while bodyweight is unknown). Warm-ups and timed
 *   sets add none; drop sets do.
 * - `e1rmLb`: only working sets with load and reps: never warm-ups or drops.
 * - `counts`: whether it is a set of its own (working sets; a drop continues the set before).
 */
export function setMetrics(set: SetFacts): {
  loadLb: number | null;
  volumeLb: number;
  e1rmLb: number | null;
  counts: boolean;
} {
  const added = set.weightLb ?? 0;
  const loadLb =
    set.loadType === 'bodyweight_plus'
      ? set.bodyweightLb === null
        ? null
        : set.bodyweightLb + added
      : set.weightLb;
  const reps = set.reps ?? 0;
  const perRep =
    set.loadType === 'per_hand'
      ? added * 2
      : set.loadType === 'bodyweight_plus'
        ? (set.bodyweightLb ?? 0) + added
        : added;
  return {
    loadLb,
    volumeLb: set.setType === 'warmup' ? 0 : Math.round(perRep * reps * 10) / 10,
    e1rmLb:
      set.setType === 'working' && set.reps !== null ? estimateOneRepMax(loadLb, set.reps) : null,
    counts: set.setType === 'working',
  };
}

/**
 * The bodyweight to use on a date, from the bodyweights logged with workouts: the latest on or
 * before that date, else the earliest after it (so sessions logged before the first weigh-in
 * still get an estimate), else null.
 */
export function bodyweightOn(
  logged: readonly { date: string; bodyweightLb: number }[],
  date: string,
): number | null {
  let before: { date: string; bodyweightLb: number } | null = null;
  let after: { date: string; bodyweightLb: number } | null = null;
  for (const entry of logged) {
    if (entry.date <= date) {
      if (!before || entry.date >= before.date) before = entry;
    } else if (!after || entry.date < after.date) {
      after = entry;
    }
  }
  return (before ?? after)?.bodyweightLb ?? null;
}

/** Effort is stored as RPE; RIR input is converted with RPE = 10 - RIR. */
export function effortAsRpe(input: { rpe?: number | null; rir?: number }): number | null {
  if (input.rpe !== undefined && input.rpe !== null) return input.rpe;
  if (input.rir !== undefined) return Math.max(1, 10 - input.rir);
  return null;
}

/** Today's calendar date (YYYY-MM-DD) in a time zone, e.g. America/Chicago. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds days to a calendar date. */
export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

/** The Monday on or before a calendar date (weeks run Monday to Sunday). */
export function weekStart(date: string): string {
  const d = toUtcDate(date);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
}
