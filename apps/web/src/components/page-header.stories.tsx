import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from './page-header';

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  args: {
    eyebrow: 'Nov 17 – Nov 23',
    title: 'This week',
    children: <Badge variant="secondary">Push A · v2</Badge>,
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
