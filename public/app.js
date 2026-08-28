const RELEASES = {
  v1: {
    role: "STABLE",
    roleKo: "안정 버전",
    expectedVersion: "1.0.1"
  },
  v2: {
    role: "CANARY",
    roleKo: "신규 검증 버전",
    expectedVersion: "1.1.0"
  }
};

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "-";
  }
}

function formatTime(value) {
  if (!value || value === "unknown") {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간 ${minutes}분`;
  }

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분 ${seconds}초`;
}

function resolveReleaseTrack(data) {
  if (data.releaseTrack === "v1" || data.releaseTrack === "v2") {
    return data.releaseTrack;
  }

  const podMatch = data.podName?.match(/(?:^|-)v([12])(?:-|$)/);

  if (podMatch) {
    return `v${podMatch[1]}`;
  }

  if (data.version === RELEASES.v1.expectedVersion) {
    return "v1";
  }

  if (data.version === RELEASES.v2.expectedVersion) {
    return "v2";
  }

  return "unknown";
}

function updateReleaseHighlight(data) {
  const track = resolveReleaseTrack(data);
  const release = RELEASES[track];
  const currentRelease = document.getElementById("current-release");

  document.body.dataset.release = track;
  currentRelease.className = `current-release ${track}`;

  if (!release) {
    setText("current-track", "UNKNOWN");
    setText("current-role", "배포 트랙을 확인할 수 없습니다");
    setText("summary-track", "Unknown");
  } else {
    setText("current-track", track.toUpperCase());
    setText("current-role", `${release.role} · ${release.roleKo}`);
    setText("summary-track", `${track.toUpperCase()} ${release.role}`);
  }

  setText("current-version", `Application v${data.version}`);
  setText("current-image", `Image ${data.imageTag}`);

  ["v1", "v2"].forEach((candidate) => {
    const card = document.getElementById(`release-${candidate}-card`);
    const state = document.getElementById(`release-${candidate}-state`);
    const isActive = candidate === track;

    card.classList.toggle("is-active", isActive);
    state.textContent = isActive ? "● 현재 요청 처리" : "현재 요청 아님";
  });
}

async function loadDeploymentInfo() {
  const statusBadge = document.getElementById("status-badge");

  try {
    const response = await fetch(`/api/info?request=${Date.now()}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    updateReleaseHighlight(data);
    setText("service", data.service);
    setText("environment", data.environment.toUpperCase());
    setText("version", `v${data.version}`);
    setText("status", data.status);
    setText("image-repository", data.imageRepository);
    setText("image-tag", data.imageTag);
    setText("image-tag-summary", data.imageTag);
    setText("git-commit", data.gitCommit);
    setText("git-branch", data.gitBranch);
    setText("build-number", `GitHub Actions #${data.buildNumber}`);
    setText("build-time", formatTime(data.buildTime));
    setText("namespace", data.namespace);
    setText("pod-name", data.podName);
    setText("node-name", data.nodeName);
    setText("uptime", formatUptime(data.uptimeSeconds));
    setText("last-updated", `마지막 확인 ${new Date().toLocaleTimeString("ko-KR")}`);

    statusBadge.textContent = "● Healthy";
    statusBadge.className = "badge healthy";
  } catch (error) {
    document.getElementById("current-release").className = "current-release error";
    setText("current-track", "ERROR");
    setText("current-role", "배포 정보를 가져오지 못했습니다");
    statusBadge.textContent = "● Unhealthy";
    statusBadge.className = "badge unhealthy";
    setText("last-updated", error.message);
  }
}

loadDeploymentInfo();
setInterval(loadDeploymentInfo, 30000);
