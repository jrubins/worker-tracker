import { createFileRoute } from '@tanstack/react-router';
import { routinesQueryOptions } from '@/features/routines/queries';
import { RoutinesPage } from '@/pages/routines-page';

export const Route = createFileRoute('/routines/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(routinesQueryOptions),
  component: RoutinesPage,
});
