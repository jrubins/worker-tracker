import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { sampleSets, warmupSet, workingSet } from './fixtures';
import { SetEditor } from './set-editor';

const meta = {
  title: 'Workouts/SetEditor',
  component: SetEditor,
  args: {
    set: workingSet,
    label: 'set 2',
    marker: '2',
    onSave: fn(async () => {}),
    onDelete: fn(async () => {}),
  },
} satisfies Meta<typeof SetEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Working: Story = {};
export const WarmupWithNotes: Story = {
  args: { set: { ...warmupSet, notes: 'Easy' }, label: 'set 1', marker: '1' },
};
export const DropSet: Story = {
  args: { set: sampleSets[3] ?? workingSet, label: 'drop set after set 3', marker: '↳' },
};
export const Timed: Story = {
  args: { set: sampleSets[6] ?? workingSet, label: 'set 1', marker: '1' },
};

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
      durationSeconds: null,
      rpe: 8,
      setType: 'working',
    });
  },
};

/** Marking a set as a drop set. */
export const MarkAsDrop: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit set 2' }));
    await userEvent.selectOptions(canvas.getByLabelText('Set type'), 'Drop set');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSave).toHaveBeenCalledWith(expect.objectContaining({ setType: 'drop' }));
  },
};

/** A set needs reps or a time. */
export const NeedsRepsOrTime: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit set 2' }));
    await userEvent.clear(canvas.getByLabelText('Reps'));
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(await canvas.findByText('Give reps, a time, or both')).toBeInTheDocument();
    await expect(args.onSave).not.toHaveBeenCalled();
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

/** Deleting asks first; "Keep it" backs out without deleting. */
export const DeleteAsksFirst: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete set 2' }));
    await expect(args.onDelete).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }));
    await expect(canvas.getByRole('button', { name: 'Edit set 2' })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Delete set 2' }));
    await expect(canvas.getByRole('group', { name: 'Delete set 2?' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.onDelete).toHaveBeenCalledOnce();
  },
};
