import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExerciseSets } from '@/features/workouts/exercise-sets';
import {
  useDeleteSet,
  useDeleteWorkout,
  useUpdateSet,
  workoutQueryOptions,
} from '@/features/workouts/queries';
import { formatDate } from '@/lib/format';

export function WorkoutPage() {
  const { workoutId } = useParams({ from: '/workouts/$workoutId' });
  const { data: workout } = useSuspenseQuery(workoutQueryOptions(Number(workoutId)));
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const deleteWorkout = useDeleteWorkout();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{formatDate(workout.date)}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {workout.routine ? (
            <Link
              to="/routines/$routineId"
              params={{ routineId: String(workout.routine.routineId) }}
            >
              <Badge variant="secondary">
                {workout.routine.name} · v{workout.routine.version}
              </Badge>
            </Link>
          ) : null}
          {workout.durationMinutes ? (
            <span className="text-muted-foreground">{workout.durationMinutes} min</span>
          ) : null}
        </div>
        {workout.notes ? <p className="text-muted-foreground">{workout.notes}</p> : null}
      </div>

      <ExerciseSets
        sets={workout.sets}
        onSaveSet={(id, changes) => updateSet.mutateAsync({ id, changes })}
        onDeleteSet={(id) => deleteSet.mutateAsync(id)}
      />

      <div className="border-t pt-4">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">Delete this workout and all its sets?</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteWorkout.isPending}
              onClick={() =>
                void deleteWorkout.mutateAsync(workout.id).then(() => navigate({ to: '/history' }))
              }
            >
              Delete workout
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
            Delete workout…
          </Button>
        )}
      </div>
    </div>
  );
}
