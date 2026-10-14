const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createDisposable, closeDisposable } = require("./lib/googleOAuth026Backup");
async function main() {
  let target;
  try {
    target = await createDisposable();
    const result = spawnSync(process.execPath, ["--test", "test/googleOAuth026Postgres.test.js"], {
      cwd: path.resolve(__dirname, ".."), windowsHide: true, stdio: "inherit",
      env: { ...process.env, FITM_026_TEST_PORT: String(target.port), FITM_026_TEST_DATABASE: target.database, FITM_026_TEST_CONTAINER: target.name,
        GOOGLE_LOGIN_ENABLED: "false", GOOGLE_ACCOUNT_LINKING_ENABLED: "false" },
    });
    process.exitCode = result.status ?? 1;
  } catch (error) { console.error("Disposable 026 setup stopped:", error.message); process.exitCode = 1; }
  finally { if (target) await closeDisposable(target); }
}
main();
