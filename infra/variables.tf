variable "project_name" {
  description = "Base name for the Vercel, Neon and Sentry projects (e.g. workout-tracker)."
  type        = string
}

# --- GitHub ---

variable "github_owner" {
  description = "GitHub user or organization that owns the repository."
  type        = string
}

variable "github_repository" {
  description = "Repository name (without the owner). Changing it renames the repository."
  type        = string
}

variable "github_visibility" {
  description = "Repository visibility: public or private."
  type        = string
  default     = "public"
}

variable "production_branch" {
  description = "Branch that deploys to production and is protected. Must already exist."
  type        = string
  default     = "main"
}

variable "required_status_checks" {
  description = "CI job names that must pass before a pull request can merge."
  type        = list(string)
  default     = ["check"]
}

# --- Vercel ---

variable "vercel_team_id" {
  description = "Vercel team ID (team_...). Null for a personal (Hobby) account."
  type        = string
  default     = null
}

variable "vercel_function_region" {
  description = "Region for the API function; keep it next to the database (iad1 = us-east-1)."
  type        = string
  default     = "iad1"
}

variable "web_url" {
  description = "Public URL of the web app. Null: https://<project_name>-web.vercel.app."
  type        = string
  default     = null
}

variable "api_url" {
  description = "Public URL of the API. Null: https://<project_name>-api.vercel.app."
  type        = string
  default     = null
}

# --- Neon ---

variable "neon_org_id" {
  description = "Neon organization ID (org-...). Null: the API key's default organization."
  type        = string
  default     = null
}

variable "neon_region" {
  description = "Neon region; keep it next to the API function."
  type        = string
  default     = "aws-us-east-1"
}

variable "neon_pg_version" {
  description = "Postgres major version."
  type        = number
  default     = 19
}

variable "neon_history_retention_seconds" {
  description = "Point-in-time restore window. The Free plan allows at most 6 hours."
  type        = number
  default     = 21600
}

variable "neon_max_cu" {
  description = "Autoscaling ceiling in compute units."
  type        = number
  default     = 1
}

variable "database_url_version" {
  description = "Bump to send DATABASE_URL to Vercel again (e.g. after resetting the role's password)."
  type        = number
  default     = 1
}

# --- Sentry ---

variable "sentry_organization" {
  description = "Sentry organization slug."
  type        = string
}

variable "sentry_traces_sample_rate" {
  description = "Share of requests and page loads traced in production."
  type        = number
  default     = 0.1
}

variable "sentry_sourcemaps_token" {
  description = "Sentry auth token for uploading the web app's source maps during Vercel builds. Never stored in state."
  type        = string
  default     = null
  sensitive   = true
  ephemeral   = true
}

variable "sentry_sourcemaps_token_version" {
  description = "0: no source map upload. Set to 1 (and bump on rotation) to send sentry_sourcemaps_token to Vercel."
  type        = number
  default     = 0
}

# --- App ---

variable "app_timezone" {
  description = "IANA time zone for dates and weeks (APP_TIMEZONE)."
  type        = string
}

variable "workos_client_id" {
  description = "WorkOS client ID (client_...). Not a secret."
  type        = string
}

variable "authkit_domain" {
  description = "AuthKit domain, e.g. https://your-app.authkit.app."
  type        = string
}

variable "allowed_user_ids" {
  description = "WorkOS user IDs (user_...) allowed to use the app. Empty: anyone who can sign in."
  type        = list(string)
  default     = []
}
