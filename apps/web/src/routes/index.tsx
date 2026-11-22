import { createFileRoute } from '@tanstack/react-router';
import { dashboardQueryOptions } from '@/features/stats/queries';
import { HomePage } from '@/pages/home-page';

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions),
  component: HomePage,
});
