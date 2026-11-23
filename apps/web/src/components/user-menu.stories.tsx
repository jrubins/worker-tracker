import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { UserMenu } from './user-menu';

const meta = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  args: {
    user: { id: 'user_01', email: 'you@example.com', name: 'Alex Lee' },
    onSignOut: fn(),
    theme: 'dark',
    onThemeChange: fn(),
    showName: true,
  },
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithEmail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('AL')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
    // The menu renders in a portal, outside the story's canvas.
    await expect(await screen.findByText('you@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Light' }));
    await expect(args.onThemeChange).toHaveBeenCalledWith('light');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: /Account menu/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await expect(args.onSignOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  },
};

/** Dev sign-in users have no email: the name (their user ID) is shown instead. */
export const DevUser: Story = {
  args: { user: { id: 'dev-user', email: null, name: 'dev-user' } },
};

/** The phone header shows just the avatar. */
export const AvatarOnly: Story = {
  args: { showName: false },
};
