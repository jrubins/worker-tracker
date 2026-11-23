import type { PersonalRecords } from '@app/shared';
import { Trophy } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatDate, formatLoad } from '@/lib/format';

/**
 * Rep maxes: the heaviest weight lifted for each rep count (the added weight for weighted
 * bodyweight lifts, per dumbbell for per-hand ones).
 */
export function RecordsCard({ records }: { records: PersonalRecords }) {
  if (records.repMaxes.length === 0) {
    return <EmptyState icon={<Trophy />} title="No working sets with reps yet." />;
  }
  const best = records.bestE1rm;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Rep maxes</caption>
      <thead>
        <tr className="eyebrow text-left">
          <th className="pb-2 font-semibold">Reps</th>
          <th className="pb-2 font-semibold">Weight</th>
          <th className="pb-2 text-right font-semibold">Date</th>
        </tr>
      </thead>
      <tbody>
        {records.repMaxes.map((record) => {
          const isBest =
            best !== null && record.reps === best.reps && record.weightLb === best.weightLb;
          return (
            <tr key={record.reps} className="border-t">
              <td className="font-display py-2 text-lg font-semibold">{record.reps}</td>
              <td className="py-2 font-medium tabular-nums">
                {formatLoad(record.weightLb, records.loadType)}
                {isBest ? (
                  <Trophy
                    className="text-highlight ml-1.5 inline size-3.5 align-[-2px]"
                    aria-label="(best estimated 1RM)"
                  />
                ) : null}
              </td>
              <td className="text-muted-foreground py-2 text-right">{formatDate(record.date)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
