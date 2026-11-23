# Workout Tracker

A personal strength-training log that Claude can read and write. You plan and log workouts in
a normal claude.ai chat; Claude uses this app's tools (an MCP server) to save sessions, recall
what you lifted last time and track progress. The web dashboard is for looking back.

- **Claude tools** (`apps/api/src/features/mcp/mcp.tools.ts`): routines (rotation, with a
  version history of every plan change), logging (a whole session, or set by set as you go;
  past sessions can be imported with their date), corrections, last session, personal records,
  progress, weekly summary, and exercise names (aliases, review, merge).
- **Dashboard:** this week (sessions, sets, volume, streak), weekly volume, recent PRs;
  history with set-level fixes; per-exercise last session, records, progress chart and
  reference links (how-to videos, articles); routines with version history.
- **Training rules:** weights in lb; effort stored as RPE (RIR is converted, RPE = 10 − RIR);
  dates are calendar dates in `APP_TIMEZONE` (America/Chicago), weeks start Monday; estimated
  1RM is Epley. Sets are working, warm-up (counts toward nothing) or drop (adds volume, but
  isn't a set of its own or a record); timed sets (planks, carries) log a duration. Each
  exercise's load type says how weight reads: total, per hand (one dumbbell; volume counts
  both) or bodyweight plus added load (estimates use the logged bodyweight).
- **Exercise names:** logging never blocks on an unknown name. It's saved as a new
  _unconfirmed_ exercise with similar existing ones suggested; at the end of the workout Claude
  asks whether to merge it (the name becomes an alias) or keep it.

Built on [fullstack-template](https://github.com/jrubins/fullstack-template); the rest of this
README describes that foundation.

---

## The template

**Working with AI agents:** [`AGENTS.md`](AGENTS.md) holds the working rules: architecture,
the add-a-feature checklist, testing rules and notes on library APIs newer than most models'
training data. `CLAUDE.md` imports it for Claude Code, and `.claude/settings.json` formats and
lints every file Claude edits.

## Stack

| Area           | Choice                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Runtime        | Node 26 LTS, running TypeScript directly via built-in type stripping (no build step)                  |
| Monorepo       | pnpm 12 workspaces, a version catalog, TypeScript project references                                  |
| Language       | TypeScript 7 (native compiler) for type-checking; TypeScript 6 only for typed lint rules              |
| Web            | React 19, Vite 8, TanStack Router, Query, Form and Charts, Tailwind CSS 4, shadcn/ui                  |
| Component docs | Storybook 10 (with the accessibility addon)                                                           |
| API            | Express 5, Zod 4, pino, helmet; an MCP server (`/mcp`) so AI assistants like Claude can use the app   |
| Auth           | WorkOS AuthKit: web sign-in, and OAuth for MCP clients (Claude custom connectors)                     |
| Database       | Postgres 19, Prisma ORM 8 (release candidate)                                                         |
| Env/secrets    | dotenvx                                                                                               |
| Monitoring     | Sentry: errors, tracing, logs and metrics (API); errors, tracing and session replay (web)             |
| Tests          | Vitest, Testing Library, Supertest (real Postgres), Storybook stories as tests, Playwright end-to-end |
| Hosting        | Vercel (web and API as two projects), Neon (Postgres)                                                 |

## Layout

```
apps/
  api/        Express API. src/ is the app; src/vercel.ts is the Vercel Function entry
  web/        React SPA. src/routes (routing only) → src/pages (page components);
              src/features (feature UI and data hooks); src/components/ui is shadcn
packages/
  shared/     Zod schemas and types shared by the API and web (the API contract)
  db/         Prisma contract, migrations and the database client
docker/       Local Postgres init scripts
```

Workspace packages export their TypeScript source directly. Node strips types at runtime and
Vite bundles them, so there is nothing to build between packages.

## Getting started

Requirements: pnpm 12 and Docker. pnpm runs every script on the Node version pinned in
`package.json` (`devEngines.runtime`, Node 26.13.1) and downloads it if needed, so any
recent Node works to launch pnpm (`npm i -g pnpm@12`, or corepack on Node versions that
still include it).

```sh
pnpm install
pnpm bootstrap      # .env, Postgres 19 in Docker, migrations, test browser (safe to rerun)
pnpm dev            # API on http://localhost:3000, web on http://localhost:5173
```

## Scripts

| Command           | What it does                                                      |
| ----------------- | ----------------------------------------------------------------- |
| `pnpm dev`        | Runs API (`node --watch`) and web (Vite) together                 |
| `pnpm bootstrap`  | One-step setup: .env, Postgres, migrations, Playwright's Chromium |
| `pnpm check`      | Typecheck, lint, format check, tests                              |
| `pnpm e2e`        | End-to-end tests: real web + API + database in Chromium           |
| `pnpm typecheck`  | `tsc -b` with TypeScript 7 across all projects                    |
| `pnpm lint`       | ESLint with type-aware rules                                      |
| `pnpm format`     | Prettier                                                          |
| `pnpm test`       | Unit, API (against `TEST_DATABASE_URL`) and Storybook story tests |
| `pnpm storybook`  | Storybook on http://localhost:6006                                |
| `pnpm db:up/down` | Start/stop local Postgres                                         |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL`                                |

## Conventions

**Node type stripping.** API and package code runs as-is in Node, so only _erasable_
TypeScript is allowed: no `enum`, `namespace` or constructor parameter properties. Use
`as const` objects or unions instead. The compiler enforces this (`erasableSyntaxOnly`).
Relative imports in Node code include the `.ts` extension. Web code is bundled by Vite and
uses extensionless imports and the `@/` alias.

**One contract.** Request and response shapes live in `packages/shared` as Zod schemas. The
API validates input with them. The web app validates responses (`apiRequest`) and forms
(TanStack Form takes the same schema).

**API layers.** `routes` (HTTP and validation) → `service` (logic) → `db`. Throw `HttpError`
for expected failures. The error handler turns anything thrown into
`{ error: { code, message, details? } }` and hides internals on 5xx.

**Routes vs pages.** Route files in `apps/web/src/routes` only declare the route: path, data
loading and which page to render. The page component lives in `src/pages`. That keeps
React Fast Refresh working (it needs files that export only components) and is enforced by
`react-refresh/only-export-components`.

**No code-only escape hatches.** There are no `.js` files: configs are TypeScript too
(`eslint.config.ts`, checked through `tsconfig.config.json`). Unused variables and parameters
are errors with no `_`-prefix exemption. ESLint owns this check, because TypeScript's
`noUnused*` options always exempt `_` names. The one allowance is ESLint's default: an unused
parameter is fine when a later one is used, as in Express's `(req, res) => ...`.

**Adding UI components.** `pnpm dlx shadcn@latest add <component>` from `apps/web`. Current
shadcn components import `cn` from the [`cn`](https://github.com/shadcn-ui/cn) package
(shadcn's replacement for clsx + tailwind-merge).

**API tests share one database and run in parallel.** Tests use the real API and a real
Postgres (`TEST_DATABASE_URL`), migrated once per run. Nothing is cleaned up between tests,
so every test must:

- create the rows it needs, with unique values (`unique('label')` in `apps/api/test/helpers.ts`)
- assert only on rows it created: `toContainEqual(item)`, never `toEqual([...])` or counts
- never delete or update rows it didn't create

This keeps test files independent, so they can run in parallel and even run concurrently
with other test runs against the same database. Queries that tests rely on for ordering need
a deterministic tie-breaker (e.g. `createdAt` then `id`).

## Database workflow (Prisma 8)

The schema is the _contract_ in `packages/db/src/contract.prisma`.

```sh
pnpm --filter @app/db emit                       # regenerate contract.json / contract.d.ts
pnpm --filter @app/db migration:plan --name <x>  # write a migration from the contract change
pnpm db:migrate                                  # apply it
```

`migration:plan` always plans from the latest committed migration. Commit the contract, the
emitted files and the migration. CI fails if the emitted files are
stale, or if the contract has changes that no migration covers (`prisma db verify`).
Prisma's CLI telemetry and AI-agent skill prompts are switched off in `packages/db/prisma.env`.

## Environment variables

Everything is listed with comments in `.env.example`. Locally, dotenvx loads `.env` into each
script. Only `VITE_*` variables reach the browser. To commit secrets safely instead of keeping
a local file, use `pnpm exec dotenvx encrypt` and keep `.env.keys` out of git (it's ignored).

## Auth (WorkOS AuthKit)

Every API route requires a signed-in user except `/health` and the MCP discovery documents.
Data is per user: rows carry the user's ID (`userId`) and services always filter by it.

- **Web:** sign-in runs on the API. The browser reaches the API at `/api` on the web app's own
  origin (a Vercel rewrite in `apps/web/vercel.json`; Vite's proxy in development), so the
  session is a first-party HttpOnly cookie that survives reloads and that page scripts can't
  read. `GET /api/auth/login` sends the browser to AuthKit; `/api/auth/callback` stores WorkOS's
  sealed (encrypted) session in the cookie; the API refreshes it as needed. Cookie-authenticated
  writes must come from the web app's origin (CSRF protection). See `apps/api/src/auth/`.
- **MCP (`POST /mcp`):** Claude and other MCP clients sign in through AuthKit as an OAuth
  server. The API publishes `/.well-known/oauth-protected-resource/mcp` naming AuthKit, and
  accepts AuthKit tokens whose audience is `MCP_RESOURCE_URL`.
- **Without a WorkOS account** (local development, tests): leave `WORKOS_CLIENT_ID` empty. The
  API then offers a "sign in as any user ID" screen (same session cookie) and accepts test
  tokens signed with `AUTH_TEST_SECRET`; every test signs in as its own user. The API refuses
  to start with `AUTH_TEST_SECRET` in production.
- **Single-user apps:** set `ALLOWED_USER_IDS` to your WorkOS user ID.

### Setting up WorkOS

1. Create a free account at workos.com and an AuthKit application.
2. **Redirects:** add `<web URL>/api/auth/callback` as a Redirect URI (for local development,
   `http://localhost:5173/api/auth/callback`), `<web URL>/login` as the **Initiate login URI**,
   and `<web URL>` as the **Sign-out redirect**.
3. **Connect → Configuration:** enable **Client ID Metadata Document** (how Claude registers)
   and **Dynamic Client Registration** (older MCP clients).
4. **Resource Indicators:** add your MCP URL (e.g. `https://api.example.com/mcp`) and set it
   as the default.
5. Set `WORKOS_CLIENT_ID` and `WORKOS_API_KEY` (Developer → API Keys), `WORKOS_COOKIE_PASSWORD`
   (32+ random characters), `WEB_URL`, `AUTHKIT_DOMAIN` (e.g. `https://your-app.authkit.app`)
   and `MCP_RESOURCE_URL`.

The dashboard's layout changes over time; its search box finds each setting.

### Connecting Claude

In claude.ai: **Settings → Connectors → Add custom connector**, with your deployed MCP URL
(e.g. `https://api.example.com/mcp`). Claude discovers AuthKit, you sign in once, and every
chat can use the tools defined in `apps/api/src/features/mcp/mcp.tools.ts`.

## Monitoring (Sentry)

Sentry stays off until a DSN is set (`SENTRY_DSN` for the API, `VITE_SENTRY_DSN` for the web).

- **API:** errors (5xx only), request tracing including Express middleware, `pg` and Prisma
  spans, pino logs sent to Sentry Logs, and custom metrics (`Sentry.metrics.count(...)`, see
  `workouts.logged` and `sets.logged` in the workouts service). `src/instrument.ts` must load before the app: both entry points import
  it first and then load the app with a dynamic `import()`.
- **Web:** errors (including React render errors), page-load and navigation tracing via the
  TanStack Router integration, and session replay. Replays are recorded only when an error
  happens by default, with all text masked and all media blocked.
- **Distributed tracing:** the web app adds trace headers to API requests only, so a page
  load and the API calls it makes appear as one trace.
- **Privacy:** user details, cookies and request bodies are not collected (`dataCollection`
  in both `Sentry.init` calls).
- **Source maps:** set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in the web
  project's Vercel build environment. Maps are uploaded and then deleted, never served.

## Deploying

**Terraform in [`infra/`](infra/README.md) sets all of this up**: the Neon database, both Vercel
projects and their environment variables, Sentry projects and GitHub settings. GitHub Actions
applies it and runs migrations. The steps below describe what it creates, in case you'd rather
do it by hand.

Create **two Vercel projects** from this repo:

1. **Web:** Root Directory `apps/web`. Settings come from `apps/web/vercel.json`. Set
   `VITE_API_URL=/api` and the `VITE_SENTRY_*` variables; `apps/web/vercel.json` rewrites
   `/api/*` to the API.
2. **API:** Root Directory `apps/api`. Settings come from `apps/api/vercel.json`: the build
   (`scripts/build-vercel.ts`) copies `src/vercel.ts` and every file it can load, unchanged,
   into a Build Output API function that serves every path. Nothing is compiled: Node 26 runs
   the `.ts` sources directly, as in development. Set `DATABASE_URL` (Neon's **pooled**
   connection string), `WEB_URL` and `CORS_ORIGINS` (the web URL), `WORKOS_CLIENT_ID`,
   `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `AUTHKIT_DOMAIN`, `MCP_RESOURCE_URL`
   (`<API URL>/mcp`), optionally `ALLOWED_USER_IDS`, and the `SENTRY_*` variables. Never set `AUTH_TEST_SECRET` there.

**Database:** create a Neon project on Postgres 19, preferably through Vercel's Neon
integration, which can give each preview deployment its own database branch. Run migrations
against it with `DATABASE_URL=<neon url> pnpm db:migrate`.

Vercel uses Node 26 from the `engines` field in each package.json.

## Using this as a GitHub template

1. On GitHub: **Settings → General → Template repository**. New repos then come from
   **Use this template**.
2. In a new repo, rename the `@app/*` package scope if you like (search for `@app/`), update
   the root `package.json` name and the `<title>` in `apps/web/index.html`, and replace the
   example `Item` model, routes, pages and stories.

## Notes and caveats

- **Prisma 8 is a release candidate** (`prisma` 8.0.0-rc.34, `@prisma/orm-postgres`
  8.0.0-rc.24), pinned exactly. Move to 8.0.0 when it ships.
- **Two TypeScript versions.** The `typescript` package is 6.0.3 because typescript-eslint,
  Storybook and editors need the TS 6 compiler API, which TS 7 no longer has. TypeScript
  7.0.2 is installed as `typescript7` and runs `pnpm typecheck`.
- **API on Vercel uses the plain Node runtime,** not the Express framework preset. That
  preset's forced type-check resolves ESM imports as CommonJS and fails on packages with dual
  typings (e.g. helmet). Our own `tsc` already checks types.
- **`pg` is overridden to 8.23.1** in `pnpm-workspace.yaml`, because Prisma 8 RC pins older
  versions. One copy also means one thing for Sentry to instrument.
- **pnpm 12 asks before dependencies do anything extra.** Only `esbuild` may run an install
  script (`allowBuilds`). Agent skills from Prisma 8 (ORM), TanStack Router and TanStack
  Charts are approved and linked into `.claude/skills/`; the Prisma Platform skill is
  declined (`permissions`).
