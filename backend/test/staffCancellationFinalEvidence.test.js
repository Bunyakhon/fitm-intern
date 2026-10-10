const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cancellationIds, documentIds, parseTap, validateBrowser, validateEvidence, cleanupRecords, verifyDockerCleanup } = require('../scripts/staffCancellationFinalEvidence');
const { browserArtifactRoot } = require('../scripts/staffBrowserEnvironment');
const id = '1234567890abcdef1234567890abcdef';
function browser(ids) {
  return { summary: { status: 'PASS', runId: id, browserProduct: 'Chrome/154.0.0.0', pass: ids.length, fail: 0, skip: 0,
    runtimeErrorCount: 0, consoleErrorCount: 0, interceptorErrors: [], database: { name: 'fitm_staff_browser_test', marker: 'fitm.a017_disposable=on' },
    steps: ids.map(id => ({ id, status: 'PASS', startedAt: '2026-10-09T01:00:00Z', finishedAt: '2026-10-09T01:00:01Z' })) },
  runner: { status: 'PASS', runId: id, cleanupErrors: [] } };
}
function tap(skips = []) {
  return `TAP version 13\nok 1 - executed case\n${skips.map((name, index) => `ok ${index + 2} - ${name} # SKIP`).join('\n')}\n# tests ${1 + skips.length}\n# pass 1\n# fail 0\n# cancelled 0\n# skipped ${skips.length}\n# todo 0\n`;
}
function fixture(t) {
  // Synthetic validator input only. These fixtures never represent E2E success.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fitm-final-evidence-unit-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('fitm-final-evidence-unit-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  function write(name, value) {
    const file = path.join(directory, name); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
  }
  const suites = ['preflight', 'cancellation', 'documents', 'focused-sql', 'backend-full', 'frontend-regression', 'frontend-build'];
  const final = { runId: id, startedAt: '2026-10-09T00:00:00Z', stages: suites.map(id => ({ id, status: 'PASS', exitCode: 0 })) };
  write('final-summary.json', final);
  for (const [suite, ids, images] of [
    ['cancellation', cancellationIds, ['staff-cancelled-desktop', 'student-cancellation-desktop', 'student-cancellation-mobile', 'staff-cancellation-mobile']],
    ['documents', documentIds, ['staff-desktop', 'staff-mobile']],
  ]) {
    const { summary, runner } = browser(ids); write(`${suite}/summary.json`, summary); write(`${suite}/runner.json`, runner);
    for (const image of images) write(`${suite}/${image}.png`, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
    write(`${suite}/resource-cleanup.json`, { runId: id, finalRunId: id, container: `fitm-staff-browser-${id}`, attempted: true, status: 'PASS', cleanupErrors: [] });
  }
  write('documents/placement-11111111-1111-4111-8111-111111111111-v3.html', '<html>Unit fixture</html>');
  for (const suite of ['focused-sql', 'backend-full', 'frontend-regression']) {
    write(`${suite}/suite.log`, tap(suite === 'frontend-regression' ? ['Student Co-op prerequisite real browser runtime checks'] : []));
    write(`${suite}/resource-cleanup.json`, { runId: id, finalRunId: id, containers: [`fitm-teacher-runner-${id}`, `fitm-teacher-postgres-${id}`], network: `fitm-teacher-test-${id}`, attempted: true, status: 'PASS', cleanupErrors: [] });
  }
  return { directory, write, final };
}
test('Artifact paths are unique per invocation, separate browser suites and reject traversal/mixed modes', () => {
  const env = { FITM_STAFF_BROWSER_RUN_ID: id, FITM_STAFF_FINAL_ACCEPTANCE_RUN_ID: id };
  const root = path.resolve(__dirname, '../..');
  assert.equal(browserArtifactRoot(root, env), path.join(root, 'logs', `staff-cancellation-final-${id}`, 'documents'));
  assert.equal(browserArtifactRoot(root, { ...env, FITM_STAFF_CANCELLATION_BROWSER: '1' }), path.join(root, 'logs', `staff-cancellation-final-${id}`, 'cancellation'));
  assert.throws(() => browserArtifactRoot(root, { ...env, FITM_STAFF_FINAL_ACCEPTANCE_RUN_ID: '../outside' }));
  assert.throws(() => browserArtifactRoot(root, { ...env, FITM_ACTIVITY_CALENDAR_BROWSER: '1' }));
  assert.notEqual(browserArtifactRoot(root, { FITM_STAFF_BROWSER_RUN_ID: id }), browserArtifactRoot(root, { FITM_STAFF_BROWSER_RUN_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
});
test('Browser validator requires actual coverage including Student J, navigation UI and all nine eligibility labels', () => {
  for (const missing of ['J', 'UI', ...cancellationIds.filter(id => id.startsWith('C-'))]) {
    const { summary, runner } = browser(cancellationIds.filter(id => id !== missing));
    assert.throws(() => validateBrowser(summary, runner, cancellationIds), /coverage/);
  }
});
test('Browser validator rejects failed, skipped, duplicated, empty and stale-identity evidence', () => {
  for (const alter of [
    s => { s.status = 'FAIL'; }, s => { s.steps[0].status = 'SKIP'; }, s => { s.steps[0].id = s.steps[1].id; },
    s => { s.steps = []; }, s => { s.pass--; }, s => { s.browserProduct = 'Mock browser'; },
    s => { s.runtimeErrorCount = 1; }, s => { s.runId = 'other'; },
  ]) { const { summary, runner } = browser(cancellationIds); alter(summary); assert.throws(() => validateBrowser(summary, runner, cancellationIds)); }
  const { summary, runner } = browser(documentIds); runner.cleanupErrors.push('failure');
  assert.throws(() => validateBrowser(summary, runner, documentIds), /cleanup/);
});
test('TAP parser rejects incomplete, repeated, failing, cancelled and TODO suites', () => {
  assert.equal(parseTap(tap()).pass, 1);
  for (const invalid of ['', tap() + tap(), tap().replace('# fail 0', '# fail 1'), tap().replace('# cancelled 0', '# cancelled 1'), tap().replace('# todo 0', '# todo 1')]) assert.throws(() => parseTap(invalid));
});
test('Evidence validator records optional skips explicitly and requires complete successful suite evidence', t => {
  const f = fixture(t); const counts = validateEvidence(f.directory);
  assert.equal(counts['frontend-regression'].skipped, 1);
  assert.match(fs.readFileSync(path.join(f.directory, 'test-counts.json'), 'utf8'), /prerequisite real browser/);
  f.final.stages.find(row => row.id === 'documents').status = 'BLOCKED'; f.write('final-summary.json', f.final);
  assert.throws(() => validateEvidence(f.directory), /required acceptance stage/);
});
test('Evidence validator rejects a skipped SQL test and evidence from a previous invocation', t => {
  const f = fixture(t); f.write('focused-sql/suite.log', tap(['Role authentication, scopes, workflow, concurrency and migration on disposable PostgreSQL']));
  assert.throws(() => validateEvidence(f.directory), /skipped/);
  f.write('focused-sql/suite.log', tap()); f.final.startedAt = '2026-10-10T00:00:00Z'; f.write('final-summary.json', f.final);
  assert.throws(() => validateEvidence(f.directory), /predates/);
});
test('Evidence validator reads Windows PowerShell UTF-16LE TAP logs', t => {
  const f = fixture(t);
  f.write('backend-full/suite.log', Buffer.concat([Buffer.from([255, 254]), Buffer.from(tap(), 'utf16le')]));
  assert.equal(validateEvidence(f.directory)['backend-full'].pass, 1);
});
test('Evidence validator rejects absent screenshot/download evidence', t => {
  const f = fixture(t); f.write('documents/staff-mobile.png', 'invalid');
  assert.throws(() => validateEvidence(f.directory), /screenshot/);
  f.write('documents/staff-mobile.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  fs.unlinkSync(path.join(f.directory, 'documents/placement-11111111-1111-4111-8111-111111111111-v3.html'));
  assert.throws(() => validateEvidence(f.directory), /download/);
});
test('Cleanup validator rejects missing records, foreign identities and retained owned browser storage', t => {
  const f = fixture(t); assert.equal(cleanupRecords(f.directory).length, 5);
  f.write('documents/resource-cleanup.json', { runId: id, finalRunId: 'foreign' });
  assert.throws(() => cleanupRecords(f.directory), /identity/);
  f.write('documents/resource-cleanup.json', { runId: id, finalRunId: id, container: `fitm-staff-browser-${id}`, attempted: true, status: 'PASS', cleanupErrors: [] });
  fs.mkdirSync(path.join(f.directory, 'documents/owned-chrome-profile-leftover'));
  assert.throws(() => cleanupRecords(f.directory), /remains/);
});
test('Failed document scenarios can have successful cleanup; missing ownership evidence stays a distinct failure', t => {
  const f = fixture(t);
  f.final.stages.find(row => row.id === 'documents').status = 'FAIL'; f.write('final-summary.json', f.final);
  const document = browser(documentIds); document.summary.status = 'FAIL'; document.runner.status = 'FAIL';
  f.write('documents/summary.json', document.summary); f.write('documents/runner.json', document.runner);
  assert.equal(cleanupRecords(f.directory).length, 5, 'Product failure must not invent a resource leak');
  fs.unlinkSync(path.join(f.directory, 'documents/resource-cleanup.json'));
  assert.throws(() => cleanupRecords(f.directory), /documents: ownership cleanup record is missing; resource state is unverified/);
});
test('Independent cleanup verification is read only, queries only owner labels and rejects Docker denial/leftovers', () => {
  const commands = []; const records = [{ runId: id, attempted: true }];
  verifyDockerCleanup(records, (exe, args) => { commands.push([exe, args]); return { status: 0, stdout: '' }; });
  assert.equal(commands.length, 2);
  for (const [exe, args] of commands) { assert.equal(exe, 'docker'); assert.ok(args.includes(`label=fitm.test-run=${id}`)); assert.equal(args.includes('rm'), false); }
  for (const response of [{ status: 1, stdout: '' }, { status: 0, stdout: 'owned-leftover' }, { status: null, error: Error('denied') }]) {
    assert.throws(() => verifyDockerCleanup(records, () => response), /verification/);
  }
});
