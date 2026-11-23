terraform {
  # 1.11+ for write-only arguments (value_wo), which keep secrets out of the state.
  required_version = ">= 1.17.2"

  # State lives in a Cloudflare R2 bucket (S3-compatible), locked with a lock file while a
  # run is in progress. The bucket name comes from `-backend-config="bucket=..."` and the
  # endpoint from AWS_ENDPOINT_URL_S3; credentials are an R2 API token in AWS_ACCESS_KEY_ID
  # and AWS_SECRET_ACCESS_KEY (see README.md). The key is fixed: changing it loses the state.
  backend "s3" {
    key          = "workout-tracker/terraform.tfstate"
    region       = "auto"
    use_lockfile = true

    # R2 is not AWS: skip the AWS-only checks.
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }

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
