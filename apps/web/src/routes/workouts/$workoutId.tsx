import { createFileRoute } from '@tanstack/react-router';
import { workoutQueryOptions } from '@/features/workouts/queries';
import { WorkoutPage } from '@/pages/workout-page';

export const Route = createFileRoute('/workouts/$workoutId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(workoutQueryOptions(Number(params.workoutId))),
  component: WorkoutPage,
});
