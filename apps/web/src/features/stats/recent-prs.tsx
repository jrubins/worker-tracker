import type { RecentPr } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatDate, formatNumber, formatSet } from '@/lib/format';

/** Sets that beat the previous best estimated one-rep max. */
export function RecentPrs({ prs }: { prs: readonly RecentPr[] }) {
  if (prs.length === 0) {
    return (
      <EmptyState icon={<Trophy />} title="No new personal records in the last 30 days.">
        Keep pushing: new bests show up here.
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-2">
      {prs.map((pr) => (
        <li
          key={pr.exerciseId}
          className="bg-highlight/[0.06] flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5"
        >
          <span
            aria-hidden
            className="bg-highlight/15 text-highlight flex size-9 shrink-0 items-center justify-center rounded-full"
          >
            <Trophy className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(pr.exerciseId) }}
              className="block truncate font-medium hover:underline"
            >
              {pr.exerciseName}
            </Link>
            <span className="text-muted-foreground text-xs">
              {formatSet({ weightLb: pr.weightLb, reps: pr.reps, rpe: null })} ·{' '}
              {formatDate(pr.date)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">e1RM {formatNumber(pr.e1rmLb)} lb</div>
            {pr.previousBestE1rmLb === null ? (
              <div className="text-highlight text-xs font-medium">First record</div>
            ) : (
              <div className="text-highlight text-xs font-medium">
                +{formatNumber(pr.e1rmLb - pr.previousBestE1rmLb)} lb
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
