const express = require("express");
const path = require("path");
const os = require("os");

const app = express();

app.disable("x-powered-by");

function env(name, fallback = "unknown") {
  return process.env[name] || fallback;
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/info", (req, res) => {
  res.status(200).json({
    service: env("APP_NAME", "gitops-version-dashboard"),
    environment: env("APP_ENV", "local"),
    version: env("APP_VERSION", "1.0.0"),
    status: "Healthy",
    imageRepository: env("IMAGE_REPOSITORY", "local/gitops-version-dashboard"),
    imageTag: env("IMAGE_TAG", "local"),
    gitCommit: env("GIT_COMMIT", "local"),
    gitBranch: env("GIT_BRANCH", "local"),
    buildNumber: env("BUILD_NUMBER", "local"),
    buildTime: env("BUILD_TIME", new Date().toISOString()),
    namespace: env("POD_NAMESPACE", "local"),
    podName: env("POD_NAME", os.hostname()),
    nodeName: env("NODE_NAME", "local"),
    deploymentMethod: "GitHub Actions → ECR → Kustomize → Argo CD",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.use(express.static(path.join(__dirname, "../public")));

module.exports = app;

