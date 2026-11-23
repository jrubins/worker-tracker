import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

/**
 * Development-only devtools, kept in the bottom-right corner away from the account menu.
 * On phone-sized screens they would cover the tab bar, so they're left out there.
 */
export default function Devtools() {
  if (!window.matchMedia('(min-width: 768px)').matches) return null;
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </>
  );
}
