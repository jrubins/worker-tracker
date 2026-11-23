terraform {
  # 1.11+ for write-only arguments (value_wo), which keep secrets out of the state.
  required_version = ">= 1.17.2"

  # State lives in HCP Terraform. The organization and workspace come from the
  # TF_CLOUD_ORGANIZATION and TF_WORKSPACE environment variables (see README.md).
  # The workspace uses Local execution: plans and applies run in GitHub Actions.
  cloud {}

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "5.27.0"
    }
    neon = {
      source  = "neondatabase/neon"
      version = "0.19.0-beta.4"
    }
    sentry = {
      source  = "jianyuan/sentry"
      version = "0.17.0"
    }
    github = {
      source  = "integrations/github"
      version = "6.13.0"
    }
  }
}
