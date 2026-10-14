const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const workspace = path.resolve(__dirname, '../../../..');
const syntheticEnv = { ...process.env };
for (const key of Object.keys(syntheticEnv)) if (/^FITM_|^RUN_.*TEST/.test(key)) delete syntheticEnv[key];
Object.assign(syntheticEnv, {
  DB_HOST: '127.0.0.1', DB_PORT: '1', DB_NAME: 'fitm_config_regression_no_database',
  DB_USER: 'synthetic', DB_PASSWORD: 'synthetic-regression-only',
  PGHOST: '127.0.0.1', PGPORT: '1', PGDATABASE: 'fitm_config_regression_no_database',
  PGUSER: 'synthetic', PGPASSWORD: 'synthetic-regression-only',
  PGOPTIONS: '-c default_transaction_read_only=on',
  JWT_SECRET: 'synthetic-config-regression-key', GOOGLE_CLIENT_ID: '123-synthetic.apps.googleusercontent.com',
  GOOGLE_LOGIN_ENABLED: 'false', GOOGLE_ACCOUNT_LINKING_ENABLED: 'false',
  FRONTEND_URL: 'http://localhost:5173', DOTENV_CONFIG_QUIET: 'true'
});
function run(name, cwd, args, env) {
  return new Promise(resolve => {
    const child = cp.spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', stderr = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => stderr += data);
    child.on('error', () => resolve({ name, status: 'FAIL', reason: 'PROCESS_LAUNCH_FAILED' }));
    child.on('close', code => {
      const result = { name, status: code === 0 ? 'PASS' : 'FAIL', exitCode: code };
      if (name.endsWith('tests')) {
        for (const key of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'])
          result[key] = Number(output.match(new RegExp('^# ' + key + ' (\\d+)', 'm'))?.[1] || 0);
        result.failures = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]);
        result.scope = 'Unit/mock regression only; optional PostgreSQL/browser integrations disabled; database socket guarded at port 1';
      } else {
        result.largeChunkWarning = /chunks are larger than/.test(output + stderr);
        result.scope = 'Production build into new audit artifact directory; existing dist preserved';
      }
      fs.writeFileSync(path.join(__dirname, name + '.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result)); resolve(result);
    });
  });
}
(async () => {
  const tests = await Promise.all([
    run('backend-tests', path.join(workspace, 'backend'), ['--test', '--test-reporter=tap'], syntheticEnv),
    run('frontend-tests', path.join(workspace, 'frontend'), ['--test', '--test-reporter=tap'], syntheticEnv)
  ]);
  const build = await run('frontend-build', path.join(workspace, 'frontend'), [
    path.join(workspace, 'frontend/node_modules/vite/bin/vite.js'), 'build', '--outDir', path.join(__dirname, 'build')
  ], { ...syntheticEnv, VITE_API_URL: 'http://localhost:5000', VITE_GOOGLE_CLIENT_ID: '123-synthetic.apps.googleusercontent.com', VITE_TURNSTILE_SITE_KEY: 'synthetic-site-key' });
  fs.writeFileSync(path.join(__dirname, 'regression-guard.json'), JSON.stringify({ scope: 'Child processes only; Development .env unchanged', optionalIntegrationEnabled: false, DB_HOST: '127.0.0.1', DB_PORT: '1', PGOPTIONS: syntheticEnv.PGOPTIONS, credentials: 'synthetic; not reported', flags: 'false/false' }, null, 2));
  if ([...tests, build].some(result => result.status !== 'PASS')) process.exitCode = 1;
})();
