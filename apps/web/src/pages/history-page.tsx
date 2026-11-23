import type { WorkoutSummary } from '@app/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { WorkoutList } from '@/features/workouts/workout-list';
import { workoutsQueryOptions } from '@/features/workouts/queries';
import { formatNumber, weekLabel, weekStartOf } from '@/lib/format';

/** Workouts (newest first) grouped into Monday-start weeks. */
function byWeek(workouts: readonly WorkoutSummary[]) {
  const weeks: { weekStart: string; workouts: WorkoutSummary[] }[] = [];
  for (const workout of workouts) {
    const weekStart = weekStartOf(workout.date);
    const last = weeks.at(-1);
    if (last?.weekStart === weekStart) last.workouts.push(workout);
    else weeks.push({ weekStart, workouts: [workout] });
  }
  return weeks;
}

export function HistoryPage() {
  const { data } = useSuspenseQuery(workoutsQueryOptions);
  const weeks = byWeek(data);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Every session" title="History">
        {data.length > 0 ? (
          <span>
            {data.length} {data.length === 1 ? 'workout' : 'workouts'}
          </span>
        ) : null}
      </PageHeader>
      {weeks.length === 0 ? (
        <WorkoutList workouts={[]} />
      ) : (
        weeks.map((week) => {
          const volume = week.workouts.reduce((sum, w) => sum + w.volumeLb, 0);
          return (
            <section
              key={week.weekStart}
              aria-label={weekLabel(week.weekStart)}
              className="space-y-3"
            >
              <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                <h2 className="eyebrow text-foreground">{weekLabel(week.weekStart)}</h2>
                <span className="text-muted-foreground text-xs">
                  {week.workouts.length} {week.workouts.length === 1 ? 'session' : 'sessions'} ·{' '}
                  {formatNumber(volume)} lb
                </span>
              </div>
              <WorkoutList workouts={week.workouts} />
            </section>
          );
        })
      )}
    </div>
  );
}
