// Fresh Docker PostgreSQL only. Never reads Development credentials or DB_NAME.
const { execFileSync, spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const name = "fitm-google-test-" + randomBytes(8).toString("hex");
let created = false;
const docker = args => execFileSync("docker", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
async function main() {
  try {
    docker(["run", "-d", "--name", name, "--label", "fitm.google.synthetic=" + name,
      "-e", "POSTGRES_DB=fitm_google_test", "-e", "POSTGRES_PASSWORD=synthetic-test-only",
      "-p", "127.0.0.1::5432", "postgres:16-alpine"]); created = true;
    for (let i = 0; i < 40; i++) {
      try { docker(["exec", name, "pg_isready", "-U", "postgres", "-d", "fitm_google_test"]); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    const details = JSON.parse(docker(["inspect", name]))[0];
    if (details.Config.Labels["fitm.google.synthetic"] !== name) throw Error("Synthetic container guard failed");
    const port = details.NetworkSettings.Ports["5432/tcp"][0];
    if (port.HostIp !== "127.0.0.1") throw Error("Synthetic port guard failed");
    const result = spawnSync(process.execPath, ["--test", "test/googleAuthPostgres.test.js"], {
      cwd: require("node:path").resolve(__dirname, ".."), windowsHide: true, stdio: "inherit",
      env: { ...process.env, FITM_GOOGLE_TEST_PORT: port.HostPort, FITM_GOOGLE_TEST_CONTAINER: name } });
    process.exitCode = result.status ?? 1;
  } catch { console.error("Isolated Google OAuth integration setup failed; no Development database targeted"); process.exitCode = 1; }
  finally {
    if (created) {
      const details = JSON.parse(docker(["inspect", name]))[0];
      if (details.Name !== "/" + name || details.Config.Labels["fitm.google.synthetic"] !== name) throw Error("Cleanup guard failed");
      docker(["rm", "-f", "-v", name]);
    }
  }
}
main();
