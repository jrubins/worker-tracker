import type { UpdateSet, WorkoutSet } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { SetEditor } from './set-editor';

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

  if (groups.length === 0) return <p className="text-muted-foreground text-sm">No sets logged.</p>;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={`${group.exerciseId}-${group.sets[0]?.id}`} aria-label={group.exerciseName}>
          <h2 className="mb-1 font-medium">
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: String(group.exerciseId) }}
              className="hover:underline"
            >
              {group.exerciseName}
            </Link>
          </h2>
          <div className="divide-y">
            {group.sets.map((set, index) => (
              <SetEditor
                key={set.id}
                set={set}
                number={index + 1}
                onSave={(changes) => onSaveSet(set.id, changes)}
                onDelete={() => onDeleteSet(set.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
