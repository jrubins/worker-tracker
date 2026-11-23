import { expect, test } from './fixtures.ts';
import { daysFromToday, logWorkout } from './helpers.ts';

test('exercise page shows last session, records and progress', async ({ page, api, capture }) => {
  for (const [daysAgo, weightLb] of [
    [-21, 275],
    [-14, 285],
    [-7, 295],
  ] as const) {
    await logWorkout(api, {
      date: daysFromToday(daysAgo),
      exercises: [{ exercise: 'Squat', sets: [{ weightLb, reps: 5 }] }],
    });
  }

  await page.goto('/exercises');
  await page.getByRole('link', { name: /Squat/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Squat' })).toBeVisible();
  await expect(page.getByText('295 lb × 5').first()).toBeVisible();
  // Best e1RM: 295 × (1 + 5/30).
  await expect(page.getByText('Best e1RM', { exact: true }).locator('..')).toContainText(
    '344.2 lb',
  );
  await expect(page.getByRole('img', { name: 'Estimated one-rep max per session' })).toBeVisible();
  await capture('exercise');
});

test('flags exercises created from unrecognized names', async ({ page, api }) => {
  await logWorkout(api, {
    exercises: [{ exercise: 'Landmine Press', sets: [{ weightLb: 45, reps: 10 }] }],
  });
  await page.goto('/exercises');
  await expect(page.getByText('New: review with Claude')).toBeVisible();
});

test('searches exercises by name or alias', async ({ page, api }) => {
  await logWorkout(api, {
    exercises: [
      { exercise: 'Squat', sets: [{ weightLb: 225, reps: 5 }] },
      { exercise: 'Bench Press', sets: [{ weightLb: 185, reps: 5 }] },
    ],
  });
  await page.goto('/exercises');
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench');
  await expect(page.getByRole('link', { name: /Bench Press/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Squat/ })).toHaveCount(0);
});
