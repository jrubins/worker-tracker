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

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** "12.4K" for chart axes. */
export const formatCompact = (value: number) => compact.format(value);

/** "Nov 17 – 23", or "Nov 28 – Dec 4" across months. */
export function formatWeekRange(weekStart: string) {
  const start = asLocalDate(weekStart);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/** Day of month and short weekday, for date blocks: { day: '20', weekday: 'Fri', month: 'Nov' }. */
export function dateParts(date: string) {
  const d = asLocalDate(date);
  return {
    day: String(d.getDate()),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export type Change = { direction: 'up' | 'down' | 'flat'; text: string };

/** Compares this period with the last: "+2 vs last week", or "+8% vs last week" with `percent`. */
export function describeChange(
  current: number,
  previous: number,
  { percent = false, period = 'last week' } = {},
): Change | null {
  if (percent && previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return { direction: 'flat', text: `Same as ${period}` };
  const amount = percent
    ? `${Math.round((Math.abs(diff) / previous) * 100)}%`
    : `${Math.abs(diff)}`;
  return {
    direction: diff > 0 ? 'up' : 'down',
    text: `${diff > 0 ? '+' : '−'}${amount} vs ${period}`,
  };
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The Monday (YYYY-MM-DD) of the week a calendar date falls in. Weeks start Monday. */
export function weekStartOf(date: string) {
  const d = asLocalDate(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
}

/** "This week", "Last week" or "Week of Nov 2", relative to `today`. */
export function weekLabel(weekStart: string, today: Date = new Date()) {
  const current = weekStartOf(isoDate(today));
  if (weekStart === current) return 'This week';
  const previous = asLocalDate(current);
  previous.setDate(previous.getDate() - 7);
  if (weekStart === isoDate(previous)) return 'Last week';
  return `Week of ${formatShortDate(weekStart)}`;
}
