resource "neon_project" "this" {
  name                      = var.project_name
  org_id                    = var.neon_org_id
  region_id                 = var.neon_region
  pg_version                = var.neon_pg_version
  history_retention_seconds = var.neon_history_retention_seconds

  branch = {
    name = "main"
  }
  database_name = local.database_name
  database_user = local.database_role

  primary_compute = {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = var.neon_max_cu
  }

  lifecycle {
    # Destroying the project deletes the database and its backups.
    prevent_destroy = true
  }
}

# Read at plan/apply time and never written to the state.
ephemeral "neon_connection_uri" "app" {
  project_id  = neon_project.this.id
  branch_id   = neon_project.this.branch.id
  endpoint_id = neon_project.this.primary_compute.id
  database    = local.database_name
  role        = local.database_role
}
