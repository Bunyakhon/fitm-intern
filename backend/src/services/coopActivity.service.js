const crypto = require('node:crypto');
const { Op } = require('sequelize');
const r = require('./coopActivityRules');
const publicFields = ['id','title','description','category','starts_at','ends_at','timezone','location','meeting_url','status','published_at','version','createdAt','updatedAt'];
const staffFields = [...publicFields,'internal_notes','created_by','updated_by'];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const duplicate = row => hash([row.title.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(), row.starts_at.toISOString(), row.ends_at.toISOString()]);
function createCoopActivityService(m) {
  const project = (row, staff) => Object.fromEntries((staff ? staffFields : publicFields).map(key => [key, row[key]]));
  async function schema() {
    const [[row]] = await m.sequelize.query("SELECT to_regclass('coop_activities') AS activities,to_regclass('coop_activity_history') AS history");
    if (!row.activities || !row.history) r.fail(503, 'ACTIVITY_SCHEMA_REQUIRED', 'ปฏิทินยังไม่พร้อมใช้งาน กรุณาให้ผู้ดูแลตรวจสอบ migration 021');
  }
  async function actor(id, transaction) {
    const row = await m.DepartmentStaff.findOne({ where: { id: r.uuid(id), is_active: true }, transaction, lock: transaction.LOCK.SHARE });
    if (!row) r.fail(403, 'STAFF_REQUIRED', 'ไม่มีสิทธิ์จัดการกิจกรรม'); return row;
  }
  async function audit(row, staff, action, reason, transaction) {
    await m.CoopActivityHistory.create({ activity_id: row.id, version: row.version, action, staff_id: staff.id, actor_name: `${staff.first_name} ${staff.last_name}`, reason, snapshot: project(row, true) }, { transaction });
  }
  async function list(query = {}, staff = false) {
    await schema(); r.body(query, ['search','category','status','from','to','limit','offset']);
    const where = {}, search = r.text(query.search, false, 100);
    if (!staff) where.published_at = { [Op.ne]: null };
    if (query.status) { if (!(staff ? ['draft','published','canceled'] : ['published','canceled']).includes(query.status)) r.fail(400,'INVALID_STATUS','สถานะไม่ถูกต้อง'); where.status = query.status; }
    if (query.category) { if (!r.categories.includes(query.category)) r.fail(400,'INVALID_CATEGORY','ประเภทไม่ถูกต้อง'); where.category = query.category; }
    if (search) { const pattern = `%${search.replace(/[\\%_]/g,'\\$&')}%`; where[Op.or] = ['title','description','location'].map(key => ({ [key]: { [Op.iLike]: pattern } })); }
    const from = query.from ? r.dateTime(query.from) : null, to = query.to ? r.dateTime(query.to) : null;
    if (from && to && to <= from) r.fail(400,'INVALID_RANGE','ช่วงวันที่ไม่ถูกต้อง');
    if (from) where.ends_at = { [Op.gt]: from }; if (to) where.starts_at = { [Op.lt]: to };
    const number = (value, fallback, max) => { if (value === undefined) return fallback; if (!/^\d+$/.test(String(value)) || Number(value) > max) r.fail(400,'INVALID_PAGE','ช่วงรายการไม่ถูกต้อง'); return Number(value); };
    const limit = number(query.limit, 100, 200), offset = number(query.offset, 0, 1000000); if (!limit) r.fail(400,'INVALID_PAGE','จำนวนรายการต้องมากกว่าศูนย์');
    const result = await m.CoopActivity.findAndCountAll({ where, attributes: staff ? staffFields : publicFields, order: [['starts_at','ASC'],['id','ASC']], limit, offset });
    return { activities: result.rows.map(row => project(row, staff)), total: result.count, limit, offset };
  }
  async function detail(id, staff = false) {
    await schema(); const row = await m.CoopActivity.findOne({ where: { id: r.uuid(id), ...(!staff && { published_at: { [Op.ne]: null } }) }, attributes: staff ? staffFields : publicFields });
    if (!row) r.fail(404,'ACTIVITY_NOT_FOUND','ไม่พบกิจกรรม');
    return { activity: project(row,staff), ...(staff && { history: (await m.CoopActivityHistory.findAll({ where: { activity_id: id }, order: [['version','ASC']] })).map(e => e.toJSON()) }) };
  }
  async function create(staffId, input) {
    await schema(); const values = r.activityInput(input), key = r.uuid(input.creation_key), creation_hash = hash(values);
    return m.sequelize.transaction(async transaction => {
      const staff = await actor(staffId,transaction);
      // Serialize retries across actors before checking the durable idempotency record.
      await m.sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))', { replacements: { key }, transaction });
      const existing = await m.CoopActivity.findOne({ where: { creation_key: key }, transaction });
      if (existing) { if (existing.created_by !== staffId || existing.creation_hash !== creation_hash) r.fail(409,'CREATION_KEY_CONFLICT','รหัสการบันทึกถูกใช้งานแล้ว'); return { activity: project(existing,true), replayed: true }; }
      const row = await m.CoopActivity.create({ ...values, timezone: 'Asia/Bangkok', version: 1, created_by: staffId, updated_by: staffId, creation_key: key, creation_hash, duplicate_key: duplicate(values), published_at: values.status === 'published' ? new Date() : null }, { transaction });
      await audit(row,staff,'created','',transaction); return { activity: project(row,true), replayed: false };
    });
  }
  async function update(staffId, id, input, cancel = false) {
    await schema(); r.uuid(id);
    if (cancel) r.body(input,['version','reason']);
    const values = cancel ? {} : r.activityInput(input,true), expected = r.version(input.version), reason = r.text(input.reason,true,2000);
    return m.sequelize.transaction(async transaction => {
      const staff = await actor(staffId,transaction), row = await m.CoopActivity.findByPk(id,{ transaction, lock: transaction.LOCK.UPDATE });
      if (!row) r.fail(404,'ACTIVITY_NOT_FOUND','ไม่พบกิจกรรม');
      if (row.version !== expected) r.fail(409,'STALE_ACTIVITY','ข้อมูลเปลี่ยนแล้ว กรุณาโหลดกิจกรรมล่าสุดก่อนแก้ไข');
      if (row.status === 'canceled') r.fail(409,'ACTIVITY_CANCELED','กิจกรรมถูกยกเลิกแล้ว');
      if (!cancel && row.published_at && values.status !== 'published') r.fail(409,'ALREADY_PUBLISHED','กิจกรรมเผยแพร่แล้ว หากไม่จัดกิจกรรมให้ยกเลิกพร้อมเหตุผล');
      await row.update({ ...values, ...(cancel ? { status: 'canceled' } : { duplicate_key: duplicate(values), published_at: row.published_at || (values.status === 'published' ? new Date() : null) }), version: row.version+1, updated_by: staffId }, { transaction });
      await audit(row,staff,cancel ? 'canceled' : 'updated',reason,transaction); return { activity: project(row,true) };
    });
  }
  return { list, detail, create, update };
}
module.exports = { createCoopActivityService };
