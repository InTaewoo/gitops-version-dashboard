function setText(id, value) {
  document.getElementById(id).textContent = value || "-";
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

async function loadDeploymentInfo() {
  const statusBadge = document.getElementById("status-badge");

  try {
    const response = await fetch("/api/info", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    setText("service", data.service);
    setText("environment", data.environment.toUpperCase());
    setText("version", `v${data.version}`);
    setText("status", data.status);
    setText("image-repository", data.imageRepository);
    setText("image-tag", data.imageTag);
    setText("git-commit", data.gitCommit);
    setText("git-branch", data.gitBranch);
    setText("build-number", `GitHub Actions #${data.buildNumber}`);
    setText("build-time", formatTime(data.buildTime));
    setText("namespace", data.namespace);
    setText("pod-name", data.podName);
    setText("node-name", data.nodeName);
    setText("uptime", formatUptime(data.uptimeSeconds));
    setText("last-updated", `Updated ${new Date().toLocaleTimeString("ko-KR")}`);

    statusBadge.textContent = "● Healthy";
    statusBadge.className = "badge healthy";
  } catch (error) {
    statusBadge.textContent = "● Unhealthy";
    statusBadge.className = "badge unhealthy";
    setText("last-updated", error.message);
  }
}

loadDeploymentInfo();
setInterval(loadDeploymentInfo, 30000);

