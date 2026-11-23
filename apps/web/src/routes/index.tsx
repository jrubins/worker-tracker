import { createFileRoute } from '@tanstack/react-router';
import { dashboardQueryOptions } from '@/features/stats/queries';
import { workoutsQueryOptions } from '@/features/workouts/queries';
import { HomePage } from '@/pages/home-page';

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dashboardQueryOptions),
      context.queryClient.ensureQueryData(workoutsQueryOptions),
    ]),
  component: HomePage,
});
