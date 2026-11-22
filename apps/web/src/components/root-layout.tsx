import { Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/session';
import { UserMenu } from './user-menu';

// Devtools are loaded only in development and never shipped in production bundles.
const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : () => null;

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/routines', label: 'Routines' },
] as const;

export function RootLayout() {
  const { user, signOut } = useSession();
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="font-semibold whitespace-nowrap">Workout Tracker</span>
        <nav className="flex flex-wrap gap-4 text-sm">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="text-muted-foreground [&.active]:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        {user ? <UserMenu user={user} onSignOut={signOut} /> : null}
      </header>
      <main>
        <Outlet />
      </main>
      <Suspense>
        <Devtools />
      </Suspense>
    </div>
  );
}

export function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="space-y-3">
      <p className="font-medium">Something went wrong.</p>
      <p className="text-muted-foreground text-sm">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

export function NotFound() {
  return <p className="text-muted-foreground">Page not found.</p>;
}
