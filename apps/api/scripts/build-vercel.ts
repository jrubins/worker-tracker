/**
 * Builds the API for Vercel with the Build Output API (https://vercel.com/docs/build-output-api),
 * without compiling anything: the function contains our .ts sources unchanged, and Node 26 runs
 * them with its built-in type stripping, exactly as in development.
 *
 * Why not Vercel's own api/ handling: it compiles api/*.ts and the files they import to .js, but
 * stops at package imports, so the workspace packages (@app/db, @app/shared), whose exports
 * point at .ts sources, never reach the function (ERR_MODULE_NOT_FOUND).
 *
 * How: @vercel/nft (the file tracer Vercel itself uses) lists every file src/vercel.ts can load,
 * and we copy those files, keeping pnpm's symlinks, into one function that serves every path.
 * Copying only traced files keeps the function small: some dependencies declare build tools
 * (Vite, Prettier, the Sentry CLI) as runtime dependencies that the API never loads.
 *
 * Run by Vercel as the build command (apps/api/vercel.json); locally `pnpm --filter @app/api
 * build`. Output: apps/api/.vercel/output (git-ignored).
 */
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';

const apiDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(apiDir, '..', '..');
const output = join(apiDir, '.vercel', 'output');
const functionDir = join(output, 'functions', 'index.func');
const entry = join(apiDir, 'src', 'vercel.ts');

/**
 * Packages loaded by name at runtime, which tracing can't see, shipped whole: [package, the
 * direct dependency that depends on it]. Sentry registers this one as a module hook to
 * instrument express, pg and http as they load.
 */
const wholePackages = [['@sentry/server-runtime-injection', '@sentry/node']] as const;

// nft parses JavaScript, so it sees each .ts file with its types stripped (the same transform
// Node applies when running it). This only affects the analysis: the copied files are unchanged.
const { fileList } = await nodeFileTrace([entry], {
  base: repoRoot,
  readFile: async (path) => {
    const contents = await readFile(path).catch(() => null);
    if (contents === null || !path.endsWith('.ts') || path.endsWith('.d.ts')) return contents;
    return stripTypeScriptTypes(contents.toString('utf8'));
  },
});

const files = new Set(fileList);
for (const [name, parent] of wholePackages) {
  // pnpm installs a package's dependencies next to it in its store directory.
  const parentDir = await realpath(join(apiDir, 'node_modules', parent));
  const packageDir = await realpath(join(parentDir, relative(parent, name)));
  const entries = await readdir(packageDir, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (e.isFile()) files.add(relative(repoRoot, join(e.parentPath, e.name)));
  }
}

await rm(output, { recursive: true, force: true });
for (const file of [...files].sort()) {
  const source = join(repoRoot, file);
  const target = join(functionDir, file);
  await mkdir(dirname(target), { recursive: true });
  if ((await lstat(source)).isSymbolicLink()) {
    // pnpm links packages into node_modules; keep the links (relative, so they still resolve).
    await symlink(await readlink(source), target);
  } else {
    await copyFile(source, target);
  }
}

// The handler Vercel's Node.js launcher imports: the Express app from our unchanged source.
await writeFile(
  join(functionDir, 'index.mjs'),
  `export { default } from './${relative(repoRoot, entry)}';\n`,
);
await writeJson(join(functionDir, '.vc-config.json'), {
  runtime: 'nodejs26.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
});
// Every path goes to the Express app, which does its own routing (and 404s).
await writeJson(join(output, 'config.json'), {
  version: 3,
  routes: [{ src: '/(.*)', dest: '/index' }],
});

console.log(`Built ${relative(repoRoot, functionDir)} (${files.size} files)`);

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
