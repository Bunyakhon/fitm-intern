const readline = require('node:readline');
const p = require('../services/superAdmin.policy');
async function hidden(prompt, { input = process.stdin, output = process.stdout } = {}) {
  const inputError = code => Object.assign(new Error('Secure terminal input failed'), { code });
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') throw inputError('TERMINAL_REQUIRED');
  return new Promise((resolve, reject) => {
    let value = '', done = false;
    const wasRaw = input.isRaw === true;
    const finish = error => {
      if (done) return;
      done = true;
      input.off('keypress', onKey); input.off('end', onEnd); input.off('close', onEnd); input.off('error', onError);
      try { input.setRawMode(wasRaw); input.pause(); output.write('\n'); } catch { error ||= inputError('INPUT_ERROR'); }
      const result = value; value = '';
      error ? reject(error) : resolve(result);
    };
    const onEnd = () => finish(inputError('INPUT_CANCELLED'));
    const onError = () => finish(inputError('INPUT_ERROR'));
    const onKey = (character, key) => {
      if ((key?.ctrl && ['c', 'd', 'z'].includes(key.name)) || key?.name === 'escape') return onEnd();
      // Node names CR "return" and LF "enter". Both end a line; neither is
      // password content (including the CRLF emitted by some Windows pastes).
      if (['return', 'enter'].includes(key?.name)) return finish();
      if (key?.name === 'backspace') { value = [...value].slice(0, -1).join(''); return; }
      if (typeof character === 'string' && !/[\x00-\x1f\x7f-\x9f]/.test(character)) {
        if (value.length + character.length > 256) return finish(inputError('INPUT_TOO_LONG'));
        value += character;
      }
    };
    try {
      output.write(prompt); readline.emitKeypressEvents(input);
      input.on('keypress', onKey); input.once('end', onEnd); input.once('close', onEnd); input.once('error', onError);
      input.setRawMode(true); input.resume();
    } catch { finish(inputError('INPUT_ERROR')); }
  });
}
async function bootstrap(models, input) {
  p.developmentOnly();
  return models.sequelize.transaction(async transaction => {
    await models.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
    if (await models.SuperAdmin.count({ transaction })) return { created: false, status: 'already_bootstrapped' };
    p.object(input, ['email', 'first_name', 'last_name', 'password']); p.strongPassword(input.password);
    const email = p.text(input.email, 'email', 254).toLowerCase();
    for (const Model of [models.Student, models.Teacher, models.DepartmentStaff]) if (await Model.count({ where: { email }, transaction })) p.fail('อีเมลนี้ถูกใช้กับ Actor อื่นแล้ว', 409);
    const row = await models.SuperAdmin.create({ email, first_name: p.text(input.first_name, 'first_name', 100), last_name: p.text(input.last_name, 'last_name', 100), password: input.password, permissions: [...p.ALL_PERMISSIONS] }, { transaction });
    await models.AdminAuditLog.create({ actor_id: row.id, action: 'account.bootstrap', target_type: 'super_admin', target_id: row.id, changes: { created: true, permissions: [...p.ALL_PERMISSIONS] } }, { transaction });
    return { created: true, status: 'bootstrapped' };
  });
}
// Compatibility command now assigns the approved existing Teacher. The legacy
// helper remains for isolated tests; no CLI path creates a standalone identity.
if (require.main === module) {
  const cli = require('./assignTeacherAdmin');
  cli.main().catch(error => { cli.reportFailure(error); process.exitCode = 1; });
}
module.exports = { bootstrap, hidden };
