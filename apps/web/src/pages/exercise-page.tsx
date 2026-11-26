import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressChart } from '@/features/exercises/progress-chart';
import { ExerciseLinks } from '@/features/exercises/exercise-links';
import { exerciseDetailQueryOptions, useUpdateExercise } from '@/features/exercises/queries';
import { RecordsCard } from '@/features/exercises/records-card';
import { labelSets } from '@/features/workouts/set-labels';
import { formatDate, formatDuration, formatNumber, formatSet } from '@/lib/format';

const LOAD_TYPE_LABELS = {
  total: null,
  per_hand: 'Weights are per dumbbell',
  bodyweight_plus: 'Weights are added to bodyweight',
} as const;

export function ExercisePage() {
  const { exerciseId } = useParams({ from: '/exercises/$exerciseId' });
  const { data } = useSuspenseQuery(exerciseDetailQueryOptions(Number(exerciseId)));
  const { exercise, lastSession, records, progress } = data;
  const updateExercise = useUpdateExercise(exercise.id);
  const best = records.bestE1rm;
  const heaviest = records.heaviest;
  const loadNote = LOAD_TYPE_LABELS[exercise.loadType];
  // The third tile shows what matters for this kind of exercise.
  const extra = records.longestHold
    ? {
        label: 'Longest hold',
        value: formatDuration(records.longestHold.durationSeconds),
        date: records.longestHold.date,
      }
    : exercise.loadType === 'bodyweight_plus' && records.mostReps
      ? {
          label: 'Most reps',
          value: String(records.mostReps.reps),
          date: records.mostReps.date,
        }
      : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={exercise.equipment ?? 'Exercise'} title={exercise.name}>
        {exercise.confirmed ? null : (
          <Badge className="bg-highlight/15 text-highlight">New: review with Claude</Badge>
        )}
        {exercise.aliases.length ? <span>Also: {exercise.aliases.join(', ')}</span> : null}
        {loadNote ? <span>{loadNote}</span> : null}
      </PageHeader>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          label="Best e1RM"
          value={best?.e1rmLb ? formatNumber(best.e1rmLb) : '–'}
          unit={best?.e1rmLb ? 'lb' : undefined}
          icon={<Trophy />}
          change={
            best
              ? {
                  direction: 'flat',
                  text: `${formatSet({ ...best, rpe: null, loadType: exercise.loadType })} · ${formatDate(best.date)}`,
                }
              : null
          }
          trend={progress.points.flatMap((point) => point.bestE1rmLb ?? [])}
        />
        <StatTile
          label={exercise.loadType === 'bodyweight_plus' ? 'Most added weight' : 'Heaviest set'}
          value={heaviest?.weightLb ? formatNumber(heaviest.weightLb) : heaviest ? 'BW' : '–'}
          unit={
            heaviest?.weightLb ? (exercise.loadType === 'per_hand' ? 'lb ea' : 'lb') : undefined
          }
          change={
            heaviest
              ? { direction: 'flat', text: `× ${heaviest.reps} · ${formatDate(heaviest.date)}` }
              : null
          }
        />
        {extra ? (
          <StatTile
            label={extra.label}
            value={extra.value}
            change={{ direction: 'flat', text: formatDate(extra.date) }}
            className="col-span-2 md:col-span-1"
          />
        ) : (
          <StatTile
            label="Sessions"
            value={String(progress.points.length)}
            change={{ direction: 'flat', text: 'In the last 12 months' }}
            className="col-span-2 md:col-span-1"
          />
        )}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <h2>Progress</h2>
            </CardTitle>
            <CardDescription>Best estimated 1RM per session, last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressChart points={progress.points} loadType={exercise.loadType} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Last session</h2>
            </CardTitle>
            <CardDescription>
              {lastSession ? formatDate(lastSession.date) : 'Not logged yet.'}
            </CardDescription>
          </CardHeader>
          {lastSession ? (
            <CardContent className="space-y-4">
              <ol className="divide-y">
                {labelSets(lastSession.sets).map(({ set, marker }) => (
                  <li
                    key={set.id}
                    className={`flex items-center gap-3 py-2 ${set.setType === 'working' ? '' : 'text-muted-foreground'}`}
                  >
                    <span className="text-muted-foreground w-4 text-xs font-semibold" aria-hidden>
                      {marker}
                    </span>
                    <span className="flex-1 font-medium tabular-nums">{formatSet(set)}</span>
                    {set.setType === 'working' ? null : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {set.setType === 'warmup' ? 'Warm-up' : 'Drop set'}
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
              <Link
                to="/workouts/$workoutId"
                params={{ workoutId: String(lastSession.workoutId) }}
                className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
              >
                Open workout <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Rep maxes</h2>
          </CardTitle>
          <CardDescription>
            {exercise.loadType === 'bodyweight_plus'
              ? 'The most added weight for each number of reps.'
              : 'The heaviest weight for each number of reps.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordsCard records={records} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>References</h2>
          </CardTitle>
          <CardDescription>How-to videos and articles for this exercise.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseLinks
            links={exercise.links}
            onChange={(links) => updateExercise.mutateAsync({ links })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
