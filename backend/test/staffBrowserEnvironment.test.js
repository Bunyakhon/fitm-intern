const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDisposableTarget } = require('../scripts/staffBrowserEnvironment');

function environment() {
  return { FITM_STAFF_BROWSER_DATABASE_URL: 'postgres://postgres:generated-test-secret@127.0.0.1:15432/fitm_staff_browser_test',
    DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_NAME: 'fitm_staff_browser_test', DB_USER: 'postgres', DB_PASSWORD: 'generated-test-secret',
    NODE_ENV: 'test', JWT_SECRET: 'test-only-key-with-at-least-32-characters', FITM_STAFF_BROWSER_RUN_ID: '1234567890abcdef1234567890abcdef', FITM_STAFF_CANCELLATION_BROWSER: '1' };
}

test('Browser runner accepts only the explicit matching disposable process target', () => {
  assert.equal(validateDisposableTarget(environment()).pathname, '/fitm_staff_browser_test');
});

test('Browser runner refuses persistent, remote and mismatched targets before model import', () => {
  const valid = environment();
  for (const changed of [
    { FITM_STAFF_BROWSER_DATABASE_URL: undefined },
    { FITM_STAFF_BROWSER_DATABASE_URL: valid.FITM_STAFF_BROWSER_DATABASE_URL.replace('fitm_staff_browser_test', 'intern_system') },
    { FITM_STAFF_BROWSER_DATABASE_URL: valid.FITM_STAFF_BROWSER_DATABASE_URL.replace('127.0.0.1', 'remote.example') },
    { DB_HOST: 'localhost' }, { DB_PORT: '5432' }, { DB_NAME: 'intern_system' },
    { DB_USER: 'other' }, { DB_PASSWORD: 'wrong' }, { NODE_ENV: 'production' }, { JWT_SECRET: '' }, { FITM_STAFF_BROWSER_RUN_ID: '../../outside' },
  ]) assert.throws(() => validateDisposableTarget({ ...valid, ...changed }));
});

test('Browser runner refuses ambiguous cancellation modes', () => {
  for (const mode of ['FITM_DAILY_LOG_BROWSER', 'FITM_SUPERVISION_BROWSER', 'FITM_SUPERVISION_RESULTS_BROWSER', 'FITM_ACTIVITY_CALENDAR_BROWSER']) {
    assert.throws(() => validateDisposableTarget({ ...environment(), [mode]: '1' }), /must be isolated/);
  }
});

test('Browser guard errors do not print generated database credentials', () => {
  const env = environment();
  for (const changed of [{ DB_PASSWORD: 'different-private-value' }, { FITM_STAFF_BROWSER_DATABASE_URL: 'invalid:generated-test-secret%' }]) {
    assert.throws(() => validateDisposableTarget({ ...env, ...changed }), error => {
      assert.doesNotMatch(String(error.stack), /generated-test-secret|different-private-value/);
      return true;
    });
  }
});
