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
    <div className="space-y-3">
      {version.notes ? <p className="text-muted-foreground text-sm">{version.notes}</p> : null}
      <ol className="divide-y">
        {version.exercises.map((e, index) => (
          <li key={`${e.exerciseId}-${e.position}`} className="flex items-start gap-3 py-2.5">
            <span className="text-muted-foreground font-display w-5 pt-0.5 text-sm font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to="/exercises/$exerciseId"
                params={{ exerciseId: String(e.exerciseId) }}
                className="font-medium hover:underline"
              >
                {e.exerciseName}
              </Link>
              {e.notes ? <p className="text-muted-foreground text-xs">{e.notes}</p> : null}
            </div>
            {target(e) ? (
              <span className="bg-secondary rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums">
                {target(e)}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
