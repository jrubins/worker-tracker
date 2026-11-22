import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { routineHistoryQueryOptions } from '@/features/routines/queries';
import { VersionHistory } from '@/features/routines/version-history';

export function RoutinePage() {
  const { routineId } = useParams({ from: '/routines/$routineId' });
  const { data: routine } = useSuspenseQuery(routineHistoryQueryOptions(Number(routineId)));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{routine.name}</h1>
      <VersionHistory versions={routine.versions} />
    </div>
  );
}
