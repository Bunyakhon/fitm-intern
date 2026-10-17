const { buildPlan, digest, assertTarget, defineModels, provisionDisposable, PreparationError } = require("./accountPreparation");
const { StringDecoder } = require("node:string_decoder");

// TTY only, no echo and no password in argv/env/source/logs. Restore terminal on every exit path.
function readPassword(input = process.stdin, output = process.stderr) {
  if (!input.isTTY || !input.setRawMode) return Promise.reject(new PreparationError("INTERACTIVE_PRIVATE_TTY_REQUIRED"));
  return new Promise((resolve, reject) => {
    let value = "", finished = false; const wasRaw = !!input.isRaw, decoder = new StringDecoder("utf8");
    const finish = (error) => { if (finished) return; finished = true; input.removeListener("data", onData); input.removeListener("end", onEnd); input.setRawMode(wasRaw); input.pause(); output.write("\n"); error ? reject(error) : resolve(value); value = ""; };
    const onEnd = () => finish(new PreparationError("PASSWORD_INPUT_CANCELLED"));
    const onData = bytes => {
      for (const character of decoder.write(bytes)) {
        if (character === "\u0003" || character === "\u0004") { finish(new PreparationError("PASSWORD_INPUT_CANCELLED")); return; }
        if (character === "\r" || character === "\n") { finish(); return; }
        if (character === "\u007f" || character === "\b") value = Array.from(value).slice(0, -1).join("");
        else if (character >= " " && character !== "\u001b") value += character;
        if (Buffer.byteLength(value, "utf8") > 72) { finish(new PreparationError("PASSWORD_INPUT_TOO_LONG")); return; }
      }
    };
    output.write("Disposable fixture password (hidden): "); input.setRawMode(true); input.resume(); input.on("data", onData); input.on("end", onEnd);
  });
}
async function main(args = process.argv.slice(2)) {
  const switches = new Set(["--disposable", "--inventory", "--apply-disposable"]);
  if (args.some(arg => !switches.has(arg) && !/^--(?:confirm|approval)=[a-z0-9_]+$/.test(arg)) || new Set(args.map(a => a.split("=")[0])).size !== args.length) throw new PreparationError("INVALID_ARGUMENTS");
  const apply = args.includes("--apply-disposable");
  const plan = buildPlan(apply || args.includes("--disposable") ? "disposable" : "review");
  console.log(JSON.stringify({ mode: apply ? "apply_requested" : "dry_run_no_database_connection", digest: digest(plan), counts: plan.counts, blockers: plan.blockers,
    ...(args.includes("--inventory") ? { inventory: plan.master } : {}) }, null, 2));
  if (!apply) return;
  const target = { environment: process.env.NODE_ENV, host: process.env.FITM_FIXTURE_DB_HOST,
    port: Number(process.env.FITM_FIXTURE_DB_PORT), database: process.env.FITM_FIXTURE_DB_NAME, user: process.env.FITM_FIXTURE_DB_USER };
  assertTarget(target);
  const confirmation = args.find(a => a.startsWith("--confirm="))?.slice(10);
  const approvalDigest = args.find(a => a.startsWith("--approval="))?.slice(11);
  if (confirmation !== target.database || approvalDigest !== digest(plan)) throw new PreparationError("EXPLICIT_PLAN_AND_DATABASE_CONFIRMATION_REQUIRED");
  const { Sequelize } = require("sequelize");
  const sequelize = new Sequelize(target.database, target.user, process.env.FITM_FIXTURE_DB_PASSWORD, {
    host: target.host, port: target.port, dialect: "postgres", logging: false,
    dialectOptions: { application_name: "fitm_disposable_account_fixture" }, pool: { max: 1, min: 0, acquire: 10000 },
  });
  let password;
  try {
    password = await readPassword();
    const result = await provisionDisposable({ target, confirmation, approvalDigest, password, models: defineModels(sequelize) });
    console.log(JSON.stringify(result));
  } finally { password = undefined; await sequelize.close(); }
}
if (require.main === module) main().catch(error => { console.error(error instanceof PreparationError ? error.code : "PREPARATION_FAILED_NO_SENSITIVE_DETAILS"); process.exitCode = 1; });
module.exports = { main, readPassword };
