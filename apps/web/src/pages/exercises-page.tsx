import { useSuspenseQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ExerciseList } from '@/features/exercises/exercise-list';
import { exercisesQueryOptions } from '@/features/exercises/queries';

export function ExercisesPage() {
  const { data } = useSuspenseQuery(exercisesQueryOptions);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Your movements" title="Exercises">
        {data.length > 0 ? <span>{data.length} tracked</span> : null}
      </PageHeader>
      <ExerciseList exercises={data} />
    </div>
  );
}
