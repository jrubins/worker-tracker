import type { RoutineVersion } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { formatNumber } from '@/lib/format';

/** "4 × 5 @ RPE 8" */
const target = (e: RoutineVersion['exercises'][number]) =>
  [
    [e.targetSets, e.targetReps].filter((v) => v !== null).join(' × '),
    e.targetRpe === null ? '' : `@ RPE ${formatNumber(e.targetRpe)}`,
  ]
    .filter(Boolean)
    .join(' ');

/** The exercises and targets of one routine version. */
export function RoutinePlan({ version }: { version: RoutineVersion }) {
  return (
    <div className="space-y-2">
      {version.notes ? <p className="text-muted-foreground text-sm">{version.notes}</p> : null}
      <ol className="list-decimal space-y-1 pl-5">
        {version.exercises.map((e) => (
          <li key={`${e.exerciseId}-${e.position}`}>
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(e.exerciseId) }}
              className="hover:underline"
            >
              {e.exerciseName}
            </Link>
            {target(e) ? (
              <span className="text-muted-foreground ml-2 text-sm">{target(e)}</span>
            ) : null}
            {e.notes ? (
              <span className="text-muted-foreground ml-2 text-sm">({e.notes})</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
