resource "sentry_team" "this" {
  organization = var.sentry_organization
  name         = var.project_name
}

resource "sentry_project" "api" {
  organization = var.sentry_organization
  teams        = [sentry_team.this.slug]
  name         = "${var.project_name}-api"
  platform     = "node-express"
}

resource "sentry_project" "web" {
  organization = var.sentry_organization
  teams        = [sentry_team.this.slug]
  name         = "${var.project_name}-web"
  platform     = "javascript-react"
}

# Each project's default client key. DSNs are public by design (the web app ships its DSN).
data "sentry_key" "api" {
  organization = var.sentry_organization
  project      = sentry_project.api.slug
  first        = true
}

data "sentry_key" "web" {
  organization = var.sentry_organization
  project      = sentry_project.web.slug
  first        = true
}
