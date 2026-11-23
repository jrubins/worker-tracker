import type { WorkoutSummary } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { dateParts, formatDate, formatNumber } from '@/lib/format';

/** Workouts as tappable rows: a date block, what was trained, and the totals. */
export function WorkoutList({ workouts }: { workouts: readonly WorkoutSummary[] }) {
  if (workouts.length === 0) {
    return (
      <EmptyState icon={<CalendarDays />} title="No workouts yet.">
        Ask Claude to log one, or to import past sessions.
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-2">
      {workouts.map((workout) => {
        const date = dateParts(workout.date);
        return (
          <li key={workout.id}>
            <Link
              to="/workouts/$workoutId"
              params={{ workoutId: String(workout.id) }}
              className="bg-card hover:border-primary/40 hover:bg-accent/40 group flex items-center gap-4 rounded-xl border p-3 transition-colors"
            >
              <span
                aria-hidden
                className="bg-secondary flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5"
              >
                <span className="text-muted-foreground text-[0.65rem] font-semibold uppercase">
                  {date.month}
                </span>
                <span className="font-display text-2xl leading-none font-semibold">{date.day}</span>
                <span className="text-muted-foreground text-[0.65rem] font-semibold uppercase">
                  {date.weekday}
                </span>
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="sr-only">{formatDate(workout.date)}</span>
                <span className="flex items-center gap-2">
                  {workout.routineName ? (
                    <Badge className="bg-primary/15 text-primary">{workout.routineName}</Badge>
                  ) : (
                    <Badge variant="secondary">Freestyle</Badge>
                  )}
                </span>
                <span className="block truncate text-sm font-medium">
                  {workout.exerciseNames.join(' · ') || 'No sets'}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {workout.workingSets} working {workout.workingSets === 1 ? 'set' : 'sets'} ·{' '}
                  {formatNumber(workout.volumeLb)} lb
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-colors"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
