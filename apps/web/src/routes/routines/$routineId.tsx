import { createFileRoute } from '@tanstack/react-router';
import { routineHistoryQueryOptions } from '@/features/routines/queries';
import { RoutinePage } from '@/pages/routine-page';

export const Route = createFileRoute('/routines/$routineId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(routineHistoryQueryOptions(Number(params.routineId))),
  component: RoutinePage,
});
