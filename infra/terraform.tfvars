# Non-secret settings for this deployment. Secrets are environment variables in CI.
project_name        = "workout-tracker"
github_owner        = "jrubins"
github_repository   = "worker-tracker"
sentry_organization = "jonbox"
neon_org_id         = "org-dawn-boat-78015684"
# The default <name>.vercel.app addresses were taken, so Vercel assigned these:
web_url          = "https://workout-tracker-web-henna.vercel.app"
api_url          = "https://workout-tracker-api-seven.vercel.app"
app_timezone     = "America/Chicago"
workos_client_id = "client_01M82Z3D2JFVXBTRJ4T4EV21V7"
authkit_domain   = "https://constant-precision-53.authkit.app"
# Only these WorkOS users can use the app (others get 403):
allowed_user_ids = ["user_01M845RVAKQ11513318SG3YAK2"]
