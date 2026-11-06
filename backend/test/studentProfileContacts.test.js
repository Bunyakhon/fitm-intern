const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID, randomBytes } = require('node:crypto');
const { createNationalIdStorage, normalizeNationalId } = require('../src/services/studentProfileNationalId');
const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken');
const rules = require('../src/services/studentProfileValidation');
const { CONTACT_FIELDS, LEGACY_FRIEND_FIELDS } = require('../src/services/studentProfileContacts');
const { createStudentProfileAggregateService } = require('../src/services/studentProfileAggregate.service');
const schema = require('../src/models/studentProfileAggregate.schema');
const sample = { student_line_id: 'student.fixture', student_facebook: 'https://www.facebook.com/fixture' };
const friend = { nickname: 'ฟ้า', full_name: 'เพื่อน ทดสอบ', phone: '081-000-0000', line_id: 'friend_fixture', facebook_url: 'https://www.facebook.com/fixture' };

// Actual services/controllers with in-memory persistence; no live config/models/.env.
function isolated(file, dependencies, globals = {}) {
  const filename = path.resolve(__dirname, '../src', file), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, Buffer, URL, console,
    process: { env: {} }, require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : (() => { throw Error('Undeclared dependency: ' + name); })(), ...globals }, { filename });
  return module.exports;
}
function fixture(ready = true, friendsReady = true, legacy = false, titleReady = true) {
  const a = randomUUID(), b = randomUUID(), classId = randomUUID(), projectId = randomUUID();
  const row = data => Object.assign(data, { get() { return Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== 'function')); },
    async update(patch, options) { assert.ok(options.transaction); assert.deepEqual(Object.keys(patch).sort(), [...options.fields].sort()); Object.assign(this, patch); } });
  const students = new Map([a, b].map(id => [id, row({ id, student_id: id, track: 'co_op', status: 'pending', advisor_teacher_id: classId, coop_advisor_teacher_id: projectId, profile_data_revision: '0' })]));
  const profiles = new Map([a, b].map(id => [id, row({ id: randomUUID(), student_id: id, current_phone: '0811111111', father_name: 'บิดาเดิม', updatedAt: '2026-01-01' })]));
  const models = { Student: { findByPk: async id => students.get(id) }, Teacher: { findByPk: async id => ({ id, first_name: 'อาจารย์', last_name: 'ทดสอบ' }) },
    StudentProfile: { findOne: async options => {
      assert.ok(options.transaction); if (!ready) assert.equal(options.attributes.some(key => CONTACT_FIELDS.includes(key)), false);
      if (titleReady !== true) assert.equal(options.attributes.includes('english_prefix'), false);
      return profiles.get(options.where.student_id) || null;
    }, create: async (values, options) => { assert.ok(options.transaction); const record = row({ id: randomUUID(), ...values }); profiles.set(values.student_id, record); return record; } },
    StudentFile: { findAll: async () => [] },
    sequelize: { getQueryInterface: () => ({ tableExists: async () => friendsReady, describeTable: async table => table === 'student_close_friends' ? schema.tables.student_close_friends.columns : table === 'student_addresses' ? { moo: { type: 'CHARACTER VARYING(2)', allowNull: true, defaultValue: null } } : {
      ...Object.fromEntries([...(ready ? CONTACT_FIELDS : []), ...(legacy ? LEGACY_FRIEND_FIELDS : [])].map(key => [key, {}])),
      ...(titleReady ? { english_prefix: titleReady === true ? { type: 'CHARACTER VARYING(255)', allowNull: true, defaultValue: null } : titleReady } : {}),
    } }) } };
  const collections = {};
  for (const [kind, relation] of Object.entries(rules.RELATIONS)) {
    const store = collections[kind] = new Map();
    const record = values => {
      const item = row({ id: randomUUID(), ...values });
      item.destroy = async options => { assert.ok(options.transaction); store.delete(item.id); };
      return item;
    };
    models[relation.model] = {
      findAll: async options => [...store.values()].filter(item => item.student_id === options.where.student_id).sort((a,b) => a.id.localeCompare(b.id)),
      findOne: async options => { const item = store.get(options.where.id); return item?.student_id === options.where.student_id ? item : null; },
      create: async (values, options) => { assert.ok(options.transaction); const item = record(values); store.set(item.id, item); return item; }
    };
  }
  models.sequelize.transaction = async action => {
    const stores = [students, profiles, ...Object.values(collections)];
    const backups = stores.map(store => [...store].map(([id,item]) => [id, { ...item }]));
    try { return await action({ LOCK: { SHARE: 'SHARE', UPDATE: 'UPDATE' } }); }
    catch (error) { stores.forEach((store,index) => { store.clear(); for (const [id,item] of backups[index]) store.set(id,item); }); throw error; }
  };
  const nationalId = createNationalIdStorage({ key: randomBytes(32) });
  return { a, b, models, students, profiles, collections, nationalId, service: createStudentProfileAggregateService(models, nationalId) };
}
const response = () => ({ code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('address moo validates nullable string digits at API/model layers and preserves leading zeroes', async () => {
  const connection = new Sequelize('postgres://fixture:fixture@127.0.0.1/fixture', { logging: false });
  const { StudentAddress } = require('../src/models/studentProfileAggregate.factories').defineRelationModels(connection);
  assert.equal(StudentAddress.rawAttributes.moo.type.toSql(), 'VARCHAR(2)'); assert.equal(StudentAddress.rawAttributes.moo.allowNull, true);
  for (const value of ['1', '3', '12', '01', '0', null, '']) {
    const normalized = rules.normalizeChild('addresses', { address_type: 'current', house_no: '23/15', moo: value }, true); assert.equal(normalized.moo, value || null);
    await StudentAddress.build({ student_id: randomUUID(), ...normalized }).validate();
  }
  assert.equal(Object.hasOwn(rules.normalizeChild('addresses', { house_no: '23/15' }), 'moo'), false);
  for (const value of ['-1', '1.5', 'a', '123', '+1', '๑', 1, {}]) {
    assert.throws(() => rules.normalizeChild('addresses', { moo: value }), { status: 400 });
    await assert.rejects(() => StudentAddress.build({ student_id: randomUUID(), address_type: 'current', moo: value }).validate());
  }
  await connection.close();
});
test('address moo persists independently, clears to null and retains revision/owner/atomic error handling', async () => {
  const f = fixture(), other = JSON.stringify(await f.service.read(f.b)); let state = await f.service.read(f.a);
  assert.equal(state.address_moo_available, true);
  for (const type of ['registered', 'current']) {
    state = (await f.service.saveChild(f.a, 'addresses', 'create', null, { address_type: type, house_no: '23/15' }, state.profile_revision)).body;
    const id = state.record.id; assert.equal(state.addresses.find(row => row.id === id).moo, null);
    for (const moo of ['1', '3', '12', '01', '', null]) {
      state = (await f.service.saveChild(f.a, 'addresses', 'update', id, { moo }, state.profile_revision)).body;
      assert.equal((await f.service.read(f.a)).addresses.find(row => row.id === id).moo, moo || null);
    }
    await assert.rejects(() => f.service.saveChild(f.b, 'addresses', 'update', id, { moo: '1' }, JSON.parse(other).profile_revision), { status: 404 });
  }
  const before = JSON.stringify(await f.service.read(f.a));
  assert.throws(() => f.service.saveAggregate(f.a, { addresses: { update: [{ id: state.record.id, changes: { house_no: '99', moo: '-1' } }] } }, state.profile_revision), { status: 400 });
  assert.equal(JSON.stringify(await f.service.read(f.a)), before); assert.equal(JSON.stringify(await f.service.read(f.b)), other);
});
test('pending moo schema preserves old address reads/creates/updates/deletes and rejects explicit moo writes safely', async () => {
  for (const moo of [undefined, { type: 'INTEGER', allowNull: true }, { type: 'VARCHAR(2)', allowNull: false }]) {
    const f = fixture(), qi = f.models.sequelize.getQueryInterface(); f.models.sequelize.getQueryInterface = () => ({ ...qi, describeTable: async table => table === 'student_addresses' ? (moo ? { moo } : {}) : qi.describeTable(table) });
    const model = f.models.StudentAddress, findAll = model.findAll, create = model.create;
    model.findAll = options => { assert.equal(options.attributes.includes('moo'), false); return findAll(options); };
    model.create = (values, options) => { assert.equal(options.fields.includes('moo'), false); assert.equal(options.returning.includes('moo'), false); return create(values, options); };
    let state = await f.service.read(f.a); assert.equal(state.address_moo_available, false);
    state = (await f.service.saveChild(f.a, 'addresses', 'create', null, { address_type: 'current', house_no: '23/15' }, state.profile_revision)).body; const id = state.record.id;
    assert.equal(Object.hasOwn(state.addresses[0], 'moo'), false);
    for (const value of ['3', null]) await assert.rejects(() => f.service.saveChild(f.a, 'addresses', 'update', id, { moo: value }, state.profile_revision), error => error.code === 'ADDRESS_MOO_SCHEMA_PENDING');
    state = (await f.service.saveChild(f.a, 'addresses', 'update', id, { road: 'Preserved' }, state.profile_revision)).body;
    state = (await f.service.saveChild(f.a, 'addresses', 'delete', id, {}, state.profile_revision)).body; assert.equal(state.addresses.length, 0);
  }
});
test('PDF extraction maps only explicit moo text, validates it and never derives it from house number', () => {
  const { safeExtraction } = require('../src/services/studentProfilePdfImport.service');
  const parse = values => safeExtraction({ template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text', records: { addresses: [{ values }] } }).records.addresses[0];
  for (const moo of ['1', '3', '12', '01']) assert.equal(parse({ address_type: 'current', house_no: '23/15', moo }).values.moo, moo);
  assert.equal(Object.hasOwn(parse({ address_type: 'current', house_no: '23/15' }).values, 'moo'), false);
  assert.equal(Object.hasOwn(parse({ address_type: 'current', moo: '' }).values, 'moo'), false);
  assert.ok(parse({ address_type: 'current', moo: '-1' }).validation_errors.moo);
});

test('English Title persists nullable/standard/legacy values with owner isolation, If-Match and atomic rollback', async () => {
  const f = fixture(); f.profiles.get(f.a).english_prefix = 'Dr.';
  const other = JSON.stringify(await f.service.read(f.b)); let current = await f.service.read(f.a);
  assert.equal(current.profile_english_prefix_available, true); assert.equal(current.profile.english_prefix, 'Dr.');
  const originalRevision = current.profile_revision;
  for (const value of ['Mr.', 'Mrs.', 'Miss', 'Ms.', null, '', 'Dr.']) {
    current = (await f.service.saveAggregate(f.a, { profile: { english_prefix: value } }, current.profile_revision)).body;
    const read = await f.service.read(f.a); assert.equal(read.profile.english_prefix, value || null);
    assert.equal(f.profiles.get(f.a).english_prefix, value || null); assert.equal(JSON.stringify(await f.service.read(f.b)), other);
  }
  const omitted = (await f.service.saveProfile(f.a, { gender: 'male' }, current.profile_revision)).body;
  assert.equal(omitted.profile.english_prefix, 'Dr.'); assert.equal(omitted.profile.father_name, 'บิดาเดิม');
  const noOp = (await f.service.saveProfile(f.a, { english_prefix: 'Dr.' }, omitted.profile_revision)).body;
  assert.equal(noOp.profile_revision, omitted.profile_revision);
  await assert.rejects(() => f.service.saveProfile(f.a, { english_prefix: 'Ms.' }, originalRevision), { status: 409 });
  await assert.rejects(() => f.service.saveProfile(f.a, { english_prefix: 'Ms.' }), { status: 428 });
  for (const value of [false, 123, {}, [], 'a'.repeat(256), 'Mr.\u0000']) assert.throws(() => rules.normalizeProfile({ english_prefix: value }), { status: 400 });
  await assert.rejects(() => f.service.saveAggregate(f.a, { profile: { english_prefix: 'Mrs.' }, close_friends: { update: [{ id: randomUUID(), changes: { nickname: 'missing' } }] } }, noOp.profile_revision), { status: 404 });
  assert.equal((await f.service.read(f.a)).profile.english_prefix, 'Dr.');
});

test('missing or incompatible Title column preserves legacy profile reads/saves/creation and rejects only Title writes', async () => {
  const { englishTitleColumnReady } = require('../src/services/studentProfileEnglishTitle');
  assert.equal(englishTitleColumnReady({ type: 'VARCHAR(255)', allowNull: true, defaultValue: null }), true);
  for (const metadata of [false, { type: 'INTEGER', allowNull: true }, { type: 'VARCHAR(32)', allowNull: true }, { type: 'VARCHAR(255)', allowNull: false }, { type: 'VARCHAR(255)', allowNull: true, defaultValue: 'Mr.' }]) {
    const f = fixture(true, true, false, metadata); f.profiles.get(f.a).english_prefix = 'Preserved';
    let current = await f.service.read(f.a); assert.equal(current.profile_english_prefix_available, false); assert.equal(Object.hasOwn(current.profile, 'english_prefix'), false);
    current = (await f.service.saveProfile(f.a, { gender: 'female' }, current.profile_revision)).body;
    assert.equal(current.profile.gender, 'female'); assert.equal(f.profiles.get(f.a).english_prefix, 'Preserved');
    for (const value of ['Mr.', null]) await assert.rejects(() => f.service.saveProfile(f.a, { english_prefix: value }, current.profile_revision), { code: 'PROFILE_ENGLISH_TITLE_SCHEMA_PENDING', status: 503 });
    f.profiles.delete(f.b); const empty = await f.service.read(f.b);
    assert.equal((await f.service.saveProfile(f.b, { nationality: 'ไทย' }, empty.profile_revision)).body.profile.nationality, 'ไทย');
  }
});
const syntheticId = seed => {
  const digits = String(seed).padEnd(12, '0').slice(0, 12);
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return digits + (11 - sum % 11) % 10;
};

test('optional national ID validates, encrypts, edits, reads back, clears and preserves other owner data', async () => {
  const f = fixture(), first = syntheticId('9'), second = syntheticId('98');
  const before = await f.service.read(f.a), otherBefore = JSON.stringify(await f.service.read(f.b));
  const saved = (await f.service.saveAggregate(f.a, { profile: { national_id: first, gender: 'male' } }, before.profile_revision)).body;
  assert.ok(saved.profile.national_id === first); assert.equal(saved.profile.gender, 'male');
  const stored = f.profiles.get(f.a);
  assert.equal(stored.national_id, undefined); assert.ok(Buffer.isBuffer(stored.national_id_ciphertext));
  assert.equal(stored.national_id_ciphertext.includes(Buffer.from(first)), false); assert.ok(stored.national_id_key_version);
  assert.equal('national_id_ciphertext' in saved.profile, false); assert.equal('national_id_key_version' in saved.profile, false);
  assert.ok((await f.service.read(f.a)).profile.national_id === first);
  assert.equal(JSON.stringify(await f.service.read(f.b)), otherBefore);
  const omitted = (await f.service.saveProfile(f.a, { nationality: 'ไทย' }, saved.profile_revision)).body;
  assert.ok(omitted.profile.national_id === first);
  const edited = (await f.service.saveProfile(f.a, { national_id: second }, omitted.profile_revision)).body;
  assert.ok(edited.profile.national_id === second); assert.equal(edited.profile.father_name, before.profile.father_name);
  await assert.rejects(() => f.service.saveProfile(f.a, { national_id: first }, saved.profile_revision), { status: 409 });
  for (const value of ['123', '0'.repeat(13), first.slice(0, 12) + ((Number(first[12]) + 1) % 10), 123, {}, 'a'.repeat(13), first + '0']) {
    await assert.rejects(async () => f.service.saveProfile(f.a, { national_id: value }, edited.profile_revision), { status: 400 });
  }
  assert.ok((await f.service.read(f.a)).profile.national_id === second);
  const cleared = (await f.service.saveProfile(f.a, { national_id: '' }, edited.profile_revision)).body;
  assert.equal(cleared.profile.national_id, null); assert.equal(f.profiles.get(f.a).national_id_ciphertext, null); assert.equal(f.profiles.get(f.a).national_id_key_version, null);
  for (const field of ['national_id_ciphertext', 'national_id_key_version']) assert.throws(() => rules.normalizeProfile({ [field]: 'forged' }), { status: 400 });
});

test('Title PDF preview/confirm uses explicit mapping and safely skips or rejects Title before schema readiness', async () => {
  for (const ready of [true, false]) {
    const f = fixture(true, true, false, ready); f.profiles.get(f.a).english_prefix = 'Dr.'; f.models.StudentFile.findOne = async () => null;
    const staged = [], root = path.resolve('synthetic-title-storage');
    const storage = { STORAGE_ROOT: root, ensureStudentStorage: async () => ({ profileDocuments: path.join(root, 'documents') }) };
    const { createStudentProfilePdfImportService } = isolated('services/studentProfilePdfImport.service.js', {
      'node:crypto': require('node:crypto'), 'node:path': path, 'node:fs/promises': { realpath: async value => value, writeFile: async (...args) => staged.push(args) },
      './studentProfileValidation': rules, './studentProfileContacts': require('../src/services/studentProfileContacts'), '../config/storage': storage,
      './studentProfilePdf.client': { extractProfilePdf: async () => ({}) },
      './studentProfileFiles.service': { signature: () => true, createStudentProfileFilesService: () => ({
        uploadImport: async (owner, file, revision, prepared, importId) => f.service.mutate(owner, revision, async context => ({ changed: await f.service.applyAggregate(context, prepared), response: { import_status: 'committed', import_id: importId } })), discardStaged: async () => {},
      }) },
    });
    const buffer = Buffer.from('%PDF-synthetic'), file = { buffer, size: buffer.length, originalname: 'profile.pdf', mimetype: 'application/pdf' };
    const pdf = createStudentProfilePdfImportService(f.models, f.service, { secret: 'synthetic-only', storage,
      extract: async () => ({ template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text', identity: {}, records: {}, candidates: [{ scope: 'profile', key: 'english_prefix', value: 'Ms.' }] }) });
    const preview = await pdf.preview(f.a, file);
    assert.equal(preview.candidates.some(field => field.key === 'english_prefix'), ready);
    if (!ready) {
      assert.ok(preview.warnings.includes('ENGLISH_TITLE_STORAGE_PENDING'));
      await assert.rejects(() => pdf.commit(f.a, file, { receipt: preview.receipt, changes: { profile: { english_prefix: 'Ms.' } } }, preview.snapshot.profile_revision), { status: 503 });
      assert.equal(staged.length, 0); assert.equal(f.profiles.get(f.a).english_prefix, 'Dr.');
    }
    const patch = ready ? { english_prefix: 'Ms.' } : { english_first_name: 'Imported' };
    await pdf.commit(f.a, file, { receipt: preview.receipt, changes: { profile: patch } }, preview.snapshot.profile_revision);
    assert.equal(staged.length, 1); assert.equal(f.profiles.get(f.a).english_prefix, ready ? 'Ms.' : 'Dr.');
    assert.equal(f.profiles.get(f.a).prefix, undefined); assert.equal(f.profiles.get(f.a).father_name, 'บิดาเดิม');
  }
});

test('ID encryption persists its private key across restarts and rejects tampering, owner swaps or missing keys', async () => {
  const fsAsync = require('node:fs/promises'), os = require('node:os');
  const directory = await fsAsync.mkdtemp(path.join(os.tmpdir(), 'fitm-id-test-'));
  try {
    const value = syntheticId('97'), owner = randomUUID();
    const crypto = createNationalIdStorage({ directory }), row = await crypto.encrypt(value, owner);
    assert.ok(await createNationalIdStorage({ directory }).decrypt(row, owner) === value);
    assert.equal(row.national_id_ciphertext.equals((await crypto.encrypt(value, owner)).national_id_ciphertext), false);
    await assert.rejects(() => crypto.decrypt(row, randomUUID()), { code: 'PROFILE_ID_STORAGE_UNAVAILABLE' });
    const corrupt = Buffer.from(row.national_id_ciphertext); corrupt[15] ^= 1;
    await assert.rejects(() => crypto.decrypt({ ...row, national_id_ciphertext: corrupt }, owner), { status: 503 });
    await assert.rejects(() => crypto.decrypt({ ...row, national_id_key_version: 'unknown' }, owner), { status: 503 });
    await fsAsync.unlink(path.join(directory, 'student-profile-national-id-v1.key'));
    await assert.rejects(() => crypto.decrypt(row, owner), { status: 503 });
    assert.equal((await fsAsync.readdir(directory)).length, 0);
    assert.equal(normalizeNationalId(null), null); assert.equal(normalizeNationalId('  '), null);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir())); assert.ok(path.basename(directory).startsWith('fitm-id-test-'));
    await fsAsync.rm(directory, { recursive: true });
  }
});

test('owner contacts persist/read/edit/clear; old profile and both advisors remain unchanged', async () => {
  const f = fixture(), before = await f.service.read(f.a), other = JSON.stringify(await f.service.read(f.b));
  const saved = (await f.service.saveProfile(f.a, sample, before.profile_revision)).body;
  for (const key of CONTACT_FIELDS) assert.equal(saved.profile[key], sample[key]);
  assert.notEqual(saved.profile_revision, before.profile_revision);
  const loaded = await f.service.read(f.a); assert.equal(loaded.profile_revision, saved.profile_revision);
  const edited = (await f.service.saveAggregate(f.a, { profile: { student_line_id: 'changed', student_facebook: 'changed' } }, loaded.profile_revision)).body;
  assert.equal(edited.profile.student_line_id, 'changed'); assert.equal(edited.profile.student_facebook, 'changed');
  for (const key of ['advisor_teacher_id', 'coop_advisor_teacher_id']) assert.equal(edited.student[key], before.student[key]);
  assert.equal(edited.profile.father_name, before.profile.father_name); assert.equal(edited.profile.current_phone, before.profile.current_phone);
  const cleared = (await f.service.saveProfile(f.a, Object.fromEntries(CONTACT_FIELDS.map(key => [key, '  '])), edited.profile_revision)).body;
  for (const key of CONTACT_FIELDS) assert.equal(cleared.profile[key], null);
  const noOp = (await f.service.saveProfile(f.a, {}, cleared.profile_revision)).body; assert.equal(noOp.profile_revision, cleared.profile_revision);
  assert.equal(JSON.stringify(await f.service.read(f.b)), other);
});

test('validation rejects wrong types/lengths/schemes/controls and mass assignment without writes', async () => {
  const f = fixture(), before = await f.service.read(f.a);
  const invalid = [{ student_line_id: 'has space' }, { student_line_id: 'a'.repeat(101) }, { student_facebook: 'a'.repeat(501) },
    { student_facebook: 'javascript:run()' }, { student_facebook: 'https://facebook.com.evil.invalid/me' }, { student_facebook: 'https://user@facebook.com/me' },
    { close_friend_name: '<script>' }, { close_friend_name: 'a'.repeat(256) }, { close_friend_phone: '123' }, { close_friend_phone: '081\n0000000' },
    { close_friend_line_id: [] }, { close_friend_facebook: {} }, { close_friend_name: false }, { student_id: f.b }, { coop_advisor_teacher_id: f.b }, { track: 'internship' }];
  for (const patch of invalid) await assert.rejects(async () => f.service.saveProfile(f.a, patch, before.profile_revision), { status: 400 });
  assert.equal((await f.service.read(f.a)).profile_revision, before.profile_revision);
  assert.throws(() => rules.normalizeProfile([]), { status: 400 });
  assert.throws(() => rules.normalizeProfile({ unexpected: sample.close_friend_name }), { status: 400 });
});

test('revision conflict and missing If-Match preserve stored values', async () => {
  const f = fixture(), before = await f.service.read(f.a);
  await f.service.saveProfile(f.a, sample, before.profile_revision);
  await assert.rejects(() => f.service.saveProfile(f.a, { student_line_id: 'other' }, before.profile_revision), { status: 409, code: 'STUDENT_PROFILE_CONFLICT' });
  await assert.rejects(() => f.service.saveProfile(f.a, { student_line_id: 'new' }), { status: 428 });
  assert.equal((await f.service.read(f.a)).profile.student_line_id, sample.student_line_id);
});

test('pending schema keeps existing read/save/new profile available and refuses only new contact writes', async () => {
  const f = fixture(false), before = await f.service.read(f.a);
  assert.equal(before.profile_contacts_available, false);
  const saved = (await f.service.saveProfile(f.a, { current_phone: '0821111111' }, before.profile_revision)).body;
  assert.equal(saved.profile.current_phone, '0821111111');
  await assert.rejects(() => f.service.saveProfile(f.a, sample, saved.profile_revision), { status: 503, code: 'PROFILE_CONTACTS_SCHEMA_PENDING' });
  f.profiles.delete(f.b); const empty = await f.service.read(f.b);
  assert.equal((await f.service.saveProfile(f.b, { current_phone: '0831111111' }, empty.profile_revision)).body.profile.current_phone, '0831111111');
});

test('real JWT middleware + owner controller cannot read/write another student via query/body/params', async () => {
  const f = fixture(), secret = 'fixture-only-never-a-live-secret';
  const auth = isolated('services/unifiedAuth.service.js', {
    jsonwebtoken: jwt, './teacherAuth.service': {}, './staffAuth.service': {}, './superAdminAuth.service': {}, './adminAccountAccess.service': {}, './teacherAdminGrant.service': {},
  });
  const middleware = isolated('middlewares/auth.middleware.js', { jsonwebtoken: jwt, '../models': f.models,
    '../services/adminAccountAccess.service': { assertAccountAccess: async () => {} }, '../services/teacherAdminGrant.service': {},
    '../services/unifiedAuth.service': auth, '../validators/roleWorkflow.validator': require('../src/validators/roleWorkflow.validator'),
    '../services/staffAuth.service': { DEPARTMENT_STAFF_ACTOR_TYPE: 'department_staff', DEPARTMENT_STAFF_ROLE: 'department_staff' },
  }, { process: { env: { JWT_SECRET: secret } } });
  const controller = isolated('controllers/studentProfileAggregate.controller.js', { '../models': f.models, '../services/studentProfileValidation': rules,
    '../services/studentProfileAggregate.service': { createStudentProfileAggregateService }, '../services/studentProfileFiles.service': { createStudentProfileFilesService: () => ({}) } });
  async function request(handler, body, tokenId = f.a, headers = true) {
    const token = jwt.sign({ id: tokenId, student_id: tokenId, actor_type: 'student', role: 'student' }, secret, { expiresIn: '5m' });
    const req = { headers: headers ? { authorization: 'Bearer ' + token } : {}, body, query: { student_id: f.b }, params: { id: f.b }, get: () => revision };
    const res = response(); await middleware.authenticateStudentToken(req, res, () => handler(req, res)); return res;
  }
  let revision = (await f.service.read(f.a)).profile_revision;
  const otherBefore = JSON.stringify(await f.service.read(f.b));
  assert.equal((await request(controller.getProfile, {})).body.student.id, f.a);
  assert.equal((await request(controller.saveProfile, sample)).code, 200);
  revision = (await f.service.read(f.a)).profile_revision;
  assert.equal((await request(controller.saveProfile, { ...sample, student_id: f.b })).code, 400);
  assert.equal(JSON.stringify(await f.service.read(f.b)), otherBefore);
  const friendResult = await request(controller.children('close_friends', 'create'), friend);
  assert.equal(friendResult.code, 201); assert.equal(friendResult.body.record.student_id, f.a);
  assert.equal((await request(controller.children('close_friends', 'read'), {})).code, 404);
  revision = friendResult.body.profile_revision;
  f.models.StudentCloseFriend.create = async () => { throw Object.assign(new Error('private fixture phone/profile must not escape'), { name: 'SequelizeDatabaseError' }); };
  const failed = await request(controller.children('close_friends', 'create'), friend);
  assert.equal(failed.code, 500); assert.equal(failed.body.code, 'PROFILE_SAVE_FAILED');
  assert.equal(JSON.stringify(failed.body).includes('private fixture'), false);
  assert.equal(failed.headers['Cache-Control'], 'private, no-store');
  assert.equal((await request(controller.getProfile, {}, f.a, false)).code, 401);
  f.students.get(f.a).track = 'internship';
  assert.equal((await request(controller.getProfile, {})).code, 403);
});

test('actual Sequelize models add nullable columns, exclude contacts from legacy scope/INSERT RETURNING', async () => {
  const sequelize = new Sequelize('fixture', 'fixture', '', { dialect: 'postgres', logging: false });
  const models = Object.fromEntries(['Student', 'StudentProfile', 'StudentFile'].map(name => {
    const file = name[0].toLowerCase() + name.slice(1); return [name, require('../src/models/' + file + '.model')(sequelize)];
  }));
  require('../src/models/registerStudentProfileAggregate').registerStudentProfileAggregate(models, sequelize);
  for (const key of [...CONTACT_FIELDS, 'english_prefix']) {
    assert.equal(models.StudentProfile.rawAttributes[key].allowNull, true);
    assert.ok(models.StudentProfile._scope.attributes.exclude.includes(key));
    assert.equal(schema.extensions.student_profiles.columns[key].nullable, true);
  }
  const options = { returning: true }; await models.StudentProfile.runHooks('beforeCreate', {}, options);
  const query = sequelize.getQueryInterface().queryGenerator.insertQuery('student_profiles', { id: randomUUID(), student_id: randomUUID() }, models.StudentProfile.rawAttributes, options).query;
  for (const key of [...CONTACT_FIELDS, 'english_prefix']) assert.equal(query.includes('"' + key + '"'), false);
  await sequelize.close();
});

test('PDF preview accepts legacy fields only; contact values cannot enter PDF import commits', async () => {
  const { safeExtraction, createStudentProfilePdfImportService } = require('../src/services/studentProfilePdfImport.service');
  const extraction = safeExtraction({ template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text',
    candidates: [{ scope: 'profile', key: 'current_phone', value: '0811111111' }, { scope: 'profile', key: 'national_id', value: syntheticId('9') }, ...CONTACT_FIELDS.map(key => ({ scope: 'profile', key, value: sample[key] }))] });
  assert.deepEqual(extraction.candidates.map(item => item.key), ['current_phone']);
  const f = fixture(), buffer = Buffer.from('%PDF-fixture'), file = { buffer, size: buffer.length, originalname: 'profile.pdf', mimetype: 'application/pdf' };
  await f.service.saveProfile(f.a, { ...sample, national_id: syntheticId('9') }, (await f.service.read(f.a)).profile_revision);
  let calls = 0;
  const pdf = createStudentProfilePdfImportService(f.models, f.service, { secret: 'synthetic-pdf-secret', extract: async (...args) => {
    calls++; assert.deepEqual(args, [buffer]); // Existing stored contacts never accompany the file to the processor.
    return { template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text', candidates: [], records: {}, identity: {} };
  } });
  const preview = await pdf.preview(f.a, file); assert.equal(calls, 1);
  await assert.rejects(() => pdf.commit(f.a, file, { receipt: preview.receipt, changes: { profile: sample } }, preview.snapshot.profile_revision), { status: 400 });
  await assert.rejects(() => pdf.commit(f.a, file, { receipt: preview.receipt, changes: { profile: { national_id: syntheticId('98') } } }, preview.snapshot.profile_revision), { status: 400 });
  assert.ok((await f.service.read(f.a)).profile.national_id === syntheticId('9'));
  assert.equal(f.profiles.get(f.a).student_line_id, sample.student_line_id);
});


test('multiple friends create/update/explicit delete/read-back atomically with stable owner IDs', async () => {
  const f = fixture(); const before = await f.service.read(f.a);
  const created = (await f.service.saveAggregate(f.a, { profile: sample, close_friends: { create: [friend, { nickname: 'ฟ้า' }, {}] } }, before.profile_revision)).body;
  assert.equal(created.close_friends.length, 3); assert.equal(created.aggregate_operations.length, 3);
  const [id, second, empty] = created.aggregate_operations.map(item => item.id);
  assert.equal(created.close_friends.find(item => item.id === second).nickname, 'ฟ้า');
  assert.equal(created.close_friends.find(item => item.id === second).full_name, null);
  assert.equal(Object.hasOwn(f.collections.close_friends.get(second), 'full_name'), false);
  const updated = (await f.service.saveAggregate(f.a, { close_friends: { update: [{ id, changes: { nickname: 'ใหม่' } }], delete: [second] } }, created.profile_revision)).body;
  assert.equal(updated.close_friends.length, 2);
  assert.equal(updated.close_friends.find(item => item.id === id).nickname, 'ใหม่');
  assert.equal(updated.close_friends.find(item => item.id === id).phone, friend.phone);
  assert.equal(updated.close_friends.find(item => item.id === id).full_name, friend.full_name);
  assert.equal(f.collections.close_friends.get(id).full_name, friend.full_name);
  assert.equal(updated.close_friends.find(item => item.id === empty).nickname, null);
  const preserved = (await f.service.saveAggregate(f.a, { profile: { father_name: 'บิดาเดิม' } }, updated.profile_revision)).body;
  assert.deepEqual(preserved.close_friends, updated.close_friends);
  assert.deepEqual((await f.service.read(f.a)).close_friends, updated.close_friends);
  assert.equal((await f.service.read(f.b)).close_friends.length, 0);
  const deleted = (await f.service.saveChild(f.a, 'close_friends', 'delete', id, {}, preserved.profile_revision)).body;
  assert.equal(deleted.close_friends.length, 1);
});

test('friend validation rejects unsafe URLs, invalid types/lengths/phones, FK assignment and duplicate target operations', async () => {
  const f = fixture(), before = await f.service.read(f.a);
  const invalid = [ { facebook_url: 'http://facebook.com/me' }, { facebook_url: 'javascript:run()' }, { facebook_url: 'data:text/html,x' },
    { facebook_url: 'https://facebook.com.evil.example/me' }, { facebook_url: 'https://user@facebook.com/me' }, { facebook_url: 'https://fb.com/me' },
    { facebook_url: 'https://facebook.com\\evil.example/me' }, { facebook_url: 'account.name' }, { facebook_url: {} }, { nickname: 'a'.repeat(101) },
    { full_name: '<script>' }, { phone: '123' }, { phone: '081\n0000000' }, { line_id: 'bad/id' }, { student_id: f.b }, { id: f.b }, { display_order: -1 } ];
  for (const values of invalid) await assert.rejects(async () => f.service.saveChild(f.a, 'close_friends', 'create', null, values, before.profile_revision), { status: 400 });
  assert.throws(() => f.service.prepareAggregate({ close_friends: [] }), { status: 400 });
  assert.throws(() => f.service.prepareAggregate({ close_friends: { delete: [f.b, f.b] } }), { status: 400 });
  assert.throws(() => f.service.prepareAggregate({ close_friends: { update: [{ id: f.b, changes: {} }], delete: [f.b] } }), { status: 400 });
  assert.throws(() => f.service.prepareAggregate({ close_friends: { create: Array.from({ length: 101 }, () => ({})) } }), { status: 400 });
  assert.equal((await f.service.read(f.a)).profile_revision, before.profile_revision);
});

test('friend owner isolation, stale If-Match and rollback preserve every aggregate part', async () => {
  const f = fixture(); const original = await f.service.read(f.a);
  const otherBefore = await f.service.read(f.b);
  const other = (await f.service.saveChild(f.b, 'close_friends', 'create', null, friend, otherBefore.profile_revision)).body;
  const otherId = other.close_friends[0].id;
  for (const action of ['update', 'delete']) await assert.rejects(() => f.service.saveChild(f.a, 'close_friends', action, otherId, action === 'update' ? { nickname: 'ใหม่' } : {}, original.profile_revision), { status: 404 });
  await assert.rejects(() => f.service.saveAggregate(f.a, { student: { faculty: 'changed' }, profile: { current_phone: '0821111111' }, close_friends: { create: [friend], delete: [otherId] } }, original.profile_revision), { status: 404 });
  assert.deepEqual(await f.service.read(f.a), original);
  const { aggregate_operations: otherReceipts, record: otherRecord, ...otherSnapshot } = other; assert.deepEqual(await f.service.read(f.b), otherSnapshot);
  const saved = (await f.service.saveChild(f.a, 'close_friends', 'create', null, friend, original.profile_revision)).body;
  await assert.rejects(() => f.service.saveChild(f.a, 'close_friends', 'update', saved.close_friends[0].id, { nickname: 'stale' }, original.profile_revision), { status: 409 });
  await assert.rejects(() => f.service.saveChild(f.a, 'close_friends', 'delete', saved.close_friends[0].id, {}, undefined), { status: 428 });
  const { aggregate_operations: receipts, record: savedRecord, ...savedSnapshot } = saved; assert.deepEqual(await f.service.read(f.a), savedSnapshot);
});

test('missing friend schema and legacy columns fail safely; existing profile save still works', async () => {
  for (const [ready, legacy, code] of [[false, false, 'CLOSE_FRIENDS_SCHEMA_PENDING'], [true, true, 'CLOSE_FRIENDS_LEGACY_REVIEW_REQUIRED']]) {
    const f = fixture(true, ready, legacy), before = await f.service.read(f.a);
    assert.equal(before.close_friends_available, false);
    await assert.rejects(() => f.service.saveAggregate(f.a, { profile: { current_phone: '0821111111' }, close_friends: { create: [friend] } }, before.profile_revision), { status: 503, code });
    assert.deepEqual(await f.service.read(f.a), before);
    assert.equal((await f.service.saveProfile(f.a, { current_phone: '0821111111' }, before.profile_revision)).body.profile.current_phone, '0821111111');
  }
});

test('friend model SQL generation, FK/index/check definitions and PDF isolation require no database connection', async () => {
  const sequelize = new Sequelize('fixture', 'fixture', '', { dialect: 'postgres', logging: false });
  const models = require('../src/models/studentProfileAggregate.factories').defineRelationModels(sequelize);
  const model = models.StudentCloseFriend;
  assert.equal(model.rawAttributes.student_id.references.model, 'students');
  assert.equal(model.rawAttributes.student_id.onDelete, 'CASCADE');
  assert.deepEqual(model.options.indexes[0].fields, ['student_id', 'display_order', 'id']);
  assert.equal(Object.keys(schema.extensions.student_profiles.columns).some(key => key.startsWith('close_friend_')), false);
  const qi = sequelize.getQueryInterface(), attrs = {};
  for (const [key,value] of Object.entries(model.rawAttributes)) attrs[key] = qi.queryGenerator.attributeToSQL(value, { context: 'createTable' });
  const sql = qi.queryGenerator.createTableQuery('student_close_friends', attrs);
  assert.match(sql, /REFERENCES "students"/); assert.match(sql, /"nickname" VARCHAR\(100\)/);
  assert.ok(require('../src/db/postgresIntegrity').constraints.some(item => item.table_name === 'student_close_friends'));
  await assert.rejects(() => model.build({ ...friend, facebook_url: 'http://facebook.com/me', student_id: require('node:crypto').randomUUID() }).validate());
  const { safeExtraction, createStudentProfilePdfImportService } = require('../src/services/studentProfilePdfImport.service');
  const extraction = safeExtraction({ template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text', candidates: [], records: { close_friends: [{ values: friend }] } });
  assert.equal(Object.hasOwn(extraction.records, 'close_friends'), false);
  const f = fixture(), buffer = Buffer.from('%PDF-fixture'), file = { buffer, size: buffer.length, originalname: 'profile.pdf', mimetype: 'application/pdf' };
  const pdf = createStudentProfilePdfImportService(f.models, f.service, { secret: 'fixture-pdf', extract: async () => ({ template: 'TGDE-COOP-02', page_count: 1, method: 'pdf_text', candidates: [], records: {}, identity: {} }) });
  const preview = await pdf.preview(f.a, file);
  await assert.rejects(() => pdf.commit(f.a, file, { receipt: preview.receipt, changes: { close_friends: { create: [friend] } } }, preview.snapshot.profile_revision), { status: 400 });
  await sequelize.close();
});
