import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { LoadingScreen } from './components/loading-screen';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // Preload route data when a link is hovered; TanStack Query owns caching.
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // A page whose data takes over a second shows the loading screen (it fades in itself).
  defaultPendingComponent: () => <LoadingScreen inline />,
});

export type AppRouter = typeof router;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
