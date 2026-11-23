import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth-provider';
import { SessionGate } from './components/session-gate';
import { initSentry } from './lib/sentry';
import { queryClient, router } from './router';
import '@fontsource-variable/inter';
import '@fontsource-variable/oswald';
import './index.css';

initSentry(router);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root, {
  // Report React errors to Sentry (no-ops while Sentry is disabled).
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
