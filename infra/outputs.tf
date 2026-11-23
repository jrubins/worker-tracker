output "web_url" {
  value = local.web_url
}

output "api_url" {
  value = local.api_url
}

output "mcp_url" {
  description = "Add this to claude.ai as a custom connector, and as a Resource Indicator in WorkOS."
  value       = local.mcp_url
}

output "neon_project_id" {
  value = neon_project.this.id
}
