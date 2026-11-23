import { randomUUID } from 'node:crypto';
import { DevTokenResponseSchema } from '@app/shared';
import { API_URL } from '../playwright.config.ts';
import { expect, test, unique } from './fixtures.ts';

test.describe('signed out', () => {
  test.use({ signedIn: false });

  test('shows the sign-in screen, then the app after signing in', async ({ page, capture }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await capture('sign-in');

    await page.getByLabel('User ID').fill(`e2e-signin-${randomUUID()}`);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();

    // The session is an HttpOnly cookie on the web app's origin, so it survives a reload.
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'wt_dev_session')?.httpOnly).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  });
});

test('signs out', async ({ page, user }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menu').getByText(user.userId)).toBeVisible();

  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  // Signed out for good: a reload doesn't bring the session back.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test("doesn't show other users' workouts", async ({ page, api, playwright }) => {
  // Another user's workout, logged through the API as that user.
  const other = await playwright.request.newContext({ baseURL: API_URL });
  const signIn = await other.post('/auth/dev-token', {
    data: { userId: `e2e-other-${randomUUID()}` },
  });
  const { token } = DevTokenResponseSchema.parse(await signIn.json());
  const foreign = unique('Foreign Lift');
  await other.post('/workouts', {
    data: { exercises: [{ exercise: foreign, sets: [{ reps: 5 }] }] },
    headers: { Authorization: `Bearer ${token}` },
  });
  await other.dispose();
  // And one of our own.
  const mine = unique('My Lift');
  await api.post('/workouts', { data: { exercises: [{ exercise: mine, sets: [{ reps: 5 }] }] } });

  await page.goto('/exercises');

  await expect(page.getByText(mine)).toBeVisible();
  await expect(page.getByText(foreign)).toHaveCount(0);
});
