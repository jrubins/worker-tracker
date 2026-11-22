import type { RecentPr } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { formatDate, formatNumber, formatSet } from '@/lib/format';

/** Sets that beat the previous best estimated one-rep max. */
export function RecentPrs({ prs }: { prs: readonly RecentPr[] }) {
  if (prs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No new personal records in the last 30 days.</p>
    );
  }
  return (
    <ul className="divide-y">
      {prs.map((pr) => (
        <li
          key={pr.exerciseId}
          className="flex flex-wrap items-baseline justify-between gap-2 py-2"
        >
          <div>
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(pr.exerciseId) }}
              className="font-medium hover:underline"
            >
              {pr.exerciseName}
            </Link>
            <span className="text-muted-foreground ml-2 text-sm">
              {formatSet({ weightLb: pr.weightLb, reps: pr.reps, rpe: null })}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">e1RM {formatNumber(pr.e1rmLb)} lb</span>
            {pr.previousBestE1rmLb === null ? null : (
              <span className="text-muted-foreground">
                {' '}
                (+{formatNumber(pr.e1rmLb - pr.previousBestE1rmLb)})
              </span>
            )}
            <span className="text-muted-foreground"> · {formatDate(pr.date)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
