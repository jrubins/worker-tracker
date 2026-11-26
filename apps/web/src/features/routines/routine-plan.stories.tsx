import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { versionTwo } from './fixtures';
import { RoutinePlan } from './routine-plan';

const meta = { title: 'Routines/RoutinePlan', component: RoutinePlan } satisfies Meta<
  typeof RoutinePlan
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Current: Story = { args: { version: versionTwo } };

/** Bench and rows paired as superset A, then a plain finisher. */
export const WithSuperset: Story = {
  args: {
    version: {
      ...versionTwo,
      exercises: [
        { ...versionTwo.exercises[0]!, superset: 'A' },
        {
          exerciseId: 5,
          exerciseName: 'Barbell Row',
          position: 1,
          targetSets: 4,
          targetReps: '8',
          targetRpe: null,
          notes: null,
          superset: 'A',
        },
        { ...versionTwo.exercises[1]!, position: 2 },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const superset = canvas.getByRole('listitem', { name: 'Superset A' });
    await expect(within(superset).getByText('A1')).toBeInTheDocument();
    await expect(within(superset).getByRole('link', { name: 'Barbell Row' })).toBeInTheDocument();
    await expect(canvas.getByText('2')).toBeInTheDocument();
  },
};
