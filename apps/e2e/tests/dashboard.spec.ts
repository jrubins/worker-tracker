import { expect, test } from './fixtures.ts';
import { daysFromToday, logWorkout } from './helpers.ts';

test('home shows this week, weekly volume and recent PRs', async ({ page, api, capture }) => {
  await logWorkout(api, {
    date: daysFromToday(-7),
    exercises: [{ exercise: 'Squat', sets: [{ weightLb: 275, reps: 5 }] }],
  });
  await logWorkout(api, {
    exercises: [
      {
        exercise: 'Squat',
        sets: [
          { weightLb: 135, reps: 5, warmup: true },
          { weightLb: 295, reps: 5 },
        ],
      },
    ],
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  await expect(page.getByText('Sessions', { exact: true }).locator('..')).toContainText('1');
  await expect(page.getByText('Working sets', { exact: true }).locator('..')).toContainText('1');
  await expect(page.getByText('Volume', { exact: true }).locator('..')).toContainText('1,475 lb');
  await expect(page.getByRole('img', { name: 'Weekly volume' })).toBeVisible();
  // The new best set shows up as a PR, linking to the exercise.
  await expect(page.getByRole('link', { name: 'Squat', exact: true })).toBeVisible();
  await expect(page.getByText('e1RM 344.2 lb')).toBeVisible();
  // The latest workouts are listed under the charts.
  await expect(page.getByRole('region', { name: 'Recent workouts' }).getByRole('link')).toHaveCount(
    2,
  );
  await capture('home');
});

test('switches between dark and light themes', async ({ page, api, capture }) => {
  await logWorkout(api, {
    exercises: [{ exercise: 'Squat', sets: [{ weightLb: 225, reps: 5 }] }],
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Light' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  // The choice survives a reload.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await capture('home-light');
});

test('home is welcoming before anything is logged', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('No training logged in these weeks yet.')).toBeVisible();
  await expect(page.getByText('No new personal records in the last 30 days.')).toBeVisible();
});
