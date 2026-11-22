import type { Meta, StoryObj } from '@storybook/react-vite';
import { versionTwo } from './fixtures';
import { RoutinePlan } from './routine-plan';

const meta = { title: 'Routines/RoutinePlan', component: RoutinePlan } satisfies Meta<
  typeof RoutinePlan
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Current: Story = { args: { version: versionTwo } };
