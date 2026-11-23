# The repository already exists: Terraform adopts it rather than creating it.
import {
  to = github_repository.this
  id = var.github_repository
}

resource "github_repository" "this" {
  name                   = var.github_repository
  visibility             = var.github_visibility
  has_issues             = true
  has_projects           = true
  has_wiki               = true
  delete_branch_on_merge = true

  # Never delete the repository from Terraform; archive it at most.
  archive_on_destroy = true
  lifecycle {
    prevent_destroy = true
  }
}

resource "github_repository_vulnerability_alerts" "this" {
  repository = github_repository.this.name
  enabled    = true
}

resource "github_branch_default" "this" {
  repository = github_repository.this.name
  branch     = var.production_branch
}

# The production branch only changes through pull requests that pass CI.
resource "github_repository_ruleset" "production" {
  name        = "production"
  repository  = github_repository.this.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count = 0
    }

    required_status_checks {
      strict_required_status_checks_policy = false
      dynamic "required_check" {
        for_each = var.required_status_checks
        content {
          context = required_check.value
        }
      }
    }
  }

  depends_on = [github_branch_default.this]
}

