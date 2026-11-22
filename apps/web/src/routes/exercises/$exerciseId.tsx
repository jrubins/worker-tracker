import { createFileRoute } from '@tanstack/react-router';
import { exerciseDetailQueryOptions } from '@/features/exercises/queries';
import { ExercisePage } from '@/pages/exercise-page';

export const Route = createFileRoute('/exercises/$exerciseId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(exerciseDetailQueryOptions(Number(params.exerciseId))),
  component: ExercisePage,
});
