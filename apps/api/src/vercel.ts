// Vercel Function entry point. scripts/build-vercel.ts bundles this file (with the workspace
// packages and dependencies) into a Build Output API function that handles every path, and
// Vercel calls the default-exported Express app for each request. Sentry initialises first.
await import('./instrument.ts');
const { bootstrap } = await import('./bootstrap.ts');

export default bootstrap().app;
