import { ExerciseDetailSchema, ExerciseSchema } from '@app/shared';
import { queryOptions } from '@tanstack/react-query';
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
