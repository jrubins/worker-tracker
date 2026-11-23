/**
 * Builds the API for Vercel with the Build Output API (https://vercel.com/docs/build-output-api):
 * esbuild bundles src/vercel.ts, the workspace packages and every dependency into one ESM file,
 * and a single function handles every path.
 *
 * Why not Vercel's own TypeScript support for api/: it compiles our .ts files to .js but leaves
 * the workspace packages' `exports` pointing at .ts sources it doesn't ship, so the function
 * fails with ERR_MODULE_NOT_FOUND. Bundling sidesteps that.
 *
 * Run by Vercel as the build command (apps/api/vercel.json); `pnpm --filter @app/api build`
 * runs it locally. Output: apps/api/.vercel/output (git-ignored).
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = `${root}.vercel/output`;
const fn = `${output}/functions/index.func`;

await rm(output, { recursive: true, force: true });
await mkdir(fn, { recursive: true });

await build({
  entryPoints: [`${root}src/vercel.ts`],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  sourcemap: true,
  logLevel: 'warning',
  // Optional native bindings that pg never loads unless asked to.
  external: ['pg-native'],
  // Bundled CommonJS dependencies still call require() for Node built-ins.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});

await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: 'nodejs26.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddSourcemapSupport: true,
    },
    null,
    2,
  ),
);

// Every path goes to the Express app, which does its own routing (and 404s).
await writeFile(
  `${output}/config.json`,
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/index' }] }, null, 2),
);

console.log(`Built ${fn}/index.mjs`);
