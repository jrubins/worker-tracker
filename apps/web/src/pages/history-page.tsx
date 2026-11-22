import { useSuspenseQuery } from '@tanstack/react-query';
import { WorkoutList } from '@/features/workouts/workout-list';
import { workoutsQueryOptions } from '@/features/workouts/queries';

export function HistoryPage() {
  const { data } = useSuspenseQuery(workoutsQueryOptions);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">History</h1>
      <WorkoutList workouts={data} />
    </div>
  );
}
