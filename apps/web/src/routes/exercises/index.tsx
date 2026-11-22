import { createFileRoute } from '@tanstack/react-router';
import { exercisesQueryOptions } from '@/features/exercises/queries';
import { ExercisesPage } from '@/pages/exercises-page';

export const Route = createFileRoute('/exercises/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(exercisesQueryOptions),
  component: ExercisesPage,
});
