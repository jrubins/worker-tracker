/** Display helpers. Weights are pounds; dates are calendar dates (YYYY-MM-DD). */

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const formatLb = (value: number | null) =>
  value === null ? 'BW' : `${number.format(value)} lb`;

export const formatNumber = (value: number) => number.format(value);

/** "225 lb × 5 @ RPE 8" */
export function formatSet(set: { weightLb: number | null; reps: number; rpe: number | null }) {
  const load = set.weightLb === null ? 'BW' : `${number.format(set.weightLb)} lb`;
  return `${load} × ${set.reps}${set.rpe === null ? '' : ` @ RPE ${number.format(set.rpe)}`}`;
}

/** A calendar date read as local midnight, so it never shifts a day across time zones. */
const asLocalDate = (date: string) => {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** "Fri, Nov 20" (adds the year when it isn't this year). */
export function formatDate(date: string, today: Date = new Date()) {
  const d = asLocalDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** "Nov 16" for week labels. */
export const formatShortDate = (date: string) =>
  asLocalDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
