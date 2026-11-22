import type { RoutineVersion } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { RoutinePlan } from './routine-plan';

/** Every version of a routine, newest first, with why it changed. */
export function VersionHistory({ versions }: { versions: readonly RoutineVersion[] }) {
  return (
    <ol className="space-y-6">
      {versions.map((version, index) => (
        <li key={version.id} className="space-y-2">
          <h2 className="flex items-center gap-2 font-medium">
            Version {version.version}
            {index === 0 ? <Badge>Current</Badge> : null}
            <span className="text-muted-foreground text-sm font-normal">
              {new Date(version.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </span>
          </h2>
          {version.changeNote ? <p className="text-sm">{version.changeNote}</p> : null}
          <RoutinePlan version={version} />
        </li>
      ))}
    </ol>
  );
}
