/** Training maths and calendar helpers. Pure functions: no database, no clock unless passed. */

/** Estimated one-rep max (Epley). Null when it isn't meaningful. */
export function estimateOneRepMax(weightLb: number | null, reps: number): number | null {
  if (weightLb === null || weightLb <= 0 || reps < 1) return null;
  const e1rm = reps === 1 ? weightLb : weightLb * (1 + reps / 30);
  return Math.round(e1rm * 10) / 10;
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
