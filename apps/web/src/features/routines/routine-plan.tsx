import type { RoutineVersion } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { Repeat } from 'lucide-react';
import { formatNumber } from '@/lib/format';

type PlanEntry = RoutineVersion['exercises'][number];

/** "4 × 5 @ RPE 8" */
const target = (e: PlanEntry) =>
  [
    [e.targetSets, e.targetReps].filter((v) => v !== null).join(' × '),
    e.targetRpe === null ? '' : `@ RPE ${formatNumber(e.targetRpe)}`,
  ]
    .filter(Boolean)
    .join(' ');

/** Plan entries in order, with entries sharing a superset label gathered into one group. */
function groupPlan(entries: readonly PlanEntry[]) {
  const groups: { superset: string | null; entries: PlanEntry[] }[] = [];
  for (const entry of entries) {
    const group = entry.superset
      ? groups.find((candidate) => candidate.superset === entry.superset)
      : undefined;
    if (group) group.entries.push(entry);
    else groups.push({ superset: entry.superset, entries: [entry] });
  }
  return groups;
}

function PlanRow({ entry, marker }: { entry: PlanEntry; marker: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-muted-foreground font-display w-6 shrink-0 pt-0.5 text-sm font-semibold">
        {marker}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to="/exercises/$exerciseId"
          params={{ exerciseId: String(entry.exerciseId) }}
          className="font-medium break-words hover:underline"
        >
          {entry.exerciseName}
        </Link>
        {entry.notes ? <p className="text-muted-foreground text-xs">{entry.notes}</p> : null}
      </div>
      {target(entry) ? (
        <span className="bg-secondary rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums">
          {target(entry)}
        </span>
      ) : null}
    </div>
  );
}

/** The exercises and targets of one routine version; supersets are boxed together. */
export function RoutinePlan({ version }: { version: RoutineVersion }) {
  return (
    <div className="space-y-3">
      {version.notes ? <p className="text-muted-foreground text-sm">{version.notes}</p> : null}
      <ol className="divide-y">
        {groupPlan(version.exercises).map((group, index) => {
          const first = group.entries[0];
          if (!first) return null;
          if (group.superset === null) {
            return (
              <li key={`${first.exerciseId}-${first.position}`}>
                <PlanRow entry={first} marker={String(index + 1)} />
              </li>
            );
          }
          return (
            <li
              key={`superset-${group.superset}`}
              aria-label={`Superset ${group.superset}`}
              className="py-2"
            >
              <div className="border-primary/30 bg-primary/5 rounded-lg border px-3 py-1">
                <p className="text-primary flex items-center gap-1.5 pt-1.5 text-xs font-semibold tracking-wide uppercase">
                  <Repeat className="size-3.5" aria-hidden />
                  Superset {group.superset}
                </p>
                <div className="divide-primary/15 divide-y">
                  {group.entries.map((entry, position) => (
                    <PlanRow
                      key={`${entry.exerciseId}-${entry.position}`}
                      entry={entry}
                      marker={`${group.superset}${position + 1}`}
                    />
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
