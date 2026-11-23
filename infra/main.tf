locals {
  web_url = coalesce(var.web_url, "https://${var.project_name}-web.vercel.app")
  api_url = coalesce(var.api_url, "https://${var.project_name}-api.vercel.app")
  mcp_url = "${local.api_url}/mcp"

  database_name = "app"
  database_role = "app"
}
