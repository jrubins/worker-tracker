import type { UpdateSet, WorkoutSet } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { ListX } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatNumber } from '@/lib/format';
import { SetEditor } from './set-editor';
import { labelSets } from './set-labels';

interface ExerciseSetsProps {
  sets: readonly WorkoutSet[];
  onSaveSet: (id: number, changes: UpdateSet) => Promise<unknown>;
  onDeleteSet: (id: number) => Promise<unknown>;
}

/** A workout's sets, grouped by exercise in the order they were done. */
export function ExerciseSets({ sets, onSaveSet, onDeleteSet }: ExerciseSetsProps) {
  const groups: { exerciseId: number; exerciseName: string; sets: WorkoutSet[] }[] = [];
  for (const set of sets) {
    const last = groups.at(-1);
    if (last && last.exerciseId === set.exerciseId) last.sets.push(set);
    else groups.push({ exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [set] });
  }

  if (groups.length === 0) return <EmptyState icon={<ListX />} title="No sets logged." />;

  return (
    <div className="space-y-4">
      {groups.map((group, index) => {
        const working = group.sets.filter((set) => set.setType === 'working');
        const best = Math.max(0, ...working.map((set) => set.e1rmLb ?? 0));
        return (
          <section
            key={`${group.exerciseId}-${group.sets[0]?.id}`}
            aria-label={group.exerciseName}
            className="bg-card rounded-xl border"
          >
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <span
                aria-hidden
                className="bg-primary text-primary-foreground font-display flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
              >
                {index + 1}
              </span>
              <h2 className="min-w-0 flex-1 truncate font-semibold">
                <Link
                  to="/exercises/$exerciseId"
                  params={{ exerciseId: String(group.exerciseId) }}
                  className="hover:text-primary hover:underline"
                >
                  {group.exerciseName}
                </Link>
              </h2>
              <span className="text-muted-foreground text-xs">
                {working.length} working {working.length === 1 ? 'set' : 'sets'}
                {best > 0 ? ` · best e1RM ${formatNumber(best)} lb` : ''}
              </span>
            </header>
            <div className="divide-y px-4">
              {labelSets(group.sets).map(({ set, label, marker }) => (
                <SetEditor
                  key={set.id}
                  set={set}
                  label={label}
                  marker={marker}
                  onSave={(changes) => onSaveSet(set.id, changes)}
                  onDelete={() => onDeleteSet(set.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
