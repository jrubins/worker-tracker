# Credentials come from environment variables, never from files in this repo:
#   VERCEL_API_TOKEN, NEON_API_KEY, SENTRY_AUTH_TOKEN, GITHUB_TOKEN (see README.md).

provider "vercel" {
  team = var.vercel_team_id
}

provider "neon" {}

provider "sentry" {}

provider "github" {
  owner = var.github_owner
}
