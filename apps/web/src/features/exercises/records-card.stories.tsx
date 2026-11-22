import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleRecords } from './fixtures';
import { RecordsCard } from './records-card';

const meta = { title: 'Exercises/RecordsCard', component: RecordsCard } satisfies Meta<
  typeof RecordsCard
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRecords: Story = { args: { records: sampleRecords } };
export const NoRecords: Story = {
  args: { records: { ...sampleRecords, bestE1rm: null, heaviest: null, repMaxes: [] } },
};
