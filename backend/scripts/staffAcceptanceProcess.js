const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runStageProcess(command, run = spawnSync) {
  const { executable, args, cwd, logPath, resultPath } = command;
  if (typeof executable !== 'string' || !Array.isArray(args) || args.some(arg => typeof arg !== 'string') ||
      !path.isAbsolute(cwd) || !path.isAbsolute(logPath) || !path.isAbsolute(resultPath) ||
      path.dirname(logPath) !== path.dirname(resultPath)) throw Error('Invalid stage process descriptor');
  const startedAt = new Date().toISOString();
  // Direct file descriptors keep child stderr out of PowerShell's error pipeline.
  // spawnSync waits for child exit, including the child runner's finally/cleanup.
  const log = fs.openSync(logPath, 'wx');
  let result;
  try {
    result = run(executable, args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', log, log] });
  } finally { fs.closeSync(log); }
  const launchError = result.error ? (['ENOENT', 'EACCES', 'EPERM', 'EINVAL'].includes(result.error.code) ? result.error.code : 'PROCESS_ERROR') : null;
  const record = {
    status: !launchError && result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: !launchError && !result.signal && Number.isInteger(result.status) ? result.status : 1,
    launchError, terminated: !!result.signal, startedAt, finishedAt: new Date().toISOString(),
  };
  fs.writeFileSync(resultPath, JSON.stringify(record, null, 2), { flag: 'wx' });
  return record;
}
if (require.main === module) {
  try {
    const descriptor = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
    runStageProcess(descriptor);
    // This controller completed; the suite's real exit code is in process-result.json.
    console.log('Stage process result recorded; inspect the native exit and suite cleanup artifacts.');
  } catch {
    // Use stdout so even controller failure cannot trigger NativeCommandError.
    console.log('Stage process controller failed; no valid native result is available.');
    process.exitCode = 1;
  }
}
module.exports = { runStageProcess };
