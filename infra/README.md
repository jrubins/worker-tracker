# Infrastructure (Terraform)

Everything the app runs on, as code. GitHub Actions runs it
(`.github/workflows/infra.yml`), and the state lives in HCP Terraform.

| File               | Manages                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `neon.tf`          | Neon project (Postgres 19), its `main` branch, `app` database and role              |
| `vercel.tf`        | The web and API projects, their Git connection and production environment variables |
| `sentry.tf`        | A Sentry team plus API and web projects. Their DSNs go into Vercel                  |
| `github.tf`        | Repository settings, default branch, Dependabot alerts, a ruleset protecting `main` |
| `terraform.tfvars` | This deployment's non-secret settings                                               |

**No secrets live in this repo or in the state.** Provider tokens are Actions secrets.
`DATABASE_URL` is read from Neon at apply time (an _ephemeral_ resource) and sent to Vercel as
a _write-only_ value.

**Not managed here:** WorkOS. Its Terraform provider can't configure AuthKit yet, so that stays
a manual checklist (below). Cloudflare comes in when there's a custom domain.

## What runs when

- **Pull request touching `infra/`:** `fmt`, `validate` and `plan`. The plan appears in the
  run's summary.
- **Push to `main`** touching `infra/` or `packages/db/migrations/`, or a manual run: `apply`,
  then migrations against Neon. The migration step uses the direct connection, not the pooler.
- **Vercel** deploys both projects itself on every push to `main`, through its GitHub app.
  Preview deployments are off because they would share the production database.

Migrations and the Vercel deploy start at the same time. Keep migrations backward compatible,
so the old code keeps working until the new code is live (add first, remove later).

## One-time setup

Enter every token in the service's dashboard or in GitHub's secrets page. Never paste one into
a chat or a file.

1. **`main` branch.** Create `main` from the current default branch. Terraform then makes
   `main` the default and protects it: changes need a pull request that passes CI (`check`).
2. **HCP Terraform** (free): create an organization and a **CLI-driven** workspace (e.g.
   `workout-tracker`). In the workspace's settings, set **Execution Mode → Local**. Then create
   a user or team API token.
3. **Vercel:** install the Vercel GitHub app on this repository. Then create an access token
   (Account Settings → Tokens). On a team account, also set `vercel_team_id` in
   `terraform.tfvars`.
4. **Neon:** create an API key (Account settings → API keys). If you belong to several
   organizations, set `neon_org_id`.
5. **Sentry:** put your organization slug in `terraform.tfvars` (`sentry_organization`). Then
   create a token (Settings → Developer Settings → Personal Tokens) with `org:read`,
   `project:admin` and `team:admin`.
   - **Optional source maps:** create an organization auth token (Settings → Auth Tokens) and
     set `sentry_sourcemaps_token_version = 1`.
6. **GitHub:** create a fine-grained personal access token for this repository only, with
   **Administration: Read and write**. Metadata access comes with it.
7. **Repository secrets** (Settings → Secrets and variables → Actions):
   - Secrets: `TF_API_TOKEN`, `VERCEL_API_TOKEN`, `NEON_API_KEY`, `SENTRY_AUTH_TOKEN`,
     `INFRA_GITHUB_TOKEN`, and optionally `SENTRY_SOURCEMAPS_TOKEN`.
   - Variables: `TF_CLOUD_ORGANIZATION` and `TF_WORKSPACE`.
8. **First apply:** run the **Infrastructure** workflow (Actions → Run workflow, on `main`).
   It creates everything and migrates the new database. Then redeploy both Vercel projects
   once, or push a commit, because they were created after the last push.

Vercel names the projects `<project_name>-web` and `<project_name>-api`. If one of the default
`*.vercel.app` URLs is already taken, Vercel assigns another one. In that case, set `web_url`
and `api_url` in `terraform.tfvars` to the URLs Vercel shows.

## WorkOS checklist (manual)

In the WorkOS dashboard, using the `web_url` and `mcp_url` outputs:

1. **Redirects:** add the web URL as a Redirect URI, and `<web URL>/login` as the Initiate
   login URI.
2. **Authentication → allowed origins:** add the web URL.
3. **Connect → Configuration:** enable **Client ID Metadata Document** and **Dynamic Client
   Registration**.
4. **Resource Indicators:** add the MCP URL and make it the default.
5. After your first sign-in, copy your user ID (`user_...`) into `allowed_user_ids` in
   `terraform.tfvars`, and merge that change. The app then accepts only you.

Then connect Claude: in claude.ai, go to **Settings → Connectors → Add custom connector** and
enter the MCP URL.

## Running locally (optional)

```sh
terraform login                     # HCP Terraform token
export TF_CLOUD_ORGANIZATION=... TF_WORKSPACE=...
export VERCEL_API_TOKEN=... NEON_API_KEY=... SENTRY_AUTH_TOKEN=... GITHUB_TOKEN=...
cd infra && terraform init && terraform plan
```

## Changing things

- **Settings:** edit `terraform.tfvars` or the `.tf` files and open a pull request. Review
  the plan, then merge.
- **Rotating the database password:** reset it in Neon, bump `database_url_version`, and
  apply.
- **Rotating the source-map token:** update the secret, bump
  `sentry_sourcemaps_token_version`, and apply.
- **Renaming the repository:** change `github_repository`. This renames it on GitHub and
  updates Vercel's Git connection.
- **Protected from deletion:** the Neon project and the repository have `prevent_destroy`, and
  the repository is archived rather than deleted.
