import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeeklyVolumeChart } from './weekly-volume-chart';

const meta = {
  title: 'Stats/WeeklyVolumeChart',
  component: WeeklyVolumeChart,
} satisfies Meta<typeof WeeklyVolumeChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const week = (weekStart: string, volumeLb: number) => ({
  weekStart,
  sessions: 3,
  workingSets: 40,
  volumeLb,
});

export const EightWeeks: Story = {
  args: {
    weeks: [
      week('2026-09-28', 38_500),
      week('2026-10-05', 41_200),
      week('2026-10-12', 0),
      week('2026-10-19', 36_900),
      week('2026-10-26', 44_100),
      week('2026-11-02', 45_600),
      week('2026-11-09', 47_300),
      week('2026-11-16', 21_800),
    ],
  },
};

export const NoTraining: Story = { args: { weeks: [week('2026-11-16', 0)] } };
