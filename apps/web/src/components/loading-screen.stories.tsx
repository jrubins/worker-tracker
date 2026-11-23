import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { LoadingScreen } from './loading-screen';

const meta = {
  title: 'App/LoadingScreen',
  component: LoadingScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoadingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Blank for the first half second, then the app's mark fades in. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Loading');
  },
};

/** Inside the app layout, while a page's data loads. */
export const Inline: Story = { args: { inline: true } };
