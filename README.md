# DevOps Pipeline Playground (Node.js)

A small, good-looking Node.js (Express) app built for practicing a full CI/CD pipeline:

**GitHub Actions → lint/build/test/package → SonarCloud → Docker → AWS ECR → Amazon EKS**

The dashboard shows the running version, git commit, pod name and uptime. After each deploy you can refresh and see the new commit and pod.

---

## Run locally

```bash
npm install
npm run build      # writes dist/build-info.json
npm start          # http://localhost:3000
```

| Script | Jenkins (Maven) equivalent |
|---|---|
| `npm run validate` (eslint) | `mvn validate` |
| `npm run build` | `mvn compile` |
| `npm test` (jest + coverage) | `mvn test` |
| `npm run package` (`npm pack` → `dist/*.tgz`) | `mvn package` |

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Dashboard UI |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/api/info` | Version, commit, pod name, uptime |
| GET | `/api/pipeline` | Pipeline stages |
| POST | `/api/echo` | `{ "message": "hi" }` → echo |

### Docker
```bash
docker build -t nodeapp:v1 .
docker run -p 3000:3000 nodeapp:v1
```

---

## The pipeline: `.github/workflows/ci-cd.yml`

| Jenkins stage | GitHub Actions job / step |
|---|---|
| Checkout FROM Git | `build-test` → `actions/checkout` |
| maven validate / compile / test / package | `build-test` → `npm ci && lint`, `build`, `test`, `package` |
| Sonar Analysis | `sonar` → `SonarSource/sonarqube-scan-action` (SonarCloud) |
| Docker Build | `docker-ecr` → `docker build` + container smoke test |
| Login to AWS and Push Image to ECR | `docker-ecr` → `configure-aws-credentials` + `amazon-ecr-login` + push |
| Deploy To EKS | `deploy-eks` → `aws eks update-kubeconfig` + `kubectl apply` + `rollout status` |

**When does each stage run?**
- **Pull request to `master`:** build, test, Sonar and Docker build/smoke test run. Nothing is pushed or deployed.
- **Push to `master`** (or a manual run): the full pipeline, including the ECR push and the EKS deploy.

Images are tagged with the short git SHA **and** `latest`. The deployment uses the SHA tag, so every push triggers a real rolling update. A deployment that always uses `:latest` won't roll out new pods.

---

## One-time setup

### 1. AWS (OIDC, no access keys)
GitHub Actions signs in to AWS with **OIDC**: each run gets short-lived credentials for the role
`github-actions-deployer-role`. That role trusts **only pushes to `master` in your repo**.

Run these in Git Bash, logged in to AWS as an admin (`aws sts get-caller-identity`):

```bash
cd devops-node-app
bash aws-setup/01-cleanup.sh                                  # only if you tried the access-key setup before
bash aws-setup/02-setup-oidc.sh bkrrajmali/devops-node-app    # <github-owner>/<repo-name>
```

The setup script is safe to re-run. It creates or updates:

| # | Resource | Name |
|---|---|---|
| 1 | GitHub OIDC identity provider | `token.actions.githubusercontent.com` |
| 2 | ECR repository | `devops-node-app` |
| 3 | IAM role and trust policy | `github-actions-deployer-role` |
| 4 | Inline role policy (ECR push, `eks:DescribeCluster`) | `gha-ecr-eks` |
| 5 | EKS auth mode set to `API_AND_CONFIG_MAP` | `practice-eks` |
| 6 | EKS access entry (cluster admin) for the role | `practice-eks` |

> The repo name you pass must match your GitHub repo **exactly**, otherwise the run fails with
> `Not authorized to perform sts:AssumeRoleWithWebIdentity`. If you rename the repo or branch, re-run the script.

### 2. GitHub secret
Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `SONAR_TOKEN` | SonarCloud → My Account → Security → Generate token |

You don't need any AWS secrets.

### 3. SonarCloud
- Import the GitHub repo in SonarCloud under organization `bkrrajmali`.
- Make sure the project key matches `sonar.projectKey` in `sonar-project.properties` (`mynodeapp`).
- In the project's **Administration → Analysis Method**, turn **off** "Automatic Analysis".

### 4. Push
```bash
git init && git add . && git commit -m "Initial commit"
git branch -M master
git remote add origin https://github.com/<you>/devops-node-app.git
git push -u origin master
```

Watch it under the **Actions** tab. The `Deploy To EKS` job summary prints the LoadBalancer URL. A new ELB can take 1–3 minutes to get DNS.

```bash
kubectl get svc devops-node-app   # EXTERNAL-IP = app URL
```

---

## Practice ideas
- Change the version in `package.json`, push, and watch the rolling update on the dashboard.
- Break a test on purpose and see the pipeline stop before Docker.
- Add a SonarCloud Quality Gate check (`SonarSource/sonarqube-quality-gate-action`).
- Tighten the role: swap `AmazonEKSClusterAdminPolicy` for `AmazonEKSEditPolicy` scoped to one namespace.
- Add a `staging` environment with manual approval (`environment: production` + required reviewers).
- Replace the raw manifest with a Helm chart or Kustomize overlays.

## Project layout
```
├── .github/workflows/ci-cd.yml   # the pipeline
├── src/                          # Express app
├── public/                       # dashboard UI
├── tests/                        # jest + supertest
├── scripts/build.js              # "compile" step
├── k8s/nodeapp-deployment.yaml   # Deployment + LoadBalancer Service
├── aws-setup/                    # one-time AWS OIDC setup scripts
├── Dockerfile                    # multi-stage, non-root
└── sonar-project.properties
```
