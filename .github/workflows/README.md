# CI/CD Pipelines

This directory contains GitHub Actions workflows for comprehensive CI/CD automation of the DokanX platform.

## Workflows Overview

### 🔄 `backend-ci.yml`
**Backend API CI/CD Pipeline**
- **Triggers**: Push/PR to `main`/`develop` branches affecting backend code
- **Jobs**:
  - `test`: Linting, testing, coverage reporting
  - `build`: Docker image build and push to GHCR
  - `deploy-staging`: Deploy to staging environment
  - `deploy-production`: Deploy to production with smoke tests

### 🎨 `frontend-ci.yml`
**Frontend Applications CI/CD Pipeline**
- **Triggers**: Push/PR to `main`/`develop` branches affecting frontend code
- **Jobs**:
  - `test-*`: Individual testing for each Next.js app (storefront, merchant-dashboard, admin-panel, developer-portal)
  - `build-and-deploy`: Matrix build for all frontend apps
  - `deploy-staging/production`: Environment-specific deployments

### 📱 `mobile-ci.yml`
**Mobile Applications CI/CD Pipeline**
- **Triggers**: Push/PR to `main`/`develop` branches affecting mobile code
- **Jobs**:
  - `test-mobile`: Testing and linting
  - `build-android`: Android APK build and artifact upload
  - `build-ios`: iOS IPA build and artifact upload
  - `deploy-*`: App Store/TestFlight deployments

### 🔒 `security-quality.yml`
**Security and Quality Gates**
- **Triggers**: All pushes/PRs, plus daily scheduled runs
- **Jobs**:
  - `security-scan`: Trivy vulnerability scanning
  - `dependency-check`: NPM audit for all packages
  - `code-quality`: ESLint across all codebases
  - `sonarcloud`: Code quality analysis
  - `performance-test`: Lighthouse CI for frontend performance

### 📦 `release.yml`
**Release Management**
- **Triggers**: Git tags matching `v*.*.*` pattern
- **Jobs**:
  - `release`: GitHub release creation with auto-generated notes
  - `deploy-production`: Versioned production deployment

### 🗄️ `database-ops.yml`
**Database Operations**
- **Triggers**: Manual workflow dispatch
- **Operations**:
  - `backup`: Database backup to cloud storage
  - `restore`: Database restore from backup
  - `migrate`: Run database migrations

## Environment Setup

### Required Secrets

Add these secrets to your GitHub repository:

#### Kubernetes Access
```
KUBE_CONFIG_STAGING     # Base64 encoded kubeconfig for staging
KUBE_CONFIG_PRODUCTION  # Base64 encoded kubeconfig for production
```

#### Container Registry
```
GITHUB_TOKEN            # Auto-provided by GitHub Actions
```

#### Code Quality
```
SONAR_TOKEN             # SonarCloud authentication token
SONAR_ORGANIZATION      # SonarCloud organization name
```

#### Mobile App Deployment
```
PLAY_STORE_SERVICE_ACCOUNT  # Google Play Store service account JSON
```

### Required Environment Variables

#### Staging Environment
- Name: `staging`
- Auto-deployment from `develop` branch

#### Production Environment
- Name: `production`
- Auto-deployment from `main` branch
- Requires manual approval for releases

## Branch Strategy

```
main (production) ────┐
                      ├── Release tags (v1.0.0, v1.1.0, etc.)
develop (staging) ────┘
   │
   ├── feature/feature-name
   ├── bugfix/bug-description
   └── hotfix/critical-fix
```

## Deployment Flow

### Development → Staging
1. Push feature branch → PR → Merge to `develop`
2. Automatic testing and building
3. Deploy to staging environment
4. Manual testing and validation

### Staging → Production
1. Merge `develop` → `main` branch
2. Automatic production deployment
3. Smoke tests execution
4. Release tag creation (manual or automated)

## Manual Operations

### Database Operations
Use the "Database Operations" workflow for:
- **Backup**: Scheduled daily or manual trigger
- **Restore**: Point-in-time recovery
- **Migration**: Schema updates and data migrations

### Emergency Deployments
For urgent fixes:
1. Create hotfix branch from `main`
2. Push changes and create PR
3. Merge to `main` for immediate production deployment

## Monitoring and Alerts

### Pipeline Monitoring
- All workflows send notifications on failure
- Check GitHub Actions tab for pipeline status
- Review deployment logs in Kubernetes

### Quality Gates
- Security scans run on every PR
- Code coverage reports uploaded to Codecov
- SonarCloud quality gates must pass

### Performance Monitoring
- Lighthouse CI runs on production deployments
- Performance budgets configured in `lighthouse.config.js`

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version compatibility
- Verify dependency versions in `package-lock.json`
- Review build logs for specific errors

#### Deployment Failures
- Check Kubernetes cluster connectivity
- Verify image pull secrets
- Review pod logs: `kubectl logs -n dokanx deployment/dokanx-backend`

#### Test Failures
- Run tests locally: `npm test`
- Check test environment setup
- Review test coverage requirements

### Rollback Procedures

#### Automatic Rollback
```bash
# Rollback deployment
kubectl rollout undo deployment/dokanx-backend -n dokanx

# Check rollout status
kubectl rollout status deployment/dokanx-backend -n dokanx
```

#### Manual Rollback
1. Identify working commit/tag
2. Update deployment image manually
3. Verify application health

## Security Considerations

- **Secret Management**: All secrets stored in GitHub Secrets
- **Vulnerability Scanning**: Trivy scans on every push
- **Dependency Auditing**: NPM audit runs daily
- **Access Control**: Branch protection rules enforced

## Performance Optimization

- **Build Caching**: Docker layer caching enabled
- **Parallel Jobs**: Matrix builds for frontend applications
- **Artifact Management**: Build artifacts cached and reused
- **Resource Limits**: CPU/memory limits configured in workflows

## Cost Optimization

- **Spot Instances**: Consider using spot instances for CI runners
- **Caching**: Maximize use of GitHub Actions caching
- **Parallel Execution**: Run jobs in parallel where possible
- **Scheduled Runs**: Limit automated runs to necessary frequency

## Future Enhancements

## Backend Deployment Notes

- `backend-ci.yml` now expects backend web, backend worker, and backend scheduler deployments to roll together.
- `release.yml` now verifies both health and `metrics?format=prometheus` after production rollout.
- Queue and outbox observability should be checked after every backend deployment before considering the release stable.

- **Multi-cloud deployment**: Support for AWS EKS, Google GKE
- **Blue-green deployments**: Zero-downtime deployment strategy
- **Canary releases**: Gradual rollout with traffic splitting
- **Integration testing**: End-to-end test automation
- **Performance testing**: Load testing integration
