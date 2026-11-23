# Infrastructure (Terraform)

Everything the app runs on, as code. GitHub Actions runs it
(`.github/workflows/infra.yml`), and the state lives in a Cloudflare R2 bucket.

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
a manual checklist in [`docs/manual-setup.md`](../docs/manual-setup.md). Cloudflare is used only for
the state bucket for now; DNS comes in when there's a custom domain.

## What runs when

- **Pull request touching `infra/`:** `fmt`, `validate` and `plan`. The plan appears in the
  run's summary.
- **Push to `main`** touching `infra/` or `packages/db/migrations/`, or a manual run: `apply`,
  then migrations against Neon. The migration step uses the direct connection, not the pooler.
- **Vercel** deploys both projects itself on every push to `main`, through its GitHub app.
  Preview deployments are off because they would share the production database.

Migrations and the Vercel deploy start at the same time. Keep migrations backward compatible,
so the old code keeps working until the new code is live (add first, remove later).

## One-time setup and manual steps

Accounts, tokens and WorkOS settings are tracked as a checklist in
[`docs/manual-setup.md`](../docs/manual-setup.md), with links, required scopes and expiry
dates. Update that file whenever a manual step is done or changes.

Vercel names the projects `<project_name>-web` and `<project_name>-api`. If one of the default
`*.vercel.app` URLs is already taken, Vercel assigns another one. In that case, set `web_url`
and `api_url` in `terraform.tfvars` to the URLs Vercel shows.

## Running locally (optional)

```sh
export AWS_ENDPOINT_URL_S3=https://<account-id>.r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...   # R2 API token
export VERCEL_API_TOKEN=... NEON_API_KEY=... SENTRY_AUTH_TOKEN=... GITHUB_TOKEN=...
cd infra && terraform init -backend-config="bucket=<state bucket>" && terraform plan
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
