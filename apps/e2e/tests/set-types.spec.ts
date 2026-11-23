import { expect, test } from './fixtures.ts';
import { logWorkout } from './helpers.ts';

/** Creates an exercise through the API; returns its id. */
async function createExercise(
  api: Parameters<typeof logWorkout>[0],
  body: object,
): Promise<number> {
  const res = await api.post('/exercises', { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

test('shows drop sets, per-hand, weighted bodyweight and timed sets', async ({
  page,
  api,
  capture,
}) => {
  await createExercise(api, { name: 'Hammer Curl', equipment: 'dumbbell' });
  await createExercise(api, { name: 'Pull-up', equipment: 'bodyweight' });
  const logged = (await logWorkout(api, {
    date: '2026-11-19',
    bodyweightLb: 180,
    exercises: [
      {
        exercise: 'Hammer Curl',
        sets: [
          { weightLb: 35, reps: 12 },
          { weightLb: 35, reps: 9 },
          { weightLb: 20, reps: 4, setType: 'drop' },
        ],
      },
      { exercise: 'Pull-up', sets: [{ reps: 10 }, { weightLb: 10, reps: 6 }] },
      { exercise: 'Plank', sets: [{ durationSeconds: 90 }] },
    ],
  })) as { workout: { id: number } };

  await page.goto(`/workouts/${logged.workout.id}`);
  await expect(page.getByText('180 lb bodyweight')).toBeVisible();

  const curls = page.getByRole('region', { name: 'Hammer Curl' });
  await expect(curls.getByText('35 lb ea × 12')).toBeVisible();
  await expect(curls.getByText('2 working sets')).toBeVisible(); // the drop isn't a set
  await expect(curls.getByRole('button', { name: 'Edit drop set after set 2' })).toBeVisible();
  await expect(curls.getByText('Drop set')).toBeVisible();

  const pullUps = page.getByRole('region', { name: 'Pull-up' });
  await expect(pullUps.getByText('BW + 10 lb × 6')).toBeVisible();
  // 180 + 10 lb for 6 reps: 190 × (1 + 6/30) = 228, below 10 bodyweight reps (240).
  await expect(pullUps.getByText('best e1RM 240 lb')).toBeVisible();

  await expect(page.getByRole('region', { name: 'Plank' }).getByText('1:30')).toBeVisible();
  await capture('workout-set-types');

  // Mark the last working curl set as a drop set from the editor.
  await curls.getByRole('button', { name: 'Edit set 2' }).click();
  await page.getByLabel('Set type').selectOption('Drop set');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(curls.getByText('1 working set')).toBeVisible();
});

test('saves reference links on an exercise', async ({ page, api, capture }) => {
  const id = await createExercise(api, { name: 'Romanian Deadlift', equipment: 'barbell' });
  await page.goto(`/exercises/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Romanian Deadlift' })).toBeVisible();
  await expect(page.getByText('No references yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Add link' }).click();
  await page.getByLabel('Web address').fill('https://www.youtube.com/watch?v=rdl');
  await page.getByLabel('Label (optional)').fill('RDL form');
  await page.getByRole('button', { name: 'Save link' }).click();

  const link = page.getByRole('link', { name: /RDL form/ });
  await expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=rdl');
  await capture('exercise-links');

  // Saved on the server: still there after a reload.
  await page.reload();
  await expect(page.getByRole('link', { name: /RDL form/ })).toBeVisible();
  await page.getByRole('button', { name: 'Remove RDL form' }).click();
  await expect(page.getByText('No references yet.')).toBeVisible();
});

test('shows rep records for weighted bodyweight lifts', async ({ page, api }) => {
  const id = await createExercise(api, { name: 'Dip', equipment: 'bodyweight' });
  await logWorkout(api, {
    exercises: [{ exercise: 'Dip', sets: [{ reps: 12 }, { weightLb: 25, reps: 6 }] }],
  });
  await page.goto(`/exercises/${id}`);
  await expect(page.getByText('Weights are added to bodyweight')).toBeVisible();
  await expect(page.getByText('Most added weight', { exact: true }).locator('..')).toContainText(
    '25 lb',
  );
  await expect(page.getByRole('cell', { name: 'BW + 25 lb' })).toBeVisible();
});
