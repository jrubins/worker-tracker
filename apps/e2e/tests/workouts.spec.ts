import { expect, test } from './fixtures.ts';
import { logWorkout } from './helpers.ts';

const session = {
  date: '2026-11-20',
  notes: 'Felt strong',
  exercises: [
    {
      exercise: 'Bench Press',
      sets: [
        { weightLb: 135, reps: 10, warmup: true },
        { weightLb: 225, reps: 5, rpe: 8 },
      ],
    },
  ],
};

test('history lists workouts and opens one', async ({ page, api, capture }) => {
  await logWorkout(api, session);

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await capture('history');
  await page.getByRole('link', { name: /Fri, Nov 20/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Fri, Nov 20' })).toBeVisible();
  await expect(page.getByText('Felt strong')).toBeVisible();
  const bench = page.getByRole('region', { name: 'Bench Press' });
  await expect(bench.getByText('225 lb × 5 @ RPE 8')).toBeVisible();
  await expect(bench.getByText('Warm-up')).toBeVisible();
  await capture('workout');
});

test('fixes a mistyped set and deletes a set', async ({ page, api, capture }) => {
  const logged = (await logWorkout(api, session)) as { workout: { id: number } };
  await page.goto(`/workouts/${logged.workout.id}`);

  await page.getByRole('button', { name: 'Edit set 2' }).click();
  const weight = page.getByLabel('Weight (lb)');
  await weight.fill('230');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('230 lb × 5 @ RPE 8')).toBeVisible();

  // Deleting asks first.
  await page.getByRole('button', { name: 'Delete set 1' }).click();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByText('135 lb × 10')).toBeVisible();
  await page.getByRole('button', { name: 'Delete set 1' }).click();
  await capture('delete-set-confirm');
  await page
    .getByRole('group', { name: 'Delete set 1?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByText('135 lb × 10')).toHaveCount(0);
});

test('deletes a workout after confirming', async ({ page, api }) => {
  const logged = (await logWorkout(api, session)) as { workout: { id: number } };
  await page.goto(`/workouts/${logged.workout.id}`);

  await page.getByRole('button', { name: 'Delete workout…' }).click();
  await page.getByRole('button', { name: 'Delete workout', exact: true }).click();

  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText('No workouts yet.', { exact: false })).toBeVisible();
});
