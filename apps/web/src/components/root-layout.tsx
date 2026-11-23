import { Link, Outlet, type ErrorComponentProps } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/session';
import { useThemePreference } from '@/lib/theme';
import { SidebarNav, TabBar } from './app-nav';
import { EmptyState } from './empty-state';
import { Logo } from './logo';
import { UserMenu } from './user-menu';

// Devtools are loaded only in development and never shipped in production bundles.
const Devtools = import.meta.env.DEV ? lazy(() => import('@/components/devtools')) : () => null;

/**
 * The app shell: a sidebar on wide screens; on phones a slim top bar and a bottom tab bar.
 */
export function RootLayout() {
  const { user, signOut } = useSession();
  const [theme, setTheme] = useThemePreference();
  const menu = (showName: boolean) =>
    user ? (
      <UserMenu
        user={user}
        onSignOut={() => void signOut()}
        theme={theme}
        onThemeChange={setTheme}
        showName={showName}
      />
    ) : null;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-card/40 sticky top-0 hidden h-screen flex-col gap-8 border-r p-4 md:flex">
        <Link to="/" className="px-2 pt-2">
          <Logo />
        </Link>
        <SidebarNav />
        <div className="mt-auto min-w-0 border-t pt-3">{menu(true)}</div>
      </aside>

      <div className="min-w-0">
        <header className="bg-background/80 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur-lg md:hidden">
          <Link to="/">
            <Logo />
          </Link>
          {menu(false)}
        </header>
        <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:px-10 md:pt-12 md:pb-16">
          <Outlet />
        </main>
      </div>

      <TabBar />
      <Suspense>
        <Devtools />
      </Suspense>
    </div>
  );
}

export function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <EmptyState icon={<TriangleAlert />} title="Something went wrong.">
        {error instanceof Error ? error.message : String(error)}
      </EmptyState>
      <div className="flex justify-center">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <EmptyState icon={<TriangleAlert />} title="Page not found.">
      <Link to="/" className="text-primary hover:underline">
        Back to home
      </Link>
    </EmptyState>
  );
}
