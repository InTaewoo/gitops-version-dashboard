const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");

async function startTestServer(t) {
  let server;

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });

  t.after(() => new Promise((resolve) => server.close(resolve)));

  return server.address().port;
}

test("GET /health returns HTTP 200", async (t) => {
  const port = await startTestServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("GET /api/info returns deployment information", async (t) => {
  const previousVersion = process.env.APP_VERSION;
  const previousPodName = process.env.POD_NAME;

  process.env.APP_VERSION = "1.0.1";
  process.env.POD_NAME = "gitops-version-dashboard-v1-test";

  t.after(() => {
    if (previousVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = previousVersion;
    }

    if (previousPodName === undefined) {
      delete process.env.POD_NAME;
    } else {
      process.env.POD_NAME = previousPodName;
    }
  });

  const port = await startTestServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/api/info`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, "gitops-version-dashboard");
  assert.equal(body.status, "Healthy");
  assert.equal(body.version, "1.0.1");
  assert.equal(body.releaseTrack, "v1");
  assert.equal(body.releaseRole, "Stable");
  assert.match(response.headers.get("cache-control"), /no-store/);
});
