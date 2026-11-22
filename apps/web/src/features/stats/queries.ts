import { DashboardSchema } from '@app/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const dashboardQueryOptions = queryOptions({
  queryKey: ['stats', 'dashboard'],
  queryFn: () => apiRequest('/stats/dashboard', DashboardSchema),
});
