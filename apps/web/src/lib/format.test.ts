import { describe, expect, it } from 'vitest';
import {
  dateParts,
  describeChange,
  formatCompact,
  formatDate,
  formatLb,
  formatSet,
  formatWeekRange,
  weekLabel,
  weekStartOf,
} from './format';

describe('format', () => {
  it('formats weights and sets', () => {
    expect(formatLb(225)).toBe('225 lb');
    expect(formatLb(null)).toBe('BW');
    expect(formatSet({ weightLb: 225, reps: 5, rpe: 8.5 })).toBe('225 lb × 5 @ RPE 8.5');
    expect(formatSet({ weightLb: null, reps: 10, rpe: null })).toBe('BW × 10');
  });

  it('formats calendar dates without shifting the day', () => {
    expect(formatDate('2026-11-20', new Date(2026, 0, 1))).toBe('Fri, Nov 20');
    expect(formatDate('2025-01-03', new Date(2026, 0, 1))).toBe('Fri, Jan 3, 2025');
  });

  it('formats week ranges and date blocks', () => {
    expect(formatWeekRange('2026-11-16')).toBe('Nov 16 – 22');
    expect(formatWeekRange('2026-11-30')).toBe('Nov 30 – Dec 6');
    expect(dateParts('2026-11-20')).toEqual({ day: '20', weekday: 'Fri', month: 'Nov' });
    expect(formatCompact(12400)).toBe('12.4K');
  });

  it('describes changes from the previous period', () => {
    expect(describeChange(3, 1)).toEqual({ direction: 'up', text: '+2 vs last week' });
    expect(describeChange(1, 3)).toEqual({ direction: 'down', text: '−2 vs last week' });
    expect(describeChange(2, 2)).toEqual({ direction: 'flat', text: 'Same as last week' });
    expect(describeChange(1080, 1000, { percent: true })).toEqual({
      direction: 'up',
      text: '+8% vs last week',
    });
    expect(describeChange(500, 0, { percent: true })).toBeNull();
  });

  it('finds Monday-start weeks and labels them', () => {
    expect(weekStartOf('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(weekStartOf('2026-11-16')).toBe('2026-11-16'); // Monday
    const today = new Date(2026, 10, 20);
    expect(weekLabel('2026-11-16', today)).toBe('This week');
    expect(weekLabel('2026-11-09', today)).toBe('Last week');
    expect(weekLabel('2026-11-02', today)).toBe('Week of Nov 2');
  });
});
