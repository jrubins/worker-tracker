import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SignInScreen } from './sign-in-screen';

const meta = {
  title: 'Auth/SignInScreen',
  component: SignInScreen,
  parameters: { layout: 'fullscreen' },
  args: { onSignIn: fn(async () => {}) },
} satisfies Meta<typeof SignInScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Production: a single button that redirects to WorkOS AuthKit. */
export const WorkOS: Story = { args: { provider: 'workos' } };

/** Development without WorkOS: sign in as any user ID. */
export const DevSignIn: Story = {
  args: { provider: 'dev' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('User ID');
    await userEvent.clear(input);
    await userEvent.type(input, 'alice');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(args.onSignIn).toHaveBeenCalledWith('alice');
  },
};

/** A failed sign-in shows the error and lets the user retry. */
export const Failure: Story = {
  args: { provider: 'dev', onSignIn: fn(async () => Promise.reject(new Error('API unreachable'))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByText('API unreachable')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  },
};
