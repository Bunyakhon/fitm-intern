const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runStageProcess } = require('../scripts/staffAcceptanceProcess');
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fitm-process-unit-'));
  const cwd = path.join(directory, 'path with spaces ภาษาไทย'); fs.mkdirSync(cwd);
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('fitm-process-unit-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const marker = path.join(cwd, 'cleanup marker.txt');
  const command = { executable: process.execPath, args: [path.join(__dirname, 'helpers/staffAcceptanceProcessFixture.js'), marker],
    cwd, logPath: path.join(cwd, 'suite.log'), resultPath: path.join(cwd, 'process-result.json') };
  return { marker, command };
}
test('Native stderr does not interrupt child cleanup; controller retains the real nonzero exit', t => {
  const { marker, command } = fixture(t);
  const result = runStageProcess(command);
  assert.equal(result.exitCode, 7); assert.equal(result.status, 'FAIL'); assert.equal(result.launchError, null);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'unit child cleanup completed');
  const log = fs.readFileSync(command.logPath, 'utf8');
  assert.match(log, /diagnostic on stderr/); assert.match(log, /child cleanup completed/);
  assert.equal(JSON.parse(fs.readFileSync(command.resultPath, 'utf8')).exitCode, 7);
});
test('Successful native child still completes cleanup and preserves Unicode/spaced paths', t => {
  const { marker, command } = fixture(t); command.args.push('success');
  const result = runStageProcess(command);
  assert.equal(result.status, 'PASS'); assert.equal(result.exitCode, 0); assert.equal(fs.existsSync(marker), true);
});
test('Launch failure is distinct from product exit and never invents success', t => {
  const { command } = fixture(t); command.executable = path.join(command.cwd, 'missing executable');
  const result = runStageProcess(command);
  assert.equal(result.status, 'FAIL'); assert.equal(result.exitCode, 1); assert.equal(result.launchError, 'ENOENT');
});
test('Process controller refuses to overwrite evidence or accept invalid command descriptors', t => {
  const { command } = fixture(t); fs.writeFileSync(command.logPath, 'previous evidence');
  assert.throws(() => runStageProcess(command), /EEXIST/);
  assert.equal(fs.readFileSync(command.logPath, 'utf8'), 'previous evidence');
  assert.throws(() => runStageProcess({ ...command, args: 'unstructured shell string' }), /descriptor/);
});
test('Process metadata omits arbitrary launch error messages and command/env secrets', t => {
  const { command } = fixture(t);
  const result = runStageProcess(command, () => ({ status: null, error: Object.assign(Error('sensitive remote data'), { code: 'UNKNOWN' }) }));
  assert.equal(result.launchError, 'PROCESS_ERROR');
  assert.equal(JSON.stringify(result).includes('sensitive'), false);
  assert.equal(JSON.stringify(result).includes('args'), false);
});
