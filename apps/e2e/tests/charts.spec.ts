import { expect, test, type Page } from './fixtures.ts';
import { daysFromToday, logWorkout } from './helpers.ts';

/**
 * Hovers the middle of a chart, near the right edge, where the newest data is. The tooltip
 * that opens is a live region (role "status") named by its text.
 */
async function hoverNewest(page: Page, name: string) {
  const box = await page.getByRole('img', { name }).boundingBox();
  if (!box) throw new Error(`No chart named ${name}`);
  await page.mouse.move(box.x + box.width - 40, box.y + box.height / 2);
}

test('chart tooltips name what they show', async ({ page, api, capture }) => {
  const exerciseId = (
    (await logWorkout(api, {
      date: daysFromToday(-7),
      exercises: [{ exercise: 'Squat', sets: [{ weightLb: 225, reps: 5 }] }],
    })) as { workout: { sets: { exerciseId: number }[] } }
  ).workout.sets[0]?.exerciseId;
  await logWorkout(api, {
    exercises: [
      {
        exercise: 'Squat',
        sets: [
          { weightLb: 235, reps: 5 },
          { weightLb: 235, reps: 5 },
        ],
      },
    ],
  });

  await page.goto('/');
  await hoverNewest(page, 'Weekly volume');
  const weekly = page.getByRole('status', { name: /Week of/ });
  await expect(weekly).toContainText('Volume');
  await expect(weekly).toContainText('2,350 lb');
  await expect(weekly).toContainText('Working sets');
  await capture('weekly-volume-tooltip');

  await page.goto(`/exercises/${exerciseId}`);
  await hoverNewest(page, 'Estimated one-rep max per session');
  const progress = page.getByRole('status', { name: /Est. 1RM/ });
  await expect(progress).toContainText('Est. 1RM');
  await expect(progress).toContainText('Top set');
  await expect(progress).toContainText('235 lb × 5');
  await capture('progress-tooltip');
});
