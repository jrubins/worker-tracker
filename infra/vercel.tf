# Two projects from the same repository. Build settings live in each app's vercel.json;
# Terraform owns the project, its Git connection and its environment variables.
# Preview deployments are off: they would share the production database and API.

locals {
  git_repository = {
    type              = "github"
    repo              = "${var.github_owner}/${var.github_repository}"
    production_branch = var.production_branch
  }
  production = ["production"]
}

resource "vercel_project" "web" {
  name                                 = "${var.project_name}-web"
  framework                            = "vite"
  root_directory                       = "apps/web"
  git_repository                       = local.git_repository
  preview_deployments_disabled         = true
  enable_affected_projects_deployments = true
}

resource "vercel_project" "api" {
  name                                 = "${var.project_name}-api"
  root_directory                       = "apps/api"
  git_repository                       = local.git_repository
  serverless_function_region           = var.vercel_function_region
  preview_deployments_disabled         = true
  enable_affected_projects_deployments = true
}

resource "vercel_project_environment_variables" "web" {
  project_id = vercel_project.web.id
  variables = [
    for key, value in {
      VITE_API_URL                            = local.api_url
      VITE_WORKOS_CLIENT_ID                   = var.workos_client_id
      VITE_SENTRY_DSN                         = data.sentry_key.web.dsn["public"]
      VITE_SENTRY_ENVIRONMENT                 = "production"
      VITE_SENTRY_TRACES_SAMPLE_RATE          = tostring(var.sentry_traces_sample_rate)
      VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE = "1.0"
      VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE  = "0"
      # Source map upload during the build (the token itself is set below).
      SENTRY_ORG     = var.sentry_organization
      SENTRY_PROJECT = sentry_project.web.slug
    } : { key = key, value = value, target = local.production, sensitive = false }
  ]
}

resource "vercel_project_environment_variables" "api" {
  project_id = vercel_project.api.id
  variables = [
    for key, value in merge(
      {
        CORS_ORIGINS              = local.web_url
        APP_TIMEZONE              = var.app_timezone
        LOG_LEVEL                 = "info"
        WORKOS_CLIENT_ID          = var.workos_client_id
        AUTHKIT_DOMAIN            = var.authkit_domain
        MCP_RESOURCE_URL          = local.mcp_url
        SENTRY_DSN                = data.sentry_key.api.dsn["public"]
        SENTRY_ENVIRONMENT        = "production"
        SENTRY_TRACES_SAMPLE_RATE = tostring(var.sentry_traces_sample_rate)
      },
      # Vercel rejects empty values, so the allowlist is only set when it has entries.
      length(var.allowed_user_ids) > 0 ? { ALLOWED_USER_IDS = join(",", var.allowed_user_ids) } : {},
    ) : { key = key, value = value, target = local.production, sensitive = false }
  ]
}

# Secrets use write-only values: sent to Vercel, never stored in the Terraform state.
resource "vercel_project_environment_variable" "database_url" {
  project_id       = vercel_project.api.id
  key              = "DATABASE_URL"
  comment          = "Neon pooled connection (managed by Terraform)"
  value_wo         = ephemeral.neon_connection_uri.app.uri_pooler
  value_wo_version = var.database_url_version
  target           = local.production
  sensitive        = true
}

resource "vercel_project_environment_variable" "sentry_sourcemaps_token" {
  count = var.sentry_sourcemaps_token_version > 0 ? 1 : 0

  project_id       = vercel_project.web.id
  key              = "SENTRY_AUTH_TOKEN"
  comment          = "Uploads source maps to Sentry during builds (managed by Terraform)"
  value_wo         = var.sentry_sourcemaps_token
  value_wo_version = var.sentry_sourcemaps_token_version
  target           = local.production
  sensitive        = true
}
