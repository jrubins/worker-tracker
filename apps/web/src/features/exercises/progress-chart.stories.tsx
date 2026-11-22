import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleProgress } from './fixtures';
import { ProgressChart } from './progress-chart';

const meta = { title: 'Exercises/ProgressChart', component: ProgressChart } satisfies Meta<
  typeof ProgressChart
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EightSessions: Story = { args: { points: sampleProgress } };
export const NotEnoughData: Story = { args: { points: sampleProgress.slice(0, 1) } };
