import { expect, test } from './fixtures.ts';
import { saveRoutine } from './helpers.ts';

test('routines show the current plan and its history', async ({ page, api, capture }) => {
  const plan = {
    name: 'Push A',
    exercises: [{ exercise: 'Bench Press', targetSets: 4, targetReps: '5', targetRpe: 8 }],
  };
  await saveRoutine(api, plan);
  await saveRoutine(api, {
    ...plan,
    changeNote: 'Added dips for triceps',
    exercises: [...plan.exercises, { exercise: 'Dips', targetSets: 3, targetReps: '8-12' }],
  });

  await page.goto('/routines');
  await expect(page.getByRole('heading', { name: 'Push A' })).toBeVisible();
  await expect(page.getByText('4 × 5 @ RPE 8')).toBeVisible();
  await capture('routines');

  await page.getByRole('link', { name: /Version 2/ }).click();
  await expect(page.getByText('Added dips for triceps')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Version 1/ })).toBeVisible();
  await capture('routine-history');
});
