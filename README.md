# GitOps 배포 버전 대시보드

Kubernetes에 실제로 배포된 애플리케이션의 버전과 CI/CD 메타데이터를 웹 화면에서 확인하기 위해 만든 Node.js 대시보드입니다. 단순한 정적 화면이 아니라 현재 요청을 처리한 Pod가 사용하는 이미지 태그, Git Commit, 빌드 번호, Namespace, Pod 및 Node 정보를 런타임 환경 변수로 읽어 보여줍니다.

Istio 카나리 배포 환경에서는 페이지를 새로고침하거나 `/api/info`를 반복 호출하여 v1과 v2 중 어느 Pod가 요청을 처리했는지 확인할 수 있습니다.

## 전체 프로젝트에서의 역할

| 저장소 | 역할 |
| --- | --- |
| [aws-terraform-cicd-project](https://github.com/InTaewoo/aws-terraform-cicd-project) | AWS 네트워크, EC2, ECR, IAM 및 GitHub Actions OIDC 구성 |
| [gitops-version-dashboard](https://github.com/InTaewoo/gitops-version-dashboard) | 이 저장소. 애플리케이션 코드, 테스트, Docker 이미지 및 CI 파이프라인 관리 |
| [gitops-version-dashboard-config](https://github.com/InTaewoo/gitops-version-dashboard-config) | Kubernetes, Argo CD, Kustomize, Istio 및 배포 버전 관리 |

## 구현 목표

- CI가 생성한 이미지가 실제 Kubernetes까지 배포됐는지 화면에서 확인
- `latest` 대신 Git Commit SHA 기반 불변 이미지 태그 사용
- GitHub Actions에서 AWS Access Key 없이 OIDC로 ECR 접근
- 애플리케이션 저장소와 배포 설정 저장소를 분리하는 GitOps 구조 구현
- Argo CD가 GitOps 저장소 변경을 감지해 자동 배포하도록 구성
- v1 안정 버전과 v2 카나리 버전의 응답을 시각적으로 구분
- 헬스체크와 테스트를 배포 전 검증 단계에 포함

## CI/CD 흐름

```text
애플리케이션 master 브랜치 Push
  → GitHub Actions Test Job
  → Node.js 의존성 설치
  → node:test 기반 API 테스트
  → GitHub OIDC 토큰 발급
  → AWS IAM Role 수임
  → Docker 이미지 빌드
  → ECR에 Commit SHA 앞 8자리 태그로 Push
  → GitOps 저장소 Checkout
  → overlays/prod/kustomization.yaml의 v2 이미지 태그 변경
  → overlays/prod/app.env의 빌드 메타데이터 변경
  → GitOps 저장소 master 브랜치에 자동 Commit/Push
  → Argo CD Auto Sync
  → v2 Deployment Rolling Update
  → Istio VirtualService가 v1 90%, v2 10%로 요청 전달
```

Pull Request에서는 테스트 Job만 실행합니다. `master` 브랜치 Push에서만 이미지 빌드, ECR Push 및 GitOps 저장소 갱신이 실행됩니다.

## 주요 기능

### 배포 정보 화면

- 서비스 이름과 실행 환경
- 애플리케이션 버전과 상태
- ECR Repository와 이미지 태그
- Git Branch와 전체 Commit SHA
- GitHub Actions Build Number와 Build Time
- Kubernetes Namespace, Pod 이름 및 Node 이름
- 프로세스 Uptime
- CI/CD 단계 표시
- 30초마다 `/api/info` 자동 갱신
- API 오류 발생 시 화면의 상태를 `Unhealthy`로 변경

### API

#### `GET /health`

Kubernetes Liveness Probe와 Readiness Probe에서 사용하는 엔드포인트입니다.

```json
{
  "status": "ok",
  "timestamp": "2026-08-28T12:20:05.000Z"
}
```

#### `GET /api/info`

현재 요청을 처리한 컨테이너의 배포 정보를 반환합니다.

```json
{
  "service": "gitops-version-dashboard",
  "environment": "production",
  "version": "1.1.0",
  "status": "Healthy",
  "imageRepository": "<AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/gitops-version-dashboard",
  "imageTag": "91eafae9",
  "gitCommit": "91eafae9c51580d51d0a7c2c0c65fa4d168f2e11",
  "gitBranch": "master",
  "buildNumber": "7",
  "buildTime": "2026-08-26T14:29:49Z",
  "namespace": "production",
  "podName": "gitops-version-dashboard-v2-...",
  "nodeName": "k8s-worker",
  "deploymentMethod": "GitHub Actions → ECR → Kustomize → Argo CD",
  "uptimeSeconds": 120
}
```

## 런타임 환경 변수

| 변수 | 설명 | 로컬 기본값 |
| --- | --- | --- |
| `PORT` | 애플리케이션 수신 포트 | `8080` |
| `APP_NAME` | 서비스 이름 | `gitops-version-dashboard` |
| `APP_ENV` | 실행 환경 | `local` |
| `APP_VERSION` | 애플리케이션 버전 | `1.0.0` |
| `IMAGE_REPOSITORY` | 컨테이너 이미지 저장소 | `local/gitops-version-dashboard` |
| `IMAGE_TAG` | 배포 이미지 태그 | `local` |
| `GIT_COMMIT` | 배포된 Git Commit | `local` |
| `GIT_BRANCH` | 배포 브랜치 | `local` |
| `BUILD_NUMBER` | GitHub Actions 실행 번호 | `local` |
| `BUILD_TIME` | UTC 기준 빌드 시각 | 실행 시각 |
| `POD_NAMESPACE` | Kubernetes Namespace | `local` |
| `POD_NAME` | Kubernetes Pod 이름 | 로컬 Hostname |
| `NODE_NAME` | Pod가 실행 중인 Kubernetes Node | `local` |

Kubernetes에서는 `APP_*`, 이미지 및 빌드 정보가 Kustomize로 생성된 ConfigMap에서 주입됩니다. Pod, Namespace 및 Node 정보는 Kubernetes Downward API로 주입됩니다.

## 기술 구성

- Node.js 24
- Express 5
- 정적 HTML, CSS, JavaScript
- Node.js 기본 `node:test` 테스트 러너
- Multi-stage Docker Build
- GitHub Actions
- AWS IAM OIDC Federation
- Amazon ECR
- Kustomize와 Argo CD
- Istio Sidecar, 카나리 라우팅 및 mTLS

## 디렉터리 구조

```text
.
├── .github
│   └── workflows
│       └── ci.yml
├── public
│   ├── app.js
│   ├── index.html
│   └── style.css
├── src
│   ├── app.js
│   └── server.js
├── test
│   └── app.test.js
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

## 로컬 실행

Node.js 24 이상이 필요합니다.

```bash
npm install
npm test
npm start
```

접속 주소:

- 화면: `http://localhost:8080`
- 상태 확인: `http://localhost:8080/health`
- 배포 정보: `http://localhost:8080/api/info`

환경 변수를 지정하여 운영 배포와 유사하게 실행할 수 있습니다.

```powershell
$env:APP_ENV = "local-demo"
$env:APP_VERSION = "1.1.0"
$env:IMAGE_TAG = "local-test"
npm start
```

## 테스트

```bash
npm test
```

현재 자동 테스트 항목:

- `/health`가 HTTP 200과 `status: ok`를 반환하는지 확인
- `/api/info`가 HTTP 200과 서비스 및 상태 정보를 반환하는지 확인

테스트는 임의의 로컬 포트에 Express 서버를 실행하고 실제 HTTP 요청으로 검증합니다.

## Docker 실행

```bash
docker build -t gitops-version-dashboard:local .
docker run --rm -p 8080:8080 gitops-version-dashboard:local
```

Dockerfile의 주요 특징:

- Node.js 24 Alpine 기반 Multi-stage Build
- 운영 의존성만 설치
- 전용 비루트 사용자 `appuser`로 실행
- 컨테이너 포트 `8080` 사용
- 소스와 정적 파일만 최종 이미지에 포함

## GitHub Actions 설정

### Repository Variable

```text
AWS_ROLE_ARN=arn:aws:iam::<AWS_ACCOUNT_ID>:role/<GITHUB_ACTIONS_ROLE>
```

Terraform 저장소가 생성한 `github_actions_role_arn` Output을 등록합니다.

### Repository Secret

```text
GITOPS_REPO_TOKEN=<gitops-version-dashboard-config Contents Read/Write Token>
```

이 Token은 GitOps 저장소의 배포 파일을 변경하고 Push하는 데 사용됩니다. 애플리케이션 저장소 자체의 AWS 인증에는 장기 Access Key가 아니라 OIDC를 사용합니다.

### Workflow 권한

```yaml
permissions:
  contents: read
  id-token: write
```

- `contents: read`: 애플리케이션 코드 Checkout
- `id-token: write`: AWS IAM Role 수임에 필요한 GitHub OIDC 토큰 발급

## 이미지와 배포 메타데이터

GitHub Actions는 Commit SHA 앞 8자리를 이미지 태그로 사용합니다.

```text
ECR_IMAGE=<ACCOUNT_ID>.dkr.ecr.ap-northeast-2.amazonaws.com/gitops-version-dashboard:91eafae9
```

동시에 GitOps 저장소의 다음 값을 변경합니다.

- `overlays/prod/kustomization.yaml`
  - v2 Canary 이미지의 `newTag`
- `overlays/prod/app.env`
  - `APP_VERSION`
  - `IMAGE_TAG`
  - `GIT_COMMIT`
  - `GIT_BRANCH`
  - `BUILD_NUMBER`
  - `BUILD_TIME`

v1 Stable 이미지와 `stable.env`는 자동으로 변경하지 않습니다. 따라서 새 Push가 발생해도 안정 버전은 유지되고 v2만 새로운 이미지로 교체됩니다.

## Kubernetes와 Istio에서 확인

```bash
kubectl get deployment,pod,svc -n production
kubectl get pod -n production -l version=v1 --show-labels
kubectl get pod -n production -l version=v2 --show-labels
```

Istio Ingress Gateway NodePort `30081`을 통해 API를 반복 호출하면 카나리 분배를 확인할 수 있습니다.

```bash
for i in $(seq 1 100); do
  curl -s http://127.0.0.1:30081/api/info | jq -r '.imageTag'
done | sort | uniq -c
```

초기 정책은 v1 90%, v2 10%입니다. 요청 수가 적으면 정확히 90:10이 아니라 통계적 편차가 발생할 수 있습니다.

## 로컬 PC에서 배포 화면 접속

EC2 NodePort를 인터넷에 직접 공개하지 않고 SSM 터널을 사용합니다.

```powershell
aws ssm start-session `
  --target <MASTER_INSTANCE_ID> `
  --document-name AWS-StartPortForwardingSession `
  --parameters "portNumber=30081,localPortNumber=8081" `
  --region ap-northeast-2
```

세션을 유지한 상태에서 `http://localhost:8081`로 접속합니다.

```text
브라우저 localhost:8081
  → SSM 터널
  → Istio Ingress NodePort 30081
  → VirtualService 90/10
  → v1 또는 v2 Pod 8080
```

## 보안과 운영 고려사항

- 애플리케이션 프로세스는 비루트 사용자로 실행합니다.
- Kubernetes 컨테이너는 권한 상승을 금지하고 Linux Capability를 제거합니다.
- Root Filesystem은 읽기 전용으로 설정합니다.
- ECR 이미지 태그는 변경 불가능하며 Push 시 취약점 스캔을 수행합니다.
- AWS 인증은 GitHub OIDC를 사용하여 장기 Access Key 저장을 피합니다.
- Namespace에는 Istio Sidecar를 자동 주입합니다.
- `PeerAuthentication`의 `STRICT` 모드로 Mesh 내부 평문 요청을 차단합니다.
- 애플리케이션 NodePort `30080` 직접 접근은 Istio 라우팅과 mTLS를 우회하므로 운영 경로로 사용하지 않습니다.

## 현재 범위와 개선 방향

- 카나리 Weight 변경은 현재 Git Commit을 통한 수동 승격 방식입니다.
- Prometheus 지표와 Argo Rollouts를 연동하면 성공률과 지연 시간을 기준으로 자동 승격·중단·Rollback을 구현할 수 있습니다.
- Gateway는 현재 HTTP 실습 구성입니다. 운영 환경에서는 도메인, 인증서 및 HTTPS를 적용해야 합니다.
- 단위 테스트 외에 Docker 이미지 취약점 검사, API 통합 테스트 및 부하 테스트를 CI에 추가할 수 있습니다.
