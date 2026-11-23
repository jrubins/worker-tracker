import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { History, ListChecks } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { routinesQueryOptions } from '@/features/routines/queries';
import { RoutinePlan } from '@/features/routines/routine-plan';

export function RoutinesPage() {
  const { data: routines } = useSuspenseQuery(routinesQueryOptions);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Your rotation" title="Routines">
        {routines.length > 0 ? (
          <span>
            {routines.length} {routines.length === 1 ? 'routine' : 'routines'}
          </span>
        ) : null}
      </PageHeader>
      {routines.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="No routines yet.">
          Ask Claude to save your rotation.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {routines.map((routine) => (
            <Card key={routine.id}>
              <CardHeader>
                <CardTitle>
                  <h2>{routine.name}</h2>
                </CardTitle>
                <CardAction>
                  <Badge className="bg-primary/15 text-primary">v{routine.current.version}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <RoutinePlan version={routine.current} />
                <Link
                  to="/routines/$routineId"
                  params={{ routineId: String(routine.id) }}
                  className="text-muted-foreground hover:text-primary mt-auto flex items-center gap-1.5 text-sm"
                >
                  <History className="size-4" aria-hidden />
                  Version {routine.current.version} · history
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
