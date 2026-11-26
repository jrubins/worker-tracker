import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Scale, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExerciseSets } from '@/features/workouts/exercise-sets';
import {
  useDeleteSet,
  useDeleteWorkout,
  useUpdateSet,
  useUpdateWorkout,
  workoutQueryOptions,
} from '@/features/workouts/queries';
import { formatDate, formatNumber } from '@/lib/format';

export function WorkoutPage() {
  const { workoutId } = useParams({ from: '/workouts/$workoutId' });
  const { data: workout } = useSuspenseQuery(workoutQueryOptions(Number(workoutId)));
  const updateSet = useUpdateSet();
  const updateWorkout = useUpdateWorkout(workout.id);
  const deleteSet = useDeleteSet();
  const deleteWorkout = useDeleteWorkout();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const working = workout.sets.filter((set) => set.setType === 'working');
  const volume = workout.sets.reduce((sum, set) => sum + set.volumeLb, 0);
  const exercises = new Set(workout.sets.map((set) => set.exerciseId)).size;
  const bestE1rm = Math.max(0, ...working.map((set) => set.e1rmLb ?? 0));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={workout.routine ? 'Routine session' : 'Freestyle session'}
        title={formatDate(workout.date)}
      >
        {workout.routine ? (
          <Link to="/routines/$routineId" params={{ routineId: String(workout.routine.routineId) }}>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/25">
              {workout.routine.name} · v{workout.routine.version}
            </Badge>
          </Link>
        ) : null}
        {workout.durationMinutes ? (
          <span className="flex items-center gap-1">
            <Timer className="size-4" aria-hidden />
            {workout.durationMinutes} min
          </span>
        ) : null}
        {workout.bodyweightLb === null ? null : (
          <span className="flex items-center gap-1">
            <Scale className="size-4" aria-hidden />
            {formatNumber(workout.bodyweightLb)} lb bodyweight
          </span>
        )}
      </PageHeader>

      {workout.notes ? (
        <p className="border-primary/60 text-muted-foreground border-l-2 pl-4 italic">
          {workout.notes}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Exercises" value={String(exercises)} />
        <StatTile label="Working sets" value={String(working.length)} />
        <StatTile label="Volume" value={formatNumber(volume)} unit="lb" />
        <StatTile
          label="Best e1RM"
          value={bestE1rm > 0 ? formatNumber(bestE1rm) : '–'}
          unit={bestE1rm > 0 ? 'lb' : undefined}
        />
      </dl>

      <ExerciseSets
        sets={workout.sets}
        onSaveSet={(id, changes) => updateSet.mutateAsync({ id, changes })}
        onDeleteSet={(id) => deleteSet.mutateAsync(id)}
        onSetSuperset={(exerciseId, superset) =>
          updateWorkout.mutateAsync({ supersets: [{ exerciseId, superset }] })
        }
      />

      <div className="border-t pt-6">
        {confirmingDelete ? (
          <div className="border-destructive/40 bg-destructive/10 flex flex-wrap items-center gap-3 rounded-xl border p-4">
            <span className="text-sm font-medium">Delete this workout and all its sets?</span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteWorkout.isPending}
                onClick={() =>
                  void deleteWorkout
                    .mutateAsync(workout.id)
                    .then(() => navigate({ to: '/history' }))
                }
              >
                Delete workout
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 />
            Delete workout…
          </Button>
        )}
      </div>
    </div>
  );
}
