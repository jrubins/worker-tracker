import type { Meta, StoryObj } from '@storybook/react-vite';
import { Flame } from 'lucide-react';
import { expect, within } from 'storybook/test';
import { StatTile } from './stat-tile';

const meta = {
  title: 'Components/StatTile',
  component: StatTile,
  decorators: [
    (Story) => (
      <dl className="grid max-w-xs">
        <Story />
      </dl>
    ),
  ],
  args: {
    label: 'Volume',
    value: '12,450',
    unit: 'lb',
    change: { direction: 'up', text: '+8% vs last week' },
    trend: [8200, 9100, 0, 10400, 11000, 11500, 11550, 12450],
  },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Up: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Volume').parentElement).toHaveTextContent('12,450 lb');
    await expect(canvas.getByText('+8% vs last week')).toBeInTheDocument();
  },
};

export const Down: Story = {
  args: { change: { direction: 'down', text: '−12% vs last week' } },
};

export const PlainWithIcon: Story = {
  args: { label: 'Streak', value: '6', unit: 'weeks', change: null, trend: [], icon: <Flame /> },
};
