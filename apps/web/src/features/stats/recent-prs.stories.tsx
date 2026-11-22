import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentPrs } from './recent-prs';

const meta = { title: 'Stats/RecentPrs', component: RecentPrs } satisfies Meta<typeof RecentPrs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPrs: Story = {
  args: {
    prs: [
      {
        exerciseId: 1,
        exerciseName: 'Squat',
        weightLb: 315,
        reps: 5,
        e1rmLb: 367.5,
        date: '2026-11-20',
        workoutId: 9,
        previousBestE1rmLb: 356,
      },
      {
        exerciseId: 2,
        exerciseName: 'Bench Press',
        weightLb: 235,
        reps: 3,
        e1rmLb: 258.5,
        date: '2026-11-18',
        workoutId: 8,
        previousBestE1rmLb: null,
      },
    ],
  },
};

export const None: Story = { args: { prs: [] } };
