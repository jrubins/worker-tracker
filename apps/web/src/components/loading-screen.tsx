import { cn } from 'cn';
import { Dumbbell } from 'lucide-react';

/**
 * Full-screen placeholder while the session or a page's data loads. Nothing is visible for the
 * first half second (most loads, like a reload, finish sooner, so the page doesn't flash); after
 * that the app's mark fades in and gently pulses. Screen readers hear "Loading" straight away.
 * `inline` fits it inside the app layout (a page loading) instead of filling the screen.
 */
export function LoadingScreen({ inline = false }: { inline?: boolean }) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center', inline ? 'min-h-[50svh]' : 'min-h-svh')}
    >
      <span className="sr-only">Loading</span>
      <span
        aria-hidden
        className="animate-in fade-in-0 zoom-in-90 fill-mode-both bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl shadow-[0_0_40px_-6px_var(--primary)] delay-500 duration-500"
      >
        <Dumbbell className="size-6 motion-safe:animate-pulse" strokeWidth={2.5} />
      </span>
    </div>
  );
}
