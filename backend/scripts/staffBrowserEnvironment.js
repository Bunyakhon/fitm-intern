const assert = require('node:assert/strict');
const path = require('node:path');

// Run before importing production models or applying any migration.
function validateDisposableTarget(env) {
  assert.ok(env.FITM_STAFF_BROWSER_DATABASE_URL, 'Explicit disposable browser database URL is required');
  let target;
  try { target = new URL(env.FITM_STAFF_BROWSER_DATABASE_URL); } catch { throw Error('Invalid disposable browser database URL'); }
  assert.equal(target.protocol, 'postgres:');
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.pathname, '/fitm_staff_browser_test');
  assert.match(target.port, /^\d+$/);
  assert.ok(Number(target.port) > 0 && Number(target.port) <= 65535);
  assert.equal(env.DB_HOST, target.hostname);
  assert.equal(env.DB_PORT, target.port);
  assert.equal(env.DB_NAME, 'fitm_staff_browser_test');
  assert.ok(env.DB_USER === decodeURIComponent(target.username), 'Disposable database user mismatch');
  assert.ok(env.DB_PASSWORD);
  assert.ok(env.DB_PASSWORD === decodeURIComponent(target.password), 'Disposable database credentials mismatch');
  assert.equal(env.NODE_ENV, 'test');
  assert.ok(env.JWT_SECRET?.length >= 32, 'A disposable JWT secret is required');
  assert.match(env.FITM_STAFF_BROWSER_RUN_ID || '', /^[a-f0-9]{32}$/);
  if (env.FITM_STAFF_CANCELLATION_BROWSER === '1') {
    for (const mode of ['FITM_DAILY_LOG_BROWSER', 'FITM_SUPERVISION_BROWSER', 'FITM_SUPERVISION_RESULTS_BROWSER', 'FITM_ACTIVITY_CALENDAR_BROWSER']) {
      assert.notEqual(env[mode], '1', 'Cancellation must be isolated from other browser modes');
    }
  }
  return target;
}

function browserArtifactRoot(root, env) {
  const finalId = env.FITM_STAFF_FINAL_ACCEPTANCE_RUN_ID;
  if (finalId !== undefined && finalId !== '') {
    assert.match(finalId, /^[a-f0-9]{32}$/, 'Invalid final acceptance run identity');
    assert.ok(env.FITM_STAFF_CANCELLATION_BROWSER === '1' ||
      !['FITM_DAILY_LOG_BROWSER', 'FITM_SUPERVISION_BROWSER', 'FITM_SUPERVISION_RESULTS_BROWSER', 'FITM_ACTIVITY_CALENDAR_BROWSER'].some(key => env[key] === '1'),
    'Final acceptance supports cancellation and default documents only');
    return path.join(root, 'logs', `staff-cancellation-final-${finalId}`, env.FITM_STAFF_CANCELLATION_BROWSER === '1' ? 'cancellation' : 'documents');
  }
  const directory = env.FITM_STAFF_CANCELLATION_BROWSER === '1' ? `staff-cancellation-browser-${env.FITM_STAFF_BROWSER_RUN_ID}`
    : env.FITM_ACTIVITY_CALENDAR_BROWSER === '1' ? 'activity-calendar-browser-artifacts-20261008'
      : env.FITM_SUPERVISION_RESULTS_BROWSER === '1' ? 'supervision-results-browser-artifacts-20261008'
        : env.FITM_SUPERVISION_BROWSER === '1' ? 'supervision-browser-artifacts-20261008'
          : env.FITM_DAILY_LOG_BROWSER === '1' ? 'daily-log-browser-artifacts-20261008'
            : `staff-documents-browser-${env.FITM_STAFF_BROWSER_RUN_ID}`;
  return path.join(root, 'logs', directory);
}

function checkDependencies(root) {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24 && typeof WebSocket === 'function', 'Node.js 24+ with native WebSocket is required');
  for (const name of ['sequelize', 'umzug', 'bcrypt']) require.resolve(name, { paths: [path.join(root, 'backend')] });
  require.resolve('vite', { paths: [path.join(root, 'frontend')] });
}

if (require.main === module) {
  checkDependencies(path.resolve(__dirname, '../..'));
  console.log('Node and existing backend/frontend dependencies are available');
}
module.exports = { validateDisposableTarget, checkDependencies, browserArtifactRoot };
