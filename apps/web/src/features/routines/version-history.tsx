import type { RoutineVersion } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { RoutinePlan } from './routine-plan';

/** Every version of a routine, newest first, as a timeline with why each one changed. */
export function VersionHistory({ versions }: { versions: readonly RoutineVersion[] }) {
  return (
    <ol className="relative space-y-6 border-l pl-6">
      {versions.map((version, index) => (
        <li key={version.id} className="relative space-y-3">
          <span
            aria-hidden
            className={`absolute top-1.5 -left-[1.95rem] size-3 rounded-full ring-4 ring-[var(--background)] ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'}`}
          />
          <h2 className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl font-semibold tracking-wide uppercase">
              Version {version.version}
            </span>
            {index === 0 ? <Badge className="bg-primary/15 text-primary">Current</Badge> : null}
            <span className="text-muted-foreground text-sm">
              {new Date(version.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </span>
          </h2>
          {version.changeNote ? (
            <p className="bg-secondary/60 rounded-lg px-3 py-2 text-sm">{version.changeNote}</p>
          ) : null}
          <div className="bg-card rounded-xl border px-4 py-1">
            <RoutinePlan version={version} />
          </div>
        </li>
      ))}
    </ol>
  );
}
