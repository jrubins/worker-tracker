import { devices } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { logWorkout } from './helpers.ts';

// The dashboard is often checked on a phone: it must fit without sideways scrolling.
test.use({ ...devices['Pixel 7'] });

test('fits a phone screen', async ({ page, api, capture }) => {
  await logWorkout(api, {
    exercises: [{ exercise: 'Squat', sets: [{ weightLb: 225, reps: 5 }] }],
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'horizontal overflow in px').toBe(0);
  await capture('home-mobile');

  // The bottom tab bar navigates; the workout page fits too.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'History' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'History' })).toBeVisible();
  await page.getByRole('link', { name: /Squat/ }).click();
  await expect(page.getByRole('region', { name: 'Squat' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await capture('workout-mobile');
});
