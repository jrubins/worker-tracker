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
});
