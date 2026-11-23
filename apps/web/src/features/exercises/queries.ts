import { ExerciseDetailSchema, ExerciseSchema, type UpdateExercise } from '@app/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const exercisesQueryOptions = queryOptions({
  queryKey: ['exercises', 'list'],
  queryFn: () => apiRequest('/exercises', ExerciseSchema.array()),
});

export const exerciseDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['exercises', id],
    queryFn: () => apiRequest(`/exercises/${id}?weeks=52`, ExerciseDetailSchema),
  });

/** Changes an exercise (its links, for example), refreshing the exercise pages. */
export function useUpdateExercise(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UpdateExercise) =>
      apiRequest(`/exercises/${id}`, ExerciseSchema, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
