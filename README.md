# GitOps Version Dashboard

현재 Kubernetes에 배포된 서비스 버전, 이미지 태그, Git Commit, Pod 및 Node 정보를 보여주는 Node.js 기반 대시보드입니다.

## 주요 기능

- 서비스 이름, 환경, 애플리케이션 버전 표시
- ECR 이미지 Repository 및 Commit SHA 기반 이미지 태그 표시
- Git Branch, Commit, GitHub Actions Build Number 표시
- Kubernetes Namespace, Pod, Node 및 Uptime 표시
- `/health` 기반 Kubernetes Liveness/Readiness Probe 지원
- GitHub Actions OIDC 인증을 통한 ECR Push
- 별도 GitOps Repository의 Kustomize 이미지 태그 자동 변경

## 로컬 실행

```bash
npm install
npm test
npm start
```

최초 `npm install` 후 생성되는 `package-lock.json`도 Git에 커밋하는 것을 권장합니다. 잠금 파일을 커밋한 뒤에는 Dockerfile과 GitHub Actions의 `npm install`을 `npm ci`로 변경할 수 있습니다.

접속 주소:

```text
http://localhost:8080
```

## Docker 실행

```bash
docker build -t gitops-version-dashboard:local .
docker run --rm -p 8080:8080 gitops-version-dashboard:local
```

## GitHub Actions 설정

Repository Variable:

```text
AWS_ROLE_ARN=arn:aws:iam::<AWS_ACCOUNT_ID>:role/<GITHUB_ACTIONS_ROLE>
```

Repository Secret:

```text
GITOPS_REPO_TOKEN=<gitops-version-dashboard-config Contents Read/Write 토큰>
```

배포 설정 저장소:

```text
https://github.com/InTaewoo/gitops-version-dashboard-config
```
