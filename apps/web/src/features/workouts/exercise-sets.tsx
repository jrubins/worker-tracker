import type { UpdateSet } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { ListX, Repeat } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatNumber } from '@/lib/format';
import { SetEditor } from './set-editor';
import { groupSets, roundsOf, type ExerciseGroup } from './set-blocks';
import { labelSets } from './set-labels';

/** Labels offered when marking a superset on the page (Claude can use any letter). */
const SUPERSET_CHOICES = ['A', 'B', 'C', 'D', 'E', 'F'];

interface SetActions {
  onSaveSet: (id: number, changes: UpdateSet) => Promise<unknown>;
  onDeleteSet: (id: number) => Promise<unknown>;
  /** Marks an exercise as part of a superset, or clears it (null). Hidden when omitted. */
  onSetSuperset?: (exerciseId: number, superset: string | null) => Promise<unknown>;
}

interface ExerciseSetsProps extends SetActions {
  sets: Parameters<typeof groupSets>[0];
}

/**
 * A workout's sets, grouped by exercise in the order they were done. Exercises done as a
 * superset share one box, each with its own sets, labeled A1, A2...
 */
export function ExerciseSets({ sets, ...actions }: ExerciseSetsProps) {
  const blocks = groupSets(sets);
  if (blocks.length === 0) return <EmptyState icon={<ListX />} title="No sets logged." />;

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const first = block.exercises[0];
        const key = `${block.superset ?? 'plain'}-${first?.sets[0]?.id}`;
        if (block.superset === null) {
          return first ? (
            <ExerciseCard key={key} group={first} badge={String(index + 1)} {...actions} />
          ) : null;
        }
        const rounds = roundsOf(block);
        return (
          <section
            key={key}
            aria-label={`Superset ${block.superset}`}
            className="border-primary/30 bg-primary/5 space-y-2 rounded-2xl border p-2"
          >
            <p className="text-primary flex items-center gap-1.5 px-2 pt-1 text-xs font-semibold tracking-wide uppercase">
              <Repeat className="size-3.5" aria-hidden />
              Superset {block.superset}
              {rounds > 0 ? (
                <span className="text-muted-foreground font-normal tracking-normal normal-case">
                  · {rounds} {rounds === 1 ? 'round' : 'rounds'}
                </span>
              ) : null}
            </p>
            {block.exercises.map((group, position) => (
              <ExerciseCard
                key={group.exerciseId}
                group={group}
                badge={`${block.superset}${position + 1}`}
                superset={block.superset}
                {...actions}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

interface ExerciseCardProps extends SetActions {
  group: ExerciseGroup;
  /** "1" for a plain exercise, "A1" inside superset A. */
  badge: string;
  superset?: string | null;
}

function ExerciseCard({
  group,
  badge,
  superset = null,
  onSaveSet,
  onDeleteSet,
  onSetSuperset,
}: ExerciseCardProps) {
  const working = group.sets.filter((set) => set.setType === 'working');
  const best = Math.max(0, ...working.map((set) => set.e1rmLb ?? 0));
  const choices =
    superset && !SUPERSET_CHOICES.includes(superset)
      ? [...SUPERSET_CHOICES, superset]
      : SUPERSET_CHOICES;
  const pickerId = `superset-${group.exerciseId}-${group.sets[0]?.id}`;

  return (
    <section aria-label={group.exerciseName} className="bg-card rounded-xl border">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground font-display flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1 text-sm font-semibold"
        >
          {badge}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="leading-snug font-semibold break-words">
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(group.exerciseId) }}
              className="hover:text-primary hover:underline"
            >
              {group.exerciseName}
            </Link>
          </h2>
          <p className="text-muted-foreground text-xs">
            {working.length} working {working.length === 1 ? 'set' : 'sets'}
            {best > 0 ? ` · best e1RM ${formatNumber(best)} lb` : ''}
          </p>
        </div>
        {onSetSuperset ? (
          <>
            <label htmlFor={pickerId} className="sr-only">
              Superset for {group.exerciseName}
            </label>
            <select
              id={pickerId}
              className="text-muted-foreground hover:border-input focus-visible:border-input focus-visible:ring-ring/50 h-7 shrink-0 rounded-md border border-transparent bg-transparent px-1.5 text-xs outline-none focus-visible:ring-[3px]"
              value={superset ?? ''}
              onChange={(event) => void onSetSuperset(group.exerciseId, event.target.value || null)}
            >
              <option value="">No superset</option>
              {choices.map((label) => (
                <option key={label} value={label}>
                  Superset {label}
                </option>
              ))}
            </select>
          </>
        ) : null}
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
}
