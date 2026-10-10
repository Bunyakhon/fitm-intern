const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cancellationIds = ['A', 'B', 'D', 'E', 'F-G', 'C-advisor_review', 'C-submitted', 'C-staff_review',
  'C-department_head_review', 'C-approved', 'C-document_issued', 'C-in_progress', 'C-rejected', 'C-cancelled',
  'G-SQL', 'H-status', 'H-time', 'I-400', 'I-404', 'I-500', 'I-network', 'I-401', 'I-403', 'A-security', 'K', 'L', 'J', 'UI'];
const documentIds = ['login', 'document-modal-focus', 'cooperation', 'response-modal-focus', 'response-validation',
  'response-history', 'placement', 'document-controls', 'immutable-revisions', 'rejected-response', 'mobile', 'network-recovery', 'integrity'];
const resourceSuites = ['cancellation', 'documents', 'focused-sql', 'backend-full', 'frontend-regression'];
function requireEvidence(condition, message) {
  if (!condition) { const error = Error(message); error.safeMessage = message; throw error; }
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function readLog(file) {
  const data = fs.readFileSync(file);
  // Windows PowerShell 5.1 redirection can emit UTF-16LE; PowerShell 7 uses UTF-8.
  return data.subarray(0, 2).equals(Buffer.from([255, 254])) ? data.subarray(2).toString('utf16le') : data.toString('utf8').replace(/^\uFEFF/, '');
}
function parseTap(log) {
  const count = name => {
    const matches = [...log.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`, 'gm'))];
    requireEvidence(matches.length === 1, 'A suite must contain exactly one complete TAP summary');
    return Number(matches[0][1]);
  };
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(key => [key, count(key)]));
  requireEvidence(counts.tests > 0 && counts.pass > 0 && counts.fail === 0 && counts.cancelled === 0 && counts.todo === 0,
    'A test suite has no executed success or contains failures/cancellation/TODO');
  requireEvidence(counts.tests === counts.pass + counts.skipped, 'Inconsistent TAP test counts');
  counts.skippedTests = [...log.matchAll(/^\s*ok \d+ - (.+?) # SKIP(?: .*)?\r?$/gm)].map(match => match[1]);
  requireEvidence(counts.skippedTests.length === counts.skipped, 'Skipped tests are not fully identified');
  return counts;
}
function validateBrowser(summary, runner, expectedIds) {
  requireEvidence(summary.status === 'PASS' && runner.status === 'PASS', 'Browser suite or Node runner did not pass');
  requireEvidence(/^Chrome\/\d+/.test(summary.browserProduct || ''), 'Actual Chrome product is missing');
  requireEvidence(/^[a-f0-9]{32}$/.test(summary.runId || '') && runner.runId === summary.runId, 'Browser run identities do not match');
  requireEvidence(Array.isArray(summary.steps), 'Browser scenario entries are missing');
  const ids = summary.steps.map(step => step.id);
  requireEvidence(ids.length === expectedIds.length && new Set(ids).size === ids.length && expectedIds.every(id => ids.includes(id)),
    'Browser coverage is incomplete or duplicated');
  requireEvidence(summary.steps.every(step => step.status === 'PASS' && Date.parse(step.finishedAt) >= Date.parse(step.startedAt)),
    'A browser scenario is unexecuted, failed or lacks valid timestamps');
  requireEvidence(summary.pass === ids.length && summary.fail === 0 && summary.skip === 0, 'Browser counts do not match scenarios');
  requireEvidence(summary.runtimeErrorCount === 0 && summary.consoleErrorCount === 0, 'Unexpected browser application errors');
  requireEvidence(Array.isArray(runner.cleanupErrors) && runner.cleanupErrors.length === 0, 'Node owned-resource cleanup failed');
}
function validateEvidence(directory) {
  const final = readJson(path.join(directory, 'final-summary.json'));
  const required = ['preflight', ...resourceSuites, 'frontend-build'];
  for (const id of required) requireEvidence(final.stages.some(stage => stage.id === id && stage.status === 'PASS' && stage.exitCode === 0), 'A required acceptance stage did not pass');
  for (const [suite, ids, screenshots] of [
    ['cancellation', cancellationIds, ['staff-cancelled-desktop', 'student-cancellation-desktop', 'student-cancellation-mobile', 'staff-cancellation-mobile']],
    ['documents', documentIds, ['staff-desktop', 'staff-mobile']],
  ]) {
    const summary = readJson(path.join(directory, suite, 'summary.json'));
    validateBrowser(summary, readJson(path.join(directory, suite, 'runner.json')), ids);
    requireEvidence(Date.parse(summary.steps[0].startedAt) >= Date.parse(final.startedAt), 'Browser evidence predates this acceptance invocation');
    if (suite === 'cancellation') requireEvidence(Array.isArray(summary.interceptorErrors) && summary.interceptorErrors.length === 0 &&
      summary.database?.name === 'fitm_staff_browser_test' && summary.database?.marker === 'fitm.a017_disposable=on', 'Cancellation isolation or interception evidence is missing');
    for (const screenshot of screenshots) {
      const data = fs.readFileSync(path.join(directory, suite, `${screenshot}.png`));
      requireEvidence(data.length > 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Required screenshot is absent or invalid');
    }
  }
  requireEvidence(fs.readdirSync(path.join(directory, 'documents')).some(name => /^placement-[a-f0-9-]+-v3\.html$/.test(name)), 'Real document download artifact is missing');
  const results = {};
  for (const suite of ['focused-sql', 'backend-full', 'frontend-regression']) {
    const counts = parseTap(readLog(path.join(directory, suite, 'suite.log')));
    // The optional standalone prerequisite browser fixture is not a production
    // Cancellation/Document E2E. Record its skip rather than claiming it ran.
    const allowedSkips = suite === 'frontend-regression' ? ['Student Co-op prerequisite real browser runtime checks'] : [];
    requireEvidence(counts.skippedTests.every(name => allowedSkips.includes(name)), 'A required SQL/backend/frontend test was skipped');
    results[suite] = counts;
  }
  fs.writeFileSync(path.join(directory, 'test-counts.json'), JSON.stringify(results, null, 2));
  return results;
}
function cleanupRecords(directory) {
  const final = readJson(path.join(directory, 'final-summary.json'));
  const records = [];
  for (const suite of resourceSuites) {
    const stage = final.stages.find(row => row.id === suite);
    if (!stage || stage.status === 'BLOCKED' || stage.status === 'SKIP') continue;
    let record;
    try { record = readJson(path.join(directory, suite, 'resource-cleanup.json')); }
    catch (error) {
      requireEvidence(false, error.code === 'ENOENT'
        ? `${suite}: ownership cleanup record is missing; resource state is unverified`
        : `${suite}: ownership cleanup record could not be read safely; resource state is unverified`);
    }
    requireEvidence(record.finalRunId === final.runId && /^[a-f0-9]{32}$/.test(record.runId || ''), 'Cleanup ownership identity is invalid');
    requireEvidence(typeof record.attempted === 'boolean' && (stage.status !== 'PASS' || record.attempted), 'Resource creation/cleanup evidence is missing');
    requireEvidence(record.status === 'PASS' && Array.isArray(record.cleanupErrors) && !record.cleanupErrors.length, 'Owned-resource cleanup was not verified');
    if (['cancellation', 'documents'].includes(suite)) {
      requireEvidence(record.container === `fitm-staff-browser-${record.runId}`, 'Unexpected browser container identity');
      if (stage.status === 'PASS') requireEvidence(readJson(path.join(directory, suite, 'summary.json')).runId === record.runId, 'Browser and PowerShell cleanup identities do not match');
      requireEvidence(!fs.readdirSync(path.join(directory, suite)).some(name => /^owned-(chrome-profile|private-storage)-/.test(name)), 'An owned browser profile or storage directory remains');
    } else {
      requireEvidence(record.network === `fitm-teacher-test-${record.runId}` && Array.isArray(record.containers) &&
        record.containers.length === 2 && record.containers.includes(`fitm-teacher-runner-${record.runId}`) &&
        record.containers.includes(`fitm-teacher-postgres-${record.runId}`), 'Unexpected SQL resource identity');
    }
    records.push(record);
  }
  return records;
}
function verifyDockerCleanup(records, run = spawnSync) {
  for (const record of records.filter(row => row.attempted)) {
    for (const args of [
      ['ps', '-a', '--filter', `label=fitm.test-run=${record.runId}`, '--format', '{{.Names}}'],
      ['network', 'ls', '--filter', `label=fitm.test-run=${record.runId}`, '--format', '{{.Name}}'],
    ]) {
      const result = run('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
      requireEvidence(result.status === 0 && !result.error && !result.stdout?.trim(), 'Independent Docker cleanup verification failed or owned resources remain');
    }
  }
}
if (require.main === module) {
  try {
    const [mode, input] = process.argv.slice(2);
    const directory = path.resolve(input || '');
    requireEvidence(path.dirname(directory) === path.resolve(__dirname, '../../logs') &&
      /^staff-cancellation-final-[a-f0-9]{32}$/.test(path.basename(directory)), 'Invalid acceptance evidence directory');
    const final = readJson(path.join(directory, 'final-summary.json'));
    requireEvidence(path.basename(directory) === `staff-cancellation-final-${final.runId}`, 'Final acceptance identity mismatch');
    if (mode === 'evidence') {
      const counts = validateEvidence(directory);
      console.log(JSON.stringify(counts, null, 2));
      console.log('Required browser, SQL/backend/frontend and artifact evidence: PASS');
    } else if (mode === 'cleanup') {
      const records = cleanupRecords(directory);
      verifyDockerCleanup(records);
      console.log(`Cleanup verification: PASS; ${records.length} executed resource suites checked`);
    } else throw Error('Unknown evidence validation operation');
  } catch (error) {
    // Neither external JSON nor docker stderr is echoed: it may contain secrets.
    console.log(`Acceptance evidence/cleanup validation failed: ${error.safeMessage || 'A required local artifact could not be read. Inspect this run directory.'}`);
    process.exitCode = 1;
  }
}
module.exports = { cancellationIds, documentIds, parseTap, validateBrowser, validateEvidence, cleanupRecords, verifyDockerCleanup };
