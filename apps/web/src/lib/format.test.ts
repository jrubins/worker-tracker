import { describe, expect, it } from 'vitest';
import { formatDate, formatLb, formatSet } from './format';

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
});
