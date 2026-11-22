import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { routinesQueryOptions } from '@/features/routines/queries';
import { RoutinePlan } from '@/features/routines/routine-plan';

export function RoutinesPage() {
  const { data: routines } = useSuspenseQuery(routinesQueryOptions);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Routines</h1>
      {routines.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No routines yet. Ask Claude to save your rotation.
        </p>
      ) : (
        routines.map((routine) => (
          <Card key={routine.id}>
            <CardHeader>
              <CardTitle>
                <h2>{routine.name}</h2>
              </CardTitle>
              <CardDescription>
                <Link
                  to="/routines/$routineId"
                  params={{ routineId: String(routine.id) }}
                  className="hover:underline"
                >
                  Version {routine.current.version} · history
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoutinePlan version={routine.current} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
