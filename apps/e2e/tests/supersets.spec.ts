import { expect, test } from './fixtures.ts';
import { logWorkout, saveRoutine } from './helpers.ts';

test('shows a superset logged round by round, and marks one from the page', async ({
  page,
  api,
  capture,
}) => {
  const bench = { exercise: 'Bench Press', superset: 'A' };
  const row = { exercise: 'Barbell Row', superset: 'A' };
  const logged = (await logWorkout(api, {
    exercises: [
      { ...bench, sets: [{ weightLb: 185, reps: 8 }] },
      { ...row, sets: [{ weightLb: 135, reps: 10 }] },
      { ...bench, sets: [{ weightLb: 185, reps: 8 }] },
      { ...row, sets: [{ weightLb: 135, reps: 10 }] },
      { ...bench, sets: [{ weightLb: 185, reps: 7 }] },
      { ...row, sets: [{ weightLb: 135, reps: 9 }] },
      { exercise: 'Hammer Curl', sets: [{ weightLb: 30, reps: 12 }] },
      { exercise: 'Triceps Pushdown', sets: [{ weightLb: 50, reps: 12 }] },
    ],
  })) as { workout: { id: number } };

  await page.goto(`/workouts/${logged.workout.id}`);
  const supersetA = page.getByRole('region', { name: 'Superset A' });
  await expect(supersetA).toContainText('3 rounds');
  const benchCard = supersetA.getByRole('region', { name: 'Bench Press' });
  await expect(benchCard).toContainText('3 working sets');
  await expect(benchCard.getByText('185 lb × 7')).toBeVisible();
  await expect(supersetA.getByRole('region', { name: 'Barbell Row' })).toContainText(
    '3 working sets',
  );
  await capture('workout-superset');

  // The arm work was a superset too.
  await page.getByLabel('Superset for Hammer Curl').selectOption('Superset B');
  await page.getByLabel('Superset for Triceps Pushdown').selectOption('Superset B');
  const supersetB = page.getByRole('region', { name: 'Superset B' });
  await expect(supersetB.getByRole('region', { name: 'Hammer Curl' })).toBeVisible();
  await expect(supersetB.getByRole('region', { name: 'Triceps Pushdown' })).toBeVisible();

  // Saved: still grouped after a reload.
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Superset B' }).getByRole('region', { name: 'Hammer Curl' }),
  ).toBeVisible();
});

test('shows supersets in a routine plan', async ({ page, api, capture }) => {
  const saved = (await saveRoutine(api, {
    name: 'Upper A',
    exercises: [
      { exercise: 'Bench Press', targetSets: 3, targetReps: '8', superset: 'A' },
      { exercise: 'Barbell Row', targetSets: 3, targetReps: '10', superset: 'A' },
      { exercise: 'Lateral Raise', targetSets: 3, targetReps: '15' },
    ],
  })) as { routine: { id: number } };

  await page.goto(`/routines/${saved.routine.id}`);
  const superset = page.getByRole('listitem', { name: 'Superset A' }).first();
  await expect(superset.getByText('A1')).toBeVisible();
  await expect(superset.getByRole('link', { name: 'Barbell Row' })).toBeVisible();
  await capture('routine-superset');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('fits a superset on a phone screen', async ({ page, api, capture }) => {
    const logged = (await logWorkout(api, {
      exercises: [
        {
          exercise: 'Seated Dumbbell Shoulder Press',
          superset: 'A',
          sets: [{ weightLb: 40, reps: 8 }],
        },
        { exercise: 'Chest-supported Row', superset: 'A', sets: [{ weightLb: 50, reps: 12 }] },
      ],
    })) as { workout: { id: number } };
    await page.goto(`/workouts/${logged.workout.id}`);
    await expect(page.getByRole('region', { name: 'Superset A' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await capture('workout-superset-mobile');
  });
});
