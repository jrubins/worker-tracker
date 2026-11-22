import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ExerciseSets } from './exercise-sets';
import { sampleSets } from './fixtures';

const meta = {
  title: 'Workouts/ExerciseSets',
  component: ExerciseSets,
  args: { sets: sampleSets, onSaveSet: fn(async () => {}), onDeleteSet: fn(async () => {}) },
} satisfies Meta<typeof ExerciseSets>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Session: Story = {};
export const Empty: Story = { args: { sets: [] } };
