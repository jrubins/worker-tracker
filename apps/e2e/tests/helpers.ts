import type { APIRequestContext } from '@playwright/test';
import { expect } from './fixtures.ts';

/** Calendar date `days` from today in the app's time zone (America/Chicago), YYYY-MM-DD. */
export function daysFromToday(days: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(
    new Date(),
  );
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Logs a workout through the API as the test's user; returns the response body. */
export async function logWorkout(api: APIRequestContext, body: object): Promise<unknown> {
  const res = await api.post('/workouts', { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

export async function saveRoutine(api: APIRequestContext, body: object): Promise<unknown> {
  const res = await api.post('/routines', { data: body });
  expect(res.status(), await res.text()).toBe(200);
  return res.json();
}
