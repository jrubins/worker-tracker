import { WorkoutSchema, WorkoutSetSchema, WorkoutSummarySchema, type UpdateSet } from '@app/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const workoutsQueryOptions = queryOptions({
  queryKey: ['workouts', 'list'],
  queryFn: () => apiRequest('/workouts?limit=100', WorkoutSummarySchema.array()),
});

export const workoutQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['workouts', id],
    queryFn: () => apiRequest(`/workouts/${id}`, WorkoutSchema),
  });

const TRAINING_KEYS = new Set(['workouts', 'stats', 'exercises']);

/**
 * A changed workout changes history, stats and exercise pages: refresh them all, except a
 * workout that no longer exists (re-fetching it would only 404 while its page is still open).
 */
function useInvalidateTraining() {
  const queryClient = useQueryClient();
  return (deletedWorkoutId?: number) =>
    queryClient.invalidateQueries({
      predicate: ({ queryKey: [area, id] }) =>
        typeof area === 'string' &&
        TRAINING_KEYS.has(area) &&
        !(area === 'workouts' && id === deletedWorkoutId),
    });
}

export function useUpdateSet() {
  const invalidate = useInvalidateTraining();
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: UpdateSet }) =>
      apiRequest(`/sets/${id}`, WorkoutSetSchema, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteSet() {
  const invalidate = useInvalidateTraining();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/sets/${id}`, null, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteWorkout() {
  const invalidate = useInvalidateTraining();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/workouts/${id}`, null, { method: 'DELETE' }),
    onSuccess: (response, id) => invalidate(id),
  });
}
