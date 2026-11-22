import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleWorkouts } from './fixtures';
import { WorkoutList } from './workout-list';

const meta = { title: 'Workouts/WorkoutList', component: WorkoutList } satisfies Meta<
  typeof WorkoutList
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recent: Story = { args: { workouts: sampleWorkouts } };
export const Empty: Story = { args: { workouts: [] } };
