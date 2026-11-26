// `pnpm --filter @app/db migration:plan --name <slug> [more prisma flags]`
//
// Plans a migration from the latest committed migration to the current contract. Prisma 8
// otherwise needs an explicit origin once migrations exist (`--from`), and the `db` ref it
// would default to tracks a developer's local database, not the committed history.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const packageDir = path.join(import.meta.dirname, '..');
const migrationsDir = path.join(packageDir, 'migrations', 'app');

const args = process.argv.slice(2);
if (!args.includes('--name')) {
  console.error('Usage: pnpm --filter @app/db migration:plan --name <slug>');
  process.exit(1);
}

// The latest migration is the end of the chain: the one whose `to` no other migration starts
// from. Folder names alone can't say (two planned in the same minute share a timestamp).
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{8}T\d{4}_/.test(entry.name))
  .map((entry) => {
    const file = path.join(migrationsDir, entry.name, 'migration.json');
    const { from, to } = JSON.parse(readFileSync(file, 'utf8')) as {
      from: string | null;
      to: string;
    };
    return { name: entry.name, from, to };
  });
const starts = new Set(migrations.map((migration) => migration.from));
const ends = migrations.filter((migration) => !starts.has(migration.to));
if (ends.length > 1) {
  console.error(`Migrations branch: ${ends.map((end) => end.name).join(', ')} all end the chain.`);
  process.exit(1);
}
const latest = ends[0]?.name;

const from = args.includes('--from') ? [] : ['--from', latest ?? '@empty'];
const result = spawnSync('pnpm', ['prisma', 'migration', 'plan', ...from, ...args], {
  cwd: packageDir,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
