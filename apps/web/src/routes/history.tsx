import { createFileRoute } from '@tanstack/react-router';
import { workoutsQueryOptions } from '@/features/workouts/queries';
import { HistoryPage } from '@/pages/history-page';

export const Route = createFileRoute('/history')({
  loader: ({ context }) => context.queryClient.ensureQueryData(workoutsQueryOptions),
  component: HistoryPage,
});
