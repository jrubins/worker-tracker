import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { routineHistoryQueryOptions } from '@/features/routines/queries';
import { VersionHistory } from '@/features/routines/version-history';

export function RoutinePage() {
  const { routineId } = useParams({ from: '/routines/$routineId' });
  const { data: routine } = useSuspenseQuery(routineHistoryQueryOptions(Number(routineId)));
  const count = routine.versions.length;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Routine history" title={routine.name}>
        <span>
          {count} {count === 1 ? 'version' : 'versions'}
        </span>
      </PageHeader>
      <VersionHistory versions={routine.versions} />
    </div>
  );
}
