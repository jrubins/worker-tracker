import { Link } from '@tanstack/react-router';
import { CalendarDays, Dumbbell, House, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from 'cn';

const navLinks: readonly { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/routines', label: 'Routines', icon: ListChecks },
];

/** Vertical navigation for the desktop sidebar. */
export function SidebarNav() {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {navLinks.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === '/' }}
          className={cn(
            'text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            '[&.active]:bg-primary/10 [&.active]:text-foreground [&.active_svg]:text-primary',
          )}
        >
          <Icon className="size-4.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar for phones. */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="text-muted-foreground [&.active]:text-primary flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
