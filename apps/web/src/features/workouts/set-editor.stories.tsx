import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { warmupSet, workingSet } from './fixtures';
import { SetEditor } from './set-editor';

const meta = {
  title: 'Workouts/SetEditor',
  component: SetEditor,
  args: {
    set: workingSet,
    number: 2,
    onSave: fn(async () => {}),
    onDelete: fn(async () => {}),
  },
} satisfies Meta<typeof SetEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {};
export const WarmupWithNotes: Story = { args: { set: { ...warmupSet, notes: 'Easy' }, number: 1 } };

/** Fixing a mistyped weight. */
export const FixWeight: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit set 2' }));
    const weight = canvas.getByLabelText('Weight (lb)');
    await userEvent.clear(weight);
    await userEvent.type(weight, '230');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSave).toHaveBeenCalledWith({
      weightLb: 230,
      reps: 5,
      rpe: 8,
      warmup: false,
    });
  },
};

/** Out-of-range input is explained and not saved. */
export const InvalidRpe: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit set 2' }));
    const rpe = canvas.getByLabelText('RPE');
    await userEvent.clear(rpe);
    await userEvent.type(rpe, '11');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(await canvas.findByText('1 to 10, in half steps')).toBeInTheDocument();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};
