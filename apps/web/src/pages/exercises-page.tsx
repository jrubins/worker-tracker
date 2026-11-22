import { useSuspenseQuery } from '@tanstack/react-query';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { exercisesQueryOptions } from '@/features/exercises/queries';

export function ExercisesPage() {
  const { data } = useSuspenseQuery(exercisesQueryOptions);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Exercises</h1>
      <ExerciseList exercises={data} />
    </div>
  );
}
