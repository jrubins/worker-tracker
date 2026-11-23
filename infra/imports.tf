# Resources that were created by hand before Terraform managed them. Terraform adopts them on
# the first apply instead of creating duplicates; afterwards these blocks have no effect.

# Both Vercel projects were imported from GitHub in the Vercel dashboard.
import {
  to = vercel_project.web
  id = "prj_1lKllFNuMm5X7Ot7WO0wE9tvwuur"
}

import {
  to = vercel_project.api
  id = "prj_r7PvaUIcIte5YWjrAqQcbophNGVp"
}
