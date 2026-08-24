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
});

test("GET /api/info returns deployment information", async (t) => {
  const port = await startTestServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/api/info`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, "gitops-version-dashboard");
  assert.equal(body.status, "Healthy");
});

