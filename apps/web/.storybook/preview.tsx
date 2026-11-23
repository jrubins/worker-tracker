import type { Decorator, Preview } from '@storybook/react-vite';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import '@fontsource-variable/inter';
import '@fontsource-variable/oswald';
import '../src/index.css';

// Stories render in the app's default dark theme.
document.documentElement.classList.add('dark');

/**
 * Renders each story inside an in-memory TanStack Router, so components with `<Link>` work in
 * isolation. Links resolve to hrefs; navigating stays inside the story.
 */
const withRouter: Decorator = (Story) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: Story }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return <RouterProvider router={router} />;
};

const preview: Preview = {
  decorators: [withRouter],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // Fail stories on accessibility violations in the a11y panel.
    a11y: { test: 'error' },
  },
};

export default preview;
