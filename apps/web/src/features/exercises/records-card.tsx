import type { PersonalRecords } from '@app/shared';
import { formatDate, formatNumber, formatSet } from '@/lib/format';

export function RecordsCard({ records }: { records: PersonalRecords }) {
  if (!records.bestE1rm) {
    return <p className="text-muted-foreground text-sm">No weighted working sets yet.</p>;
  }
  const best = records.bestE1rm;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-muted-foreground text-sm">Best estimated 1RM</dt>
          <dd className="text-2xl font-semibold">{formatNumber(best.e1rmLb)} lb</dd>
          <dd className="text-muted-foreground text-xs">
            {formatSet({ ...best, rpe: null })} · {formatDate(best.date)}
          </dd>
        </div>
        {records.heaviest ? (
          <div>
            <dt className="text-muted-foreground text-sm">Heaviest set</dt>
            <dd className="text-2xl font-semibold">{formatNumber(records.heaviest.weightLb)} lb</dd>
            <dd className="text-muted-foreground text-xs">
              × {records.heaviest.reps} · {formatDate(records.heaviest.date)}
            </dd>
          </div>
        ) : null}
      </dl>
      <table className="w-full text-sm">
        <caption className="text-muted-foreground mb-1 text-left text-xs">Rep maxes</caption>
        <thead>
          <tr className="text-muted-foreground text-left">
            <th className="font-normal">Reps</th>
            <th className="font-normal">Weight</th>
            <th className="font-normal">Date</th>
          </tr>
        </thead>
        <tbody>
          {records.repMaxes.map((record) => (
            <tr key={record.reps} className="border-t">
              <td className="py-1">{record.reps}</td>
              <td>{formatNumber(record.weightLb)} lb</td>
              <td>{formatDate(record.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
