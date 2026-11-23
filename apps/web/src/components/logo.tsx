import { Dumbbell } from 'lucide-react';

/** The app's mark: a lime tile with a dumbbell, plus the name unless `compact`. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-[0_0_24px_-4px_var(--primary)]"
      >
        <Dumbbell className="size-4.5" strokeWidth={2.5} />
      </span>
      <span
        className={
          compact
            ? 'sr-only'
            : 'font-display text-lg leading-none font-semibold tracking-wide uppercase'
        }
      >
        Workout Tracker
      </span>
    </span>
  );
}
