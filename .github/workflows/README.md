# GitHub Actions Workflows

This directory contains all CI/CD workflows for the OSRS Flip Dashboard project.

## 🚀 Workflows Overview

### Core CI/CD Workflows

#### `ci.yml` - Continuous Integration

**Triggers:** Push to main, Pull requests to main

Runs comprehensive quality checks on all code changes:

- **Quality Checks**: Linting, formatting, type checking
- **Testing**: Full test suite with coverage reporting
- **Build**: Production build verification
- **Circular Dependencies**: Detects circular imports

All checks must pass before a PR can be merged.

---

#### `deploy.yml` - Automated Deployment

**Triggers:** Push to main, Pull requests to main

Automatically deploys the application to Cloudflare Pages:

- **Preview Deployments**: Creates preview environments for each PR
- **Production Deployments**: Deploys to production on merge to main
- **PR Comments**: Posts deployment URLs directly in pull requests

**Required Secrets:**

- `CLOUDFLARE_API_TOKEN`: API token from Cloudflare dashboard
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

---

#### `update-osrs-volumes.yml` - Volume Data Updates

**Triggers:** Scheduled (every 6 hours), Manual dispatch

Keeps OSRS item volume data fresh:

- Runs automatically 4 times daily (12 AM, 6 AM, 12 PM, 6 PM UTC)
- Updates Supabase database with latest volume data
- Can be manually triggered from Actions tab

**Required Secrets:**

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase service role key

---

### Quality & Security Workflows

#### `bundle-size.yml` - Bundle Size Tracking

**Triggers:** Pull requests to main

Monitors application bundle size to prevent bloat:

- Analyzes total bundle size
- Lists largest files and chunks
- Posts size report as PR comment
- Warns if bundle exceeds 5 MB (fails at 10 MB)

---

#### `lighthouse.yml` - Performance Auditing

**Triggers:** Pull requests to main

Runs Lighthouse audits to ensure quality standards:

- Performance
- Accessibility
- Best Practices
- SEO
- PWA compliance

Posts audit results directly in PR comments.

---

#### `codeql.yml` - Security Scanning

**Triggers:** Push to main, Pull requests, Weekly schedule (Mondays 9 AM UTC)

Scans codebase for security vulnerabilities:

- Detects common security issues
- Finds code quality problems
- Runs automatically on all code changes
- Weekly scheduled scans for proactive monitoring

Results available in Security tab → Code scanning alerts.

---

### Automation Workflows

#### `labeler.yml` - Automatic PR Labeling

**Triggers:** PR opened, synchronized, reopened

Automatically labels PRs based on changed files:

- **Type Labels**: `frontend`, `testing`, `documentation`, `ci/cd`, etc.
- **Size Labels**: `size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`

Helps organize and filter pull requests.

---

#### `stale.yml` - Stale Issue Management

**Triggers:** Daily at midnight UTC, Manual dispatch

Automatically manages inactive issues and PRs:

- **Issues**: Marked stale after 60 days, closed after 7 more days
- **PRs**: Marked stale after 30 days, closed after 14 more days
- **Exemptions**: Issues/PRs labeled `pinned`, `security`, or `bug` are never
  marked stale

---

## 🔐 Required Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

| Secret Name             | Description                          | Where to Find                                                                       |
| ----------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token for deployments | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account identifier   | Cloudflare Dashboard → Workers & Pages → Overview                                   |
| `SUPABASE_URL`          | Supabase project URL                 | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API       |
| `SUPABASE_KEY`          | Supabase service role key            | Supabase Dashboard → Project Settings → API → service_role                          |

## 📊 Workflow Status

Check workflow status:

- **Actions Tab**: View all workflow runs
- **PR Checks**: See status checks at the bottom of each PR
- **Status Badges**: Add to README with:

```markdown
![CI Status](https://github.com/1000tomax/OSRS-Flip-Tracker-Combined/workflows/CI/badge.svg)
![Deploy Status](https://github.com/1000tomax/OSRS-Flip-Tracker-Combined/workflows/Deploy%20to%20Cloudflare%20Pages/badge.svg)
```

## 🛠️ Manual Workflow Triggers

Some workflows can be manually triggered:

1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow** button

Manually triggerable workflows:

- `update-osrs-volumes.yml`
- `stale.yml`

## 🐛 Troubleshooting

### Workflow Failing?

1. **Check the logs**: Click on failed workflow → Click on failed job → Review
   logs
2. **Common issues**:
   - Missing secrets (configure in Settings)
   - Node version mismatch (update in workflow file)
   - Dependency conflicts (update package-lock.json)

### Need Help?

- Review [GitHub Actions documentation](https://docs.github.com/en/actions)
- Check workflow syntax with
  [workflow syntax validator](https://github.com/actions/workflow-parser)
- Open an issue if you encounter persistent problems

## 🔄 Updating Workflows

When modifying workflows:

1. Test changes in a feature branch
2. Review workflow logs carefully
3. Update this README if adding new workflows
4. Document any new required secrets

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Pages Deploy Action](https://github.com/cloudflare/wrangler-action)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
