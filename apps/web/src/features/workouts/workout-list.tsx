import type { WorkoutSummary } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatNumber } from '@/lib/format';

export function WorkoutList({ workouts }: { workouts: readonly WorkoutSummary[] }) {
  if (workouts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No workouts yet. Ask Claude to log one, or to import past sessions.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {workouts.map((workout) => (
        <li key={workout.id}>
          <Link
            to="/workouts/$workoutId"
            params={{ workoutId: String(workout.id) }}
            className="hover:bg-accent flex flex-col gap-1 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatDate(workout.date)}</span>
              {workout.routineName ? (
                <Badge variant="secondary">{workout.routineName}</Badge>
              ) : null}
            </div>
            <span className="text-muted-foreground text-sm">
              {workout.exerciseNames.join(', ') || 'No sets'}
            </span>
            <span className="text-muted-foreground text-xs">
              {workout.workingSets} working sets · {formatNumber(workout.volumeLb)} lb
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
