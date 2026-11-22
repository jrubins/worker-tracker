import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressChart } from '@/features/exercises/progress-chart';
import { exerciseDetailQueryOptions } from '@/features/exercises/queries';
import { RecordsCard } from '@/features/exercises/records-card';
import { formatDate, formatSet } from '@/lib/format';

export function ExercisePage() {
  const { exerciseId } = useParams({ from: '/exercises/$exerciseId' });
  const { data } = useSuspenseQuery(exerciseDetailQueryOptions(Number(exerciseId)));
  const { exercise, lastSession, records, progress } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        {exercise.aliases.length ? (
          <p className="text-muted-foreground text-sm">Also: {exercise.aliases.join(', ')}</p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Last session</h2>
          </CardTitle>
          {lastSession ? (
            <CardDescription>
              <Link
                to="/workouts/$workoutId"
                params={{ workoutId: String(lastSession.workoutId) }}
                className="hover:underline"
              >
                {formatDate(lastSession.date)}
              </Link>
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {lastSession ? (
            <ol className="space-y-1">
              {lastSession.sets.map((set) => (
                <li key={set.id} className={set.warmup ? 'text-muted-foreground' : undefined}>
                  {formatSet(set)}
                  {set.warmup ? ' (warm-up)' : ''}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">Not logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Personal records</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecordsCard records={records} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Progress</h2>
          </CardTitle>
          <CardDescription>Best estimated 1RM per session, last 12 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressChart points={progress.points} />
        </CardContent>
      </Card>
    </div>
  );
}
