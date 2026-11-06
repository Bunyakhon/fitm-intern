// Explicit CO-09 Development deployment operations. Never imported by startup.
// Backup/restore orchestration supplies a private receipt; no reset/sync/credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { QueryTypes, Transaction } = require('sequelize');
const { randomUUID } = require('node:crypto');
const { inspectColumns } = require('./initialize');
const prior = require('./studentProfileDevelopment');
const integrity = require('./postgresIntegrity');
const { tables, schemaSQL } = require('./coopTopicExamSchema');
const p = require('../services/superAdmin.policy');
const CAPABILITY = 'topic-exams.manage';
const fail = message => { throw Error(message); };
async function target(db, transaction, restoreDatabase) {
  const c = db.config;
  if (process.env.NODE_ENV !== 'development' || db.getDialect() !== 'postgres' || !['127.0.0.1','localhost','::1'].includes(c.host)
    || Number(c.port) !== 5432 || c.database !== (restoreDatabase || 'intern_system')
    || restoreDatabase && !/^fitm_co09_restore_\d{8}_[a-f0-9]{8}$/.test(restoreDatabase)) fail('CO09_DEPLOY_TARGET_CONFIG');
  const [row] = await db.query(`SELECT current_database() AS db,current_schema() AS schema,current_setting('server_version_num')::int AS version,
    inet_server_port() AS port,pg_is_in_recovery() AS recovery,(SELECT system_identifier::text FROM pg_control_system()) AS system_identifier`, { type: QueryTypes.SELECT, transaction });
  if (row.db !== c.database || row.schema !== 'public' || Math.floor(row.version / 10000) !== 16 || row.port !== 5432 || row.recovery) fail('CO09_DEPLOY_LIVE_TARGET');
  return row;
}
async function snapshot(db, transaction) {
  const result = await prior.schemaSnapshot(db, transaction);
  const select = sql => db.query(sql, { type: QueryTypes.SELECT, transaction });
  result.enums = await select(`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`);
  result.functions = await select(`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,args`);
  result.views = await select(`SELECT viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname`);
  result.sequences = await select(`SELECT sequencename,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`);
  return result;
}
async function checkEquivalent(db, transaction, item, actual) {
  if (item.definition === actual) return true;
  if (item.type !== 'c' || /\sNOT VALID$/.test(actual) !== /\sNOT VALID$/.test(item.definition)) return false;
  const clean = value => value.trim().replace(/\sNOT VALID$/, '');
  if (!/^CHECK\s*\([\s\S]*\)$/.test(clean(actual)) || !/^CHECK\s*\([\s\S]*\)$/.test(clean(item.definition))) return false;
  const quote = db.getQueryInterface().queryGenerator.quoteIdentifier(item.table_name);
  const explain = async definition => {
    const [row] = await db.query(`EXPLAIN (FORMAT JSON,VERBOSE,COSTS OFF) SELECT ${clean(definition).replace(/^CHECK\s*/, '')} AS co09_check FROM public.${quote}`, { type: QueryTypes.SELECT, transaction });
    return row['QUERY PLAN'][0].Plan.Output;
  };
  return prior.digest(await explain(item.definition)) === prior.digest(await explain(actual));
}
async function inspect(models, transaction, restoreDatabase) {
  const db = models.sequelize, identity = await target(db, transaction, restoreDatabase), schema = await snapshot(db, transaction);
  const present = new Set(schema.columns.map(row => row.table_name));
  const installed = tables.filter(table => present.has(table));
  if (installed.length && installed.length !== tables.length) fail('CO09_PARTIAL_INSTALLATION_REQUIRES_REVIEW');
  const ready = installed.length === tables.length;
  const expectedModels = Object.values(db.models).filter(model => ready || !tables.includes(model.tableName));
  if (expectedModels.some(model => !present.has(model.tableName)) || [...present].some(table => !expectedModels.some(model => model.tableName === table))) fail('CO09_UNEXPECTED_TABLE_SET');
  await inspectColumns({ models: Object.fromEntries(expectedModels.map(model => [model.name, model])), query: db.query.bind(db), getQueryInterface: db.getQueryInterface.bind(db) }, transaction);
  const foreignKeys = await db.query(`SELECT c.relname AS table_name,a.attname AS field,r.relname AS target,b.attname AS target_field,k.confdeltype AS del,k.confupdtype AS upd
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class r ON r.oid=k.confrelid
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.conkey[1] JOIN pg_attribute b ON b.attrelid=r.oid AND b.attnum=k.confkey[1]
    WHERE n.nspname='public' AND k.contype='f' AND cardinality(k.conkey)=1`, { type: QueryTypes.SELECT, transaction });
  const actions = { CASCADE:'c', RESTRICT:'r', 'SET NULL':'n', 'NO ACTION':'a', 'SET DEFAULT':'d' };
  for (const model of expectedModels) {
    for (const attr of Object.values(model.rawAttributes)) if (attr.references) {
      const reference = typeof attr.references.model === 'string' ? attr.references.model : attr.references.model.tableName;
      if (!foreignKeys.some(row => row.table_name === model.tableName && row.field === attr.field && row.target === reference && row.target_field === attr.references.key && row.del === actions[attr.onDelete || 'NO ACTION'] && row.upd === actions[attr.onUpdate || 'NO ACTION'])) fail(`CO09_FOREIGN_KEY_DRIFT:${model.tableName}.${attr.field}`);
    }
    const indexes = await db.getQueryInterface().showIndex(model.getTableName(), { transaction });
    const fields = Object.values(model.rawAttributes).filter(attr => attr.primaryKey).map(attr => attr.field);
    if (!indexes.some(index => index.primary && prior.digest(index.fields.map(field => field.attribute)) === prior.digest(fields))) fail('CO09_PRIMARY_KEY_DRIFT:'+model.tableName);
    for (const attr of Object.values(model.rawAttributes)) if (attr.unique === true && !indexes.some(index => index.unique && index.fields.length === 1 && index.fields[0].attribute === attr.field && !index.where)) fail('CO09_UNIQUE_DRIFT:'+model.tableName);
    for (const index of model._indexes) {
      const actual = indexes.find(row => row.name === index.name);
      if (!actual || !!actual.unique !== !!index.unique || prior.digest(actual.fields.map(field => field.attribute)) !== prior.digest(index.fields)) fail('CO09_INDEX_DRIFT:'+index.name);
      // Parser comparison of predicates avoids weakening partial unique indexes.
      // Sequelize's generator mutates options.where; never mutate registered indexes.
      const expectedSQL = db.getQueryInterface().queryGenerator.addIndexQuery(model.tableName,{...index,fields:index.fields.map(field=>typeof field==='object'?{...field}:field)}).replace(/;$/, '');
      const expectedWhere = expectedSQL.match(/\sWHERE\s([\s\S]*)$/i)?.[1];
      const actualWhere = schema.indexes.find(row => row.indexname === index.name)?.indexdef.match(/\sWHERE\s([\s\S]*)$/i)?.[1];
      if (!!expectedWhere !== !!actualWhere) fail('CO09_INDEX_PREDICATE_DRIFT:'+index.name);
      if (expectedWhere && !await checkEquivalent(db,transaction,{ table_name:model.tableName,type:'c',definition:`CHECK (${expectedWhere})` },`CHECK (${actualWhere})`)) fail('CO09_INDEX_PREDICATE_DRIFT:'+index.name);
    }
  }
  for (const item of integrity.constraints.filter(item => present.has(item.table_name))) {
    const actual = schema.constraints.find(row => row.table_name === item.table_name && row.name === item.name && row.type === item.type);
    if (!actual) fail('CO09_CONSTRAINT_MISSING:'+item.name);
    if (!await checkEquivalent(db,transaction,item,actual.definition)) {
      if (item.name !== 'super_admin_permissions_check' || ready) fail('CO09_CONSTRAINT_DRIFT:'+item.name);
      const old = { ...item, definition: item.definition.replace(JSON.stringify(p.ALL_PERMISSIONS), JSON.stringify(p.ALL_PERMISSIONS.filter(key => key !== CAPABILITY))) };
      if (!await checkEquivalent(db,transaction,old,actual.definition)) fail('CO09_PERMISSION_ALLOWLIST_DRIFT');
    }
  }
  for (const item of integrity.triggers) if (!schema.triggers.some(row => row.table_name === item.table_name && row.name === item.name && row.definition === item.definition)) fail('CO09_TRIGGER_DRIFT:'+item.name);
  const fingerprints = await prior.fingerprints(db,transaction,{excludeContacts:false});
  return { identity, ready, schema, fingerprints };
}
async function preflight(models, restoreDatabase) {
  return models.sequelize.transaction({ readOnly:true, isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, transaction => inspect(models,transaction,restoreDatabase));
}
async function equivalentSnapshot(db, expected, actual) {
  return db.transaction({readOnly:true},async transaction=>{
    for(const key of Object.keys(expected).filter(key=>key!=='constraints')) if(prior.digest(expected[key])!==prior.digest(actual[key]))return false;
    if(expected.constraints.length!==actual.constraints.length)return false;
    for(const item of expected.constraints){const row=actual.constraints.find(row=>row.table_name===item.table_name&&row.name===item.name&&row.type===item.type);if(!row||!await checkEquivalent(db,transaction,item,row.definition))return false;}
    return true;
  });
}
function preserved(before, after, { excludeTables = [] } = {}) {
  for (const [table,value] of Object.entries(before)) if (!excludeTables.includes(table)) assert.deepEqual(after[table],value,'Existing table changed: '+table);
}
function preservedSchema(before, after) {
  const filter = (key, values) => values.filter(row => !tables.includes(row.table_name || row.tablename) && !(key === 'constraints' && row.name === 'super_admin_permissions_check'));
  for (const key of Object.keys(before)) assert.deepEqual(filter(key,after[key]),filter(key,before[key]),'Unexpected schema change: '+key);
}
async function apply(models, receipt, restoreDatabase) {
  const db = models.sequelize;
  if (!receipt?.backupVerified || !receipt.restoreVerified || !receipt.backupSHA256 || !receipt.restoreDatabase) fail('CO09_BACKUP_RESTORE_RECEIPT_REQUIRED');
  if (!restoreDatabase && !receipt.rehearsed) fail('CO09_REHEARSAL_REQUIRED');
  const sql = schemaSQL(db);
  if (!fs.readFileSync(path.join(__dirname,'coopTopicExam.preview.sql'),'utf8').includes(sql)) fail('CO09_PREVIEW_DIFFERS_FROM_MODELS');
  return db.transaction(async transaction => {
    await target(db,transaction,restoreDatabase);
    await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'", { transaction });
    await db.query('SELECT pg_advisory_xact_lock(63828018); SELECT pg_advisory_xact_lock(2140909)',{transaction});
    const quote = name => db.getQueryInterface().queryGenerator.quoteIdentifier(name);
    await db.query('LOCK TABLE '+Object.keys(receipt.source.fingerprints).map(name=>'public.'+quote(name)).join(',')+' IN SHARE MODE',{transaction});
    const before = await inspect(models,transaction,restoreDatabase);
    assert.equal(before.identity.system_identifier,receipt.source.identity.system_identifier,'Cluster changed');
    assert.deepEqual(before.schema,(restoreDatabase ? receipt.restored : receipt.source).schema,'Schema changed since verified backup');
    assert.deepEqual(before.fingerprints,receipt.source.fingerprints,'Data changed since verified backup');
    if (!before.ready) await db.query(sql,{transaction});
    const after = await inspect(models,transaction,restoreDatabase);
    if (!after.ready) fail('CO09_SCHEMA_NOT_INSTALLED');
    preserved(before.fingerprints,after.fingerprints);preservedSchema(before.schema,after.schema);
    for(const table of tables) if(!before.ready && after.fingerprints[table].rows !== 0) fail('CO09_NEW_TABLE_NOT_EMPTY');
    return after;
  });
}
async function activate(models, teacherId, membershipId) {
  const db=models.sequelize;
  return db.transaction(async transaction=>{
    await target(db,transaction); await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'",{transaction});
    await db.query('SELECT pg_advisory_xact_lock(63828018)',{transaction});
    const teacher=await models.Teacher.findByPk(teacherId,{attributes:['id','status','is_department_head'],transaction,lock:transaction.LOCK.UPDATE});
    const grant=await models.SuperAdmin.findOne({where:{id:membershipId,teacher_id:teacherId,is_active:true},attributes:['id','teacher_id','permissions','session_version','is_active','updatedAt'],transaction,lock:transaction.LOCK.UPDATE});
    if(!teacher || teacher.status!=='active' || teacher.is_department_head || !grant) fail('CO09_EXISTING_MEMBERSHIP_REQUIRED');
    for(const [actor_type,actor_id]of [['teacher',teacherId],['super_admin',membershipId]]) {
      const control=await models.AdminAccountControl.findOne({where:{actor_type,actor_id},attributes:['enabled'],transaction});
      if(control?.enabled===false)fail('CO09_ACCOUNT_DISABLED');
    }
    if(grant.permissions.includes(CAPABILITY))return {changed:false,preservedPermissions:true};
    const before=await prior.fingerprints(db,transaction,{excludeContacts:false}),beforePermissions=[...grant.permissions];
    const membershipFingerprint=async()=>{
      const [row]=await db.query(`SELECT md5(string_agg((CASE WHEN id=:id THEN to_jsonb(t)-ARRAY['permissions','session_version','updated_at'] ELSE to_jsonb(t) END)::text,'' ORDER BY id)) AS digest FROM public.super_admins t`,{replacements:{id:membershipId},type:QueryTypes.SELECT,transaction});return row.digest;
    };
    const protectedBefore=await membershipFingerprint(), auditId=randomUUID();
    const nextPermissions=[...beforePermissions,CAPABILITY];p.permissions(nextPermissions);
    // Read no credential columns. A partial Sequelize instance would run the
    // unrelated identity/password validator with omitted protected attributes.
    const [updated]=await db.query(`UPDATE public.super_admins SET permissions=:permissions::jsonb,session_version=session_version+1,updated_at=now()
      WHERE id=:id AND teacher_id=:teacher AND session_version=:version RETURNING permissions,session_version`,
      {replacements:{permissions:JSON.stringify(nextPermissions),id:membershipId,teacher:teacherId,version:grant.session_version},transaction});
    assert.equal(updated.length,1);assert.deepEqual(updated[0].permissions,nextPermissions);assert.equal(updated[0].session_version,grant.session_version+1);
    await models.AdminAuditLog.create({id:auditId,actor_id:membershipId,action:'co09.development.capability',target_type:'super_admin',target_id:membershipId,
      changes:{origin:'explicit_user_authorized_development_operation',authenticated_admin_login:false,added:[CAPABILITY],credentials_changed:false}},{transaction});
    const after=await prior.fingerprints(db,transaction,{excludeContacts:false});
    preserved(before,after,{excludeTables:['super_admins','admin_audit_logs']});
    assert.equal(after.super_admins.rows,before.super_admins.rows);assert.equal(after.admin_audit_logs.rows,before.admin_audit_logs.rows+1);assert.equal(await membershipFingerprint(),protectedBefore);
    const [audits]=await db.query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public.admin_audit_logs t WHERE id<>:id) a`,{replacements:{id:auditId},type:QueryTypes.SELECT,transaction});
    assert.deepEqual(audits,before.admin_audit_logs);
    return {changed:true,preservedPermissions:true,credentialsChanged:false,sessionVersionIncremented:true,auditWritten:true};
  });
}
module.exports={target,snapshot,checkEquivalent,inspect,preflight,equivalentSnapshot,apply,activate,preserved,preservedSchema};
