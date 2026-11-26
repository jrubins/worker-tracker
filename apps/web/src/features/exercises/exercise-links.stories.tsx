import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ExerciseLinks } from './exercise-links';

const video = { url: 'https://www.youtube.com/watch?v=rdl-form', label: 'RDL form' };

const meta = {
  title: 'Exercises/ExerciseLinks',
  component: ExerciseLinks,
  args: {
    links: [video, { url: 'https://example.com/hip-hinge', label: null }],
    onChange: fn(async () => {}),
  },
} satisfies Meta<typeof ExerciseLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLinks: Story = {};
export const Empty: Story = { args: { links: [] } };

/** Saving a new link adds it to the end of the list. */
export const AddLink: Story = {
  args: { links: [video] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add link' }));
    await userEvent.type(canvas.getByLabelText('Web address'), 'https://example.com/cues');
    await userEvent.type(canvas.getByLabelText('Label (optional)'), 'Cues');
    await userEvent.click(canvas.getByRole('button', { name: 'Save link' }));
    await expect(args.onChange).toHaveBeenCalledWith([
      video,
      { url: 'https://example.com/cues', label: 'Cues' },
    ]);
  },
};

/** Only web addresses are accepted. */
export const InvalidAddress: Story = {
  args: { links: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add link' }));
    await userEvent.type(canvas.getByLabelText('Web address'), 'not a link');
    await userEvent.click(canvas.getByRole('button', { name: 'Save link' }));
    await expect(
      await canvas.findByText('Enter a web address (http or https)'),
    ).toBeInTheDocument();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** Removing a link asks first, then saves the list without it. */
export const RemoveLink: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove RDL form' }));
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }));
    await expect(canvas.getByRole('link', { name: /RDL form/ })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Remove RDL form' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Remove' }));
    await expect(args.onChange).toHaveBeenCalledWith([
      { url: 'https://example.com/hip-hinge', label: null },
    ]);
  },
};
