const express = require("express");
const path = require("path");
const os = require("os");

const app = express();

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

function env(name, fallback = "unknown") {
  return process.env[name] || fallback;
}

function detectReleaseTrack(podName, version) {
  const explicitTrack = env("RELEASE_TRACK", "").toLowerCase();

  if (explicitTrack === "v1" || explicitTrack === "v2") {
    return explicitTrack;
  }

  const podTrack = podName.match(/(?:^|-)v([12])(?:-|$)/);

  if (podTrack) {
    return `v${podTrack[1]}`;
  }

  if (version === "1.0.1") {
    return "v1";
  }

  if (version === "1.1.0") {
    return "v2";
  }

  return "unknown";
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/info", (req, res) => {
  const version = env("APP_VERSION", "1.0.0");
  const podName = env("POD_NAME", os.hostname());
  const releaseTrack = detectReleaseTrack(podName, version);

  res.status(200).json({
    service: env("APP_NAME", "gitops-version-dashboard"),
    environment: env("APP_ENV", "local"),
    version,
    releaseTrack,
    releaseRole: releaseTrack === "v1" ? "Stable" : releaseTrack === "v2" ? "Canary" : "Unknown",
    status: "Healthy",
    imageRepository: env("IMAGE_REPOSITORY", "local/gitops-version-dashboard"),
    imageTag: env("IMAGE_TAG", "local"),
    gitCommit: env("GIT_COMMIT", "local"),
    gitBranch: env("GIT_BRANCH", "local"),
    buildNumber: env("BUILD_NUMBER", "local"),
    buildTime: env("BUILD_TIME", new Date().toISOString()),
    namespace: env("POD_NAMESPACE", "local"),
    podName,
    nodeName: env("NODE_NAME", "local"),
    deploymentMethod: "GitHub Actions → ECR → Kustomize → Argo CD",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.use(express.static(path.join(__dirname, "../public")));

module.exports = app;
