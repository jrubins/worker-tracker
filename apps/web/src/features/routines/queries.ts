import { RoutineHistorySchema, RoutineSchema } from '@app/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const routinesQueryOptions = queryOptions({
  queryKey: ['routines', 'list'],
  queryFn: () => apiRequest('/routines', RoutineSchema.array()),
});

export const routineHistoryQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['routines', id],
    queryFn: () => apiRequest(`/routines/${id}`, RoutineHistorySchema),
  });
