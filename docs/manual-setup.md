# Manual setup

This file records every step that happens outside the code, such as dashboards, accounts and
tokens. Terraform (`infra/`) handles everything else.

**Keep it current:**

- Tick a box when a step is done, and commit the change.
- Add a row whenever a token is created or rotated, or a dashboard setting changes.
- **Never write a secret value here**, even partly. Record only its name, where it lives, its
  scopes and its expiry. The values live in GitHub Actions secrets (you can't read them back
  once they're saved) and, if you want a copy, in your password manager.

## 1. Accounts and one-time setup

- [x] **`main` branch** created from the first development branch. Terraform makes it the
      default branch and protects it.
- [x] **WorkOS** account and AuthKit application created (see section 3 for its settings).
- [x] **Cloudflare R2** (state storage, free tier): [sign up](https://dash.cloudflare.com/sign-up),
      then open [R2](https://dash.cloudflare.com/?to=/:account/r2/overview) and enable it (it asks
      for a payment method even on the free tier). Create a bucket named `terraform-state`; one
      bucket can hold every project's state, each under its own key (this one:
      `workout-tracker/terraform.tfstate`). Copy your **Account ID** from the R2 overview page.
- [x] **Vercel**: [sign up](https://vercel.com/signup) with GitHub, then
      [install the Vercel GitHub app](https://github.com/apps/vercel/installations/new) on
      `jrubins/worker-tracker` only. Both projects were imported in the Vercel dashboard;
      Terraform adopts them on the first apply
      (`infra/imports.tf`): `workout-tracker-web` (`prj_1lKllFNuMm5X7Ot7WO0wE9tvwuur`) and
      `workout-tracker-api` (`prj_r7PvaUIcIte5YWjrAqQcbophNGVp`).
- [x] **Neon**: [sign up](https://console.neon.tech/signup). Terraform creates the project.
- [x] **Sentry**: [sign up](https://sentry.io/signup/), then copy the **Organization Slug** from
      [Settings → General Settings](https://sentry.io/settings/) into `sentry_organization` in
      `infra/terraform.tfvars` (done: `jonbox`).
- [x] **Credentials**: create each one in section 2 and save it as a
      [repository secret](https://github.com/jrubins/worker-tracker/settings/secrets/actions).
- [x] **Repository variables**
      ([Actions variables](https://github.com/jrubins/worker-tracker/settings/variables/actions)):
      `TF_STATE_BUCKET` = `terraform-state`, `CLOUDFLARE_ACCOUNT_ID` = your Cloudflare
      account ID.
- [ ] **First apply**: [Actions → Infrastructure](https://github.com/jrubins/worker-tracker/actions/workflows/infra.yml)
      → **Run workflow** on `main`. Then redeploy both Vercel projects once.
- [ ] **WorkOS production settings** (section 3).
- [ ] **Claude connector**: in [claude.ai Settings → Connectors](https://claude.ai/settings/connectors),
      add a custom connector with the MCP URL (section 4). Sign in once.
- [ ] **Lock the app to you**: copy your WorkOS user ID (`user_...`, under Users in the WorkOS
      dashboard) into `allowed_user_ids` in `infra/terraform.tfvars`, then merge.

## 2. Credentials

All of these are GitHub Actions secrets on this repository, used only by
`.github/workflows/infra.yml`. Prefer an expiry, and note it here so rotation isn't a surprise.

| Secret                    | What it is                                    | Create it at                                                                                    | Permissions                                            | Expires | Last set |
| ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- | -------- |
| `R2_ACCESS_KEY_ID`        | R2 API token: Access Key ID                   | [R2 → Manage API tokens](https://dash.cloudflare.com/?to=/:account/r2/api-tokens)               | Object Read & Write, only the `terraform-state` bucket |         |          |
| `R2_SECRET_ACCESS_KEY`    | R2 API token: Secret Access Key (same token)  | Shown once when you create the token above                                                      | (same token)                                           |         |          |
| `VERCEL_API_TOKEN`        | Vercel access token                           | [Vercel → Account settings → Tokens](https://vercel.com/account/settings/tokens)                | Scope: your personal account (or the team)             |         |          |
| `NEON_API_KEY`            | Neon API key                                  | [Neon → Account settings → API keys](https://console.neon.tech/app/settings/api-keys)           | Personal key (the whole account)                       |         |          |
| `SENTRY_AUTH_TOKEN`       | Sentry personal token for Terraform           | [Sentry → User settings → Personal Tokens](https://sentry.io/settings/account/api/auth-tokens/) | `org:read`, `project:admin`, `team:admin`              |         |          |
| `INFRA_GITHUB_TOKEN`      | Fine-grained personal access token            | [GitHub → Fine-grained tokens → New](https://github.com/settings/personal-access-tokens/new)    | Only `jrubins/worker-tracker`; Administration: RW      |         |          |
| `SENTRY_SOURCEMAPS_TOKEN` | Optional: Sentry organization token (uploads) | [Sentry → Settings → Auth Tokens](https://sentry.io/settings/auth-tokens/)                      | Created with the default organization token scopes     |         |          |

Also set `sentry_sourcemaps_token_version = 1` in `infra/terraform.tfvars` if you add
`SENTRY_SOURCEMAPS_TOKEN`.

**To rotate a credential:** create a new one, overwrite the secret in GitHub, revoke the old
one, and update the "Expires" and "Last set" columns. For `SENTRY_SOURCEMAPS_TOKEN`, also
bump `sentry_sourcemaps_token_version`. For the database password, see `infra/README.md`.

## 3. WorkOS (AuthKit)

WorkOS has no Terraform support for these settings yet, so they're set in the
[dashboard](https://dashboard.workos.com) and recorded here. The client ID and AuthKit domain
aren't secrets. They're also in `infra/terraform.tfvars`.

| Setting                                               | Value                                                             | Done |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| Client ID                                             | `client_01M82Z3D2JFVXBTRJ4T4EV21V7`                               | [x]  |
| AuthKit domain                                        | `https://constant-precision-53.authkit.app`                       | [x]  |
| Redirects → Redirect URI (local)                      | `http://localhost:5173`                                           | [ ]  |
| Redirects → Redirect URI (production)                 | `https://workout-tracker-web.vercel.app`                          | [ ]  |
| Redirects → Initiate login URI                        | `https://workout-tracker-web.vercel.app/login`                    | [ ]  |
| Authentication → allowed origins                      | `http://localhost:5173`, `https://workout-tracker-web.vercel.app` | [ ]  |
| Connect → Configuration → Client ID Metadata Document | Enabled (how Claude registers)                                    | [ ]  |
| Connect → Configuration → Dynamic Client Registration | Enabled (older MCP clients)                                       | [ ]  |
| Resource Indicators                                   | `https://workout-tracker-api.vercel.app/mcp`, set as default      | [ ]  |
| Sign-up                                               | Restricted to you, or locked via `allowed_user_ids`               | [ ]  |

If Vercel assigned different URLs (the first apply prints `web_url`, `api_url` and
`mcp_url`), use those here and in `infra/terraform.tfvars`.

## 4. Live URLs

Fill these in after the first apply.

| What                   | URL                            |
| ---------------------- | ------------------------------ |
| Web app                |                                |
| API                    |                                |
| MCP (Claude connector) |                                |
| Neon project           |                                |
| Sentry projects        |                                |
| Terraform state        | `terraform-state` bucket in R2 |
