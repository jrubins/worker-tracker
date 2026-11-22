import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExerciseList } from './exercise-list';
import { sampleExercises } from './fixtures';

const meta = { title: 'Exercises/ExerciseList', component: ExerciseList } satisfies Meta<
  typeof ExerciseList
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUnconfirmed: Story = { args: { exercises: sampleExercises } };
export const Empty: Story = { args: { exercises: [] } };
