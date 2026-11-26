import type { Exercise } from '@app/shared';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Dumbbell, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const matches = (exercise: Exercise, query: string) =>
  [exercise.name, ...exercise.aliases].some((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase()),
  );

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <li>
      <Link
        to="/exercises/$exerciseId"
        params={{ exerciseId: String(exercise.id) }}
        className="bg-card hover:border-primary/40 hover:bg-accent/40 group flex h-full items-center gap-3 rounded-xl border p-4 transition-colors"
      >
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block font-semibold break-words">{exercise.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {exercise.confirmed ? null : (
              <Badge className="bg-highlight/15 text-highlight">New: review with Claude</Badge>
            )}
            {exercise.equipment ? (
              <Badge variant="secondary" className="capitalize">
                {exercise.equipment}
              </Badge>
            ) : null}
            {exercise.aliases.length ? (
              <span className="text-muted-foreground truncate text-xs">
                also: {exercise.aliases.join(', ')}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="text-muted-foreground group-hover:text-primary size-5 shrink-0"
        />
      </Link>
    </li>
  );
}

/** Every exercise, with a search box; new names awaiting review come first. */
export function ExerciseList({ exercises }: { exercises: readonly Exercise[] }) {
  const [query, setQuery] = useState('');
  if (exercises.length === 0) {
    return (
      <EmptyState icon={<Dumbbell />} title="No exercises yet.">
        They appear as you log workouts with Claude.
      </EmptyState>
    );
  }
  const shown = exercises.filter((exercise) => matches(exercise, query));
  const toReview = shown.filter((exercise) => !exercise.confirmed);
  const confirmed = shown.filter((exercise) => exercise.confirmed);
  const grid = (list: readonly Exercise[]) => (
    <ul className="grid gap-2 sm:grid-cols-2">
      {list.map((exercise) => (
        <ExerciseRow key={exercise.id} exercise={exercise} />
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          aria-label="Search exercises"
          placeholder="Search exercises"
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">No exercises match “{query}”.</p>
      ) : null}
      {toReview.length ? (
        <section aria-label="Needs review" className="space-y-2">
          <h2 className="eyebrow text-highlight">Needs review</h2>
          {grid(toReview)}
        </section>
      ) : null}
      {confirmed.length ? (
        <section aria-label="All exercises" className="space-y-2">
          {toReview.length ? <h2 className="eyebrow">All exercises</h2> : null}
          {grid(confirmed)}
        </section>
      ) : null}
    </div>
  );
}
