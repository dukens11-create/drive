# CI/CD and Deployment

This repository currently contains two runnable applications:

- `.` → backend API (Node.js + TypeScript + Express)
- `mobile/` → driver mobile app (Expo)

The workflows in `.github/workflows/` are set up to validate those applications today and to automatically pick up additional app workspaces later when they are added at `admin/`, `apps/admin`, `passenger-web/`, `apps/passenger-web`, `passenger-mobile/`, or `apps/passenger-mobile`.

## GitHub Actions

- `ci.yml`
  - Runs backend install/build/test/audit checks
  - Runs mobile install/typecheck/Jest coverage/export/audit checks
  - Runs dependency review on pull requests
  - Lints and templates the `helm/drive-platform` chart
  - Runs `terraform fmt -check -recursive terraform`, `terraform init -backend=false`, and `terraform validate`
  - Auto-builds optional admin/passenger app workspaces when their `package.json` files exist
- `codeql.yml`
  - Runs CodeQL on pull requests, protected branches, and weekly on a schedule
- `release.yml`
  - Uses Release Please for semantic versioning and changelog generation for the backend and mobile app
- `deploy.yml`
  - Publishes an environment-tagged backend image to GHCR after a successful smoke test
  - Renders environment-specific Helm manifests from `helm/drive-platform`
  - `main` pushes target `development`
  - `release/**` pushes target `staging`
  - `workflow_dispatch` supports manual `production` promotion through GitHub Environments approvals

## Helm and Terraform

- `helm/drive-platform` packages application workloads, PostgreSQL, Redis, RabbitMQ, ingress, RBAC, Prometheus, Grafana, Alertmanager, Elasticsearch, Logstash, Kibana, and Filebeat into a single deployable chart.
- `terraform/` provisions AWS primitives for the platform: VPC, subnets, NAT gateways, EKS, ECR, PostgreSQL, ElastiCache, MSK, S3, CloudFront, Route53, CloudWatch, SNS, Secrets Manager, and IAM.
- Use environment-specific tfvars from `terraform/environments/` for development, staging, and production plans.

Example infrastructure validation commands:

```bash
helm lint ./helm/drive-platform
helm template drive-platform ./helm/drive-platform --namespace drive-development >/tmp/rendered-helm.yaml
cd terraform && terraform init -backend=false && terraform validate
```

Do not commit runtime secrets to `values.yaml` or `.tfvars`. Provide Terraform secrets via `TF_VAR_db_password`, `TF_VAR_jwt_secret`, and `TF_VAR_stripe_webhook_secret`, and bind Kubernetes runtime secrets through an existing secret named `drive-platform-secrets` (or override `secretManagement.secretName`).

## Mobile build and release

- PR and branch validation use `npm run export:ci` to generate Android and iOS bundles from `mobile/`
- Production-style mobile APK builds continue to run through `codemagic.yaml`
- Set `EXPO_TOKEN` in Codemagic before triggering release builds

## Local development infrastructure

Use Docker Compose for a production-like local stack with Redis, the API, and the queue worker:

```bash
cp .env.development.example .env
docker compose up --build
```

Health endpoint:

- `http://localhost:8080/health`

## Environment configuration

Example environment files:

- `.env.development.example`
- `.env.staging.example`
- `.env.production.example`

Use GitHub Environments to store real secrets for staging and production. The deploy workflow expects environment approvals and secrets to be configured in GitHub rather than committed to the repository.

Before using manual production promotion, configure the `production` GitHub Environment with required reviewers so `workflow_dispatch` runs cannot publish to production without approval.

## Release workflow

Release Please opens or updates a release PR from commits merged into `main`. Once merged, it updates package versions and changelogs for:

- root backend package
- `mobile/` package

## Rollback

- Re-deploy the previous GHCR image tag for the target environment
- Re-run the `Deploy` workflow with a known-good release branch or commit
- For mobile, rebuild the previous release through Codemagic/EAS

## Security and audit policy

- CI enforces `npm audit --audit-level=high` for the backend and mobile dependencies
- Moderate advisories remain visible in local `npm audit` output, but do not block the pipeline
- If a high-severity advisory must be accepted temporarily, document the mitigation in the PR and pin or override the affected dependency in the same change

## Branch protection recommendations

Configure the repository to require these checks before merge:

- `CI / backend`
- `CI / mobile`
- `CI / dependency-review`
- `CodeQL / analyze`
