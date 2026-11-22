import type { Exercise } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';

export function ExerciseList({ exercises }: { exercises: readonly Exercise[] }) {
  if (exercises.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No exercises yet. They appear as you log.</p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <Link
            to="/exercises/$exerciseId"
            params={{ exerciseId: String(exercise.id) }}
            className="hover:bg-accent flex flex-wrap items-center gap-2 px-4 py-3"
          >
            <span className="font-medium">{exercise.name}</span>
            {exercise.confirmed ? null : <Badge variant="outline">New: review with Claude</Badge>}
            {exercise.aliases.length ? (
              <span className="text-muted-foreground text-sm">
                also: {exercise.aliases.join(', ')}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
