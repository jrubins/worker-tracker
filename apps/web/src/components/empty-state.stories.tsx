import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    icon: <CalendarDays />,
    title: 'No workouts yet.',
    children: 'Ask Claude to log one, or to import past sessions.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
