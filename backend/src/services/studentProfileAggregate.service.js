const { createHash } = require("node:crypto");
const { Op } = require("sequelize");
const { profileRevision } = require("./studentProfileIntegrity");
const rules = require("./studentProfileValidation");
const specs = require("../db/prepared/student-profile-phase2a/schema");
const OWNER_ATTRIBUTES = ["id", "student_id", "first_name", "last_name", "email", "major", "year_level", "gpa", "profile_image", "track", "status", "advisor_teacher_id", "coop_advisor_teacher_id", "department", "faculty", "last_semester_gpa", "profile_data_revision"];
const PROFILE_ATTRIBUTES = ["id", "student_id", ...rules.EDITABLE_PROFILE_FIELDS, "createdAt", "updatedAt"];
const FILE_ATTRIBUTES = ["id", "student_id", "file_type", "original_name", "mime_type", "file_size", "document_label", "content_sha256", "document_version", "supersedes_file_id", "is_current", "createdAt", "updatedAt"];
const TEACHER_ATTRIBUTES = ["id", "academic_title", "first_name", "last_name", "email", "department", "major", "position", "status"];
const plain = instance => instance?.get ? instance.get({ plain: true }) : instance;
const pick = (instance, fields) => Object.fromEntries(fields.map(field => [field, plain(instance)?.[field] ?? null]));
function difference(current, patch) {
  return Object.fromEntries(Object.entries(patch).filter(([field, value]) => {
    const existing = current?.[field] ?? null;
    if (value !== null && existing !== null && ["gpa", "last_semester_gpa", "height_cm", "weight_kg"].includes(field)) return Number(existing) !== Number(value);
    return existing !== value;
  }));
}
function aggregateRevision(snapshot) {
  const student = pick(snapshot.student, ["id", ...rules.STUDENT_FIELDS, "profile_image", "profile_data_revision"]);
  student.profile_data_revision = String(student.profile_data_revision ?? "0");
  for (const field of ["gpa", "last_semester_gpa"]) if (student[field] !== null) student[field] = Number(student[field]).toFixed(2);
  const profile = snapshot.profile ? pick(snapshot.profile, rules.EDITABLE_PROFILE_FIELDS) : null;
  if (profile) for (const field of ["height_cm", "weight_kg"]) if (profile[field] !== null) profile[field] = Number(profile[field]);
  const relations = Object.fromEntries(Object.keys(rules.RELATIONS).map(key => [key, snapshot[key].map(row => {
    const result = { ...row };
    if (result.gpa !== undefined && result.gpa !== null) result.gpa = Number(result.gpa).toFixed(2);
    return result;
  })]));
  return '"' + createHash("sha256").update(JSON.stringify(["student-profile-aggregate-v2", student, profileRevision(student.id, snapshot.profile), profile, relations, snapshot.documents])).digest("hex") + '"';
}
function createStudentProfileAggregateService(models) {
  const { Student, StudentProfile, Teacher, StudentFile, sequelize } = models;
  async function owner(id, transaction, lock) {
    if (!rules.UUID.test(id || "")) rules.fail("Student authorization is required", 403);
    const student = await Student.findByPk(id, { attributes: OWNER_ATTRIBUTES, transaction, lock });
    if (!student) rules.fail("ไม่พบข้อมูลนักศึกษา", 404);
    return student;
  }
  async function snapshot(student, transaction) {
    const studentId = student.id;
    const profile = await StudentProfile.findOne({ where: { student_id: studentId }, attributes: PROFILE_ATTRIBUTES, transaction });
    const data = { student: pick(student, OWNER_ATTRIBUTES.filter(field => field !== "profile_data_revision")), profile: profile ? pick(profile, PROFILE_ATTRIBUTES) : null };
    // Counter is server-managed metadata and is used only to derive an opaque validator.
    const internal = { ...data, student: { ...data.student, profile_data_revision: student.profile_data_revision ?? "0" } };
    for (const [kind, spec] of Object.entries(rules.RELATIONS)) {
      const attributes = Object.keys(specs.tables[spec.table].columns);
      data[kind] = (await models[spec.model].findAll({ where: { student_id: studentId }, attributes, transaction, order: [["id", "ASC"]] })).map(row => pick(row, attributes));
      internal[kind] = data[kind];
    }
    data.documents = (await StudentFile.findAll({ where: { student_id: studentId, file_type: { [Op.in]: specs.newFileTypes }, is_current: true }, attributes: FILE_ATTRIBUTES, transaction, order: [["id", "ASC"]] })).map(row => pick(row, FILE_ATTRIBUTES));
    internal.documents = data.documents;
    data.profile_revision = aggregateRevision(internal);
    for (const [foreign, alias] of [["advisor_teacher_id", "advisorTeacher"], ["coop_advisor_teacher_id", "coopAdvisorTeacher"]]) {
      data.student[alias] = student[foreign] ? plain(await Teacher.findByPk(student[foreign], { attributes: TEACHER_ATTRIBUTES, transaction })) : null;
    }
    data.student.profile = data.profile;
    return { ...data, data: data.student, success: true };
  }
  async function read(id, inspect) {
    return sequelize.transaction(async transaction => {
      const student = await owner(id, transaction, transaction.LOCK.SHARE);
      const data = await snapshot(student, transaction);
      // Import status must inspect its file receipt while this same owner lock
      // is held, after any in-flight writer has committed or rolled back.
      return inspect ? inspect({ student, snapshot: data, transaction }) : data;
    });
  }
  async function mutate(id, expected, operation) {
    rules.revision(expected);
    return sequelize.transaction(async transaction => {
      const student = await owner(id, transaction, transaction.LOCK.UPDATE);
      const before = await snapshot(student, transaction);
      if (before.profile_revision !== expected) {
        const error = Object.assign(new Error("ข้อมูลเปลี่ยนแล้ว กรุณาตรวจสอบประวัติล่าสุดก่อนบันทึก"), {
          status: 409, code: "STUDENT_PROFILE_CONFLICT", latest: before,
        });
        throw error;
      }
      const result = await operation({ student, before, transaction });
      if (result.changed) {
        // Keep BIGINT as decimal string; never coerce a revision counter to Number.
        const counter = BigInt(student.profile_data_revision ?? "0") + 1n;
        if (counter > 9223372036854775807n) rules.fail("Profile revision counter exhausted", 503);
        await student.update({ profile_data_revision: counter.toString() }, { transaction, fields: ["profile_data_revision"] });
      }
      return { status: result.status || 200, body: { ...(await snapshot(student, transaction)), ...result.response } };
    });
  }
  async function writeProfile(context, patch) {
    const { before, student, transaction } = context;
    const changes = difference(before.profile, patch);
    if (!Object.keys(changes).length) return false;
    rules.validateProfileState({ ...(before.profile || {}), ...changes });
    const profile = await StudentProfile.findOne({ where: { student_id: student.id }, attributes: PROFILE_ATTRIBUTES, transaction, lock: transaction.LOCK.UPDATE });
    if (profile) await profile.update(changes, { transaction, fields: Object.keys(changes) });
    else await StudentProfile.create({ student_id: student.id, ...changes }, { transaction, fields: ["student_id", ...Object.keys(changes), "id"] });
    return true;
  }
  async function writeStudent(context, patch) {
    const { student, transaction } = context;
    const changes = difference(student, patch);
    if (!Object.keys(changes).length) return false;
    if (changes.advisor_teacher_id && !await Teacher.findOne({ where: { id: changes.advisor_teacher_id, status: "active" }, attributes: ["id"], transaction })) rules.fail("ไม่พบอาจารย์ที่ปรึกษาที่ active");
    await student.update(changes, { transaction, fields: Object.keys(changes) });
    return true;
  }
  async function ownedChild(context, kind, id) {
    if (!rules.UUID.test(id || "")) rules.fail("รหัสรายการไม่ถูกต้อง");
    const record = await models[rules.RELATIONS[kind].model].findOne({ where: { id, student_id: context.student.id }, transaction: context.transaction, lock: context.transaction.LOCK.UPDATE });
    if (!record) rules.fail("ไม่พบรายการของนักศึกษา", 404);
    return record;
  }
  async function childOperation(context, kind, action, id, patch) {
    const model = models[rules.RELATIONS[kind].model];
    if (action === "create") {
      const record = await model.create({ ...patch, student_id: context.student.id }, { transaction: context.transaction });
      return { changed: true, status: 201, response: { record: plain(record) } };
    }
    const record = await ownedChild(context, kind, id);
    if (action === "delete") {
      await record.destroy({ transaction: context.transaction });
      return { changed: true, response: { deleted_id: id } };
    }
    const changes = difference(record, patch);
    if (Object.keys(changes).length) await record.update(changes, { transaction: context.transaction, fields: Object.keys(changes) });
    return { changed: !!Object.keys(changes).length, response: { record: plain(record) } };
  }
  function saveProfile(id, body, expected) {
    const patch = rules.normalizeProfile(body);
    return mutate(id, expected, async context => ({ changed: await writeProfile(context, patch), status: context.before.profile ? 200 : Object.values(patch).some(value => value !== null) ? 201 : 200 }));
  }
  function saveStudent(id, body, expected) {
    const patch = rules.normalizeStudent(body);
    return mutate(id, expected, async context => ({ changed: await writeStudent(context, patch) }));
  }
  function saveChild(id, kind, action, recordId, body, expected) {
    if (!rules.RELATIONS[kind]) rules.fail("ไม่พบประเภทข้อมูล", 404);
    const patch = action === "delete" ? (rules.object(body, []), {}) : rules.normalizeChild(kind, body, action === "create");
    return mutate(id, expected, context => childOperation(context, kind, action, recordId, patch));
  }
  function prepareAggregate(body) {
    rules.object(body, ["student", "profile", ...Object.keys(rules.RELATIONS)]);
    const profile = body.profile === undefined ? undefined : rules.normalizeProfile(body.profile);
    const student = body.student === undefined ? undefined : rules.normalizeStudent(body.student);
    const operations = [];
    for (const kind of Object.keys(rules.RELATIONS)) {
      if (body[kind] === undefined) continue;
      rules.object(body[kind], ["create", "update", "delete"]);
      for (const action of ["create", "update", "delete"]) {
        const entries = body[kind][action] === undefined ? [] : body[kind][action];
        if (!Array.isArray(entries)) rules.fail("Child operations ต้องเป็น array");
        for (const entry of entries) {
          if (action === "update") rules.object(entry, ["id", "changes"]);
          const recordId = action === "create" ? undefined : action === "delete" ? entry : entry.id;
          if (action !== "create" && !rules.UUID.test(recordId || "")) rules.fail("รหัสรายการไม่ถูกต้อง");
          const patch = action === "delete" ? {} : rules.normalizeChild(kind, action === "update" ? entry.changes : entry, action === "create");
          operations.push({ kind, action, id: recordId, patch });
        }
      }
    }
    if (operations.length > 100) rules.fail("แก้ไขได้ไม่เกิน 100 Child operations ต่อคำขอ");
    const targets = operations.filter(op => op.id).map(op => op.kind + ":" + op.id);
    if (new Set(targets).size !== targets.length) rules.fail("ไม่อนุญาตให้แก้หรือลบรายการเดียวกันซ้ำในคำขอ");
    return { student, profile, operations };
  }
  async function applyAggregate(context, { student, profile, operations }) {
      let changed = false;
      if (student) changed = await writeStudent(context, student) || changed;
      if (profile) changed = await writeProfile(context, profile) || changed;
      for (const op of operations) changed = (await childOperation(context, op.kind, op.action, op.id, op.patch)).changed || changed;
      return changed;
  }
  function saveAggregate(id, body, expected) {
    const prepared = prepareAggregate(body);
    return mutate(id, expected, async context => ({ changed: await applyAggregate(context, prepared) }));
  }
  return { read, mutate, saveProfile, saveStudent, saveChild, saveAggregate, prepareAggregate, applyAggregate };
}
module.exports = { createStudentProfileAggregateService, aggregateRevision, OWNER_ATTRIBUTES, PROFILE_ATTRIBUTES, FILE_ATTRIBUTES, difference };
