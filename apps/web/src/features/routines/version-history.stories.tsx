import type { Meta, StoryObj } from '@storybook/react-vite';
import { versionOne, versionTwo } from './fixtures';
import { VersionHistory } from './version-history';

const meta = { title: 'Routines/VersionHistory', component: VersionHistory } satisfies Meta<
  typeof VersionHistory
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoVersions: Story = { args: { versions: [versionTwo, versionOne] } };
