const fs = require('node:fs');
const path = require('node:path');
const { QueryTypes } = require('sequelize');
const { localConnection, preflight, preservedAccounts, verifyBackupProof } = require('./prepareSuperAdminSchema');
async function applyMembershipSchema(db, proof) {
  verifyBackupProof(proof);
  return db.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    const target = await preflight(db, transaction);
    if (proof.system_identifier !== target.system_identifier) throw Error('Backup target mismatch');
    await db.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
    const select = sql => db.query(sql, { type: QueryTypes.SELECT, transaction });
    const columns = await select("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='super_admins' AND column_name IN ('teacher_id','credential_stamp')");
    if (columns.length === 2) return { status: 'already_present', created: 0 };
    if (columns.length) throw Error('Partial membership schema');
    const before = await preservedAccounts(db, transaction);
    const snapshot = async () => (await select("SELECT md5(COALESCE(string_agg(md5(ROW(id,email,first_name,last_name,password_hash,is_active,permissions,session_version,created_at,updated_at)::text),'' ORDER BY id),'')) AS fingerprint FROM super_admins"))[0].fingerprint;
    const legacy = await snapshot();
    await db.query("SET LOCAL fitm.super_admin_backup_verified = 'on'", { transaction });
    await db.query(fs.readFileSync(path.join(__dirname, 'teacherAdminMembership.sql'), 'utf8'), { transaction });
    const constraint = require('./superAdminIntegrity').constraints.find(item => item.name === 'super_admin_identity_check');
    await db.query(`ALTER TABLE public.super_admins ADD CONSTRAINT ${constraint.name} ${constraint.definition}`, { transaction });
    if (JSON.stringify(before) !== JSON.stringify(await preservedAccounts(db, transaction)) || legacy !== await snapshot()) throw Error('Existing data changed');
    return { status: 'membership_schema_ready', grant_created: false, password_rotated: false, existing_data_preserved: true };
  });
}
async function main() {
  if (process.argv.length !== 3 || !['--preflight', '--apply-schema'].includes(process.argv[2])) throw Error('Invalid mode');
  const db = localConnection();
  try { if (process.argv[2] === '--preflight') console.log(JSON.stringify(await preflight(db)));
    else { let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.length > 5000) throw Error('Invalid proof'); } console.log(JSON.stringify(await applyMembershipSchema(db, JSON.parse(input)))); }
  } finally { await db.close(); }
}
if (require.main === module) main().catch(() => { console.error('BLOCKED: membership schema requires verified local backup/target; no grant/password changes'); process.exitCode = 1; });
module.exports = { applyMembershipSchema };
