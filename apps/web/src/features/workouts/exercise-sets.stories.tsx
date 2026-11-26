import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ExerciseSets } from './exercise-sets';
import { sampleSets, supersetSets } from './fixtures';

const meta = {
  title: 'Workouts/ExerciseSets',
  component: ExerciseSets,
  args: { sets: sampleSets, onSaveSet: fn(async () => {}), onDeleteSet: fn(async () => {}) },
} satisfies Meta<typeof ExerciseSets>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Warm-up, working sets, a drop set, and per-hand, bodyweight-plus and timed exercises. */
export const Session: Story = {};
export const Empty: Story = { args: { sets: [] } };

/** Bench and rows logged round by round as superset A: each exercise's sets read together. */
export const Superset: Story = {
  args: { sets: supersetSets, onSetSuperset: fn(async () => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const superset = canvas.getByRole('region', { name: 'Superset A' });
    await expect(within(superset).getByText('3 rounds', { exact: false })).toBeInTheDocument();
    await expect(within(superset).getByRole('region', { name: 'Bench Press' })).toBeInTheDocument();
    await expect(within(superset).getByRole('region', { name: 'Barbell Row' })).toBeInTheDocument();
  },
};

/** Marking an exercise as part of a superset from the page. */
export const MarkSuperset: Story = {
  args: { sets: supersetSets, onSetSuperset: fn(async () => {}) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Superset for Hammer Curl'), 'Superset B');
    await expect(args.onSetSuperset).toHaveBeenCalledWith(3, 'B');
    await userEvent.selectOptions(canvas.getByLabelText('Superset for Barbell Row'), 'No superset');
    await expect(args.onSetSuperset).toHaveBeenCalledWith(5, null);
  },
};
