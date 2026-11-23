import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleBodyweightRecords, sampleRecords } from './fixtures';
import { RecordsCard } from './records-card';

const meta = { title: 'Exercises/RecordsCard', component: RecordsCard } satisfies Meta<
  typeof RecordsCard
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRecords: Story = { args: { records: sampleRecords } };
/** Weighted pull-ups: the added weight per rep count ("BW + 25 lb"). */
export const WeightedBodyweight: Story = { args: { records: sampleBodyweightRecords } };
export const NoRecords: Story = {
  args: { records: { ...sampleRecords, bestE1rm: null, heaviest: null, repMaxes: [] } },
};
