const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const models = require("../../src/models");
const { PROFILE_FIELDS, isCalendarDate, todayInBangkok, profileRevision } = require("../../src/services/studentProfileIntegrity");

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const sample = () => ({
  ...Object.fromEntries(PROFILE_FIELDS.map(field => [field, `Fixture ${field}`])),
  id: "33333333-3333-4333-8333-333333333333", student_id: OWNER,
  prefix: "นาย", birth_date: "2000-02-29", height_cm: "170.00", weight_kg: "60.50",
  father_age: 60, mother_age: 55, blood_type: "A", updatedAt: "2026-01-01T00:00:00.000Z",
  ...Object.fromEntries(["current_phone", "hometown_phone", "parent_phone", "emergency_contact_phone"].map(field => [field, "0000000000"])),
});

// Real HTTP + production router/auth/controller; database methods are guarded
// in-memory doubles. This test never connects to a database or runs migrations.
async function fixture(t, { empty = false } = {}) {
  let row = empty ? null : sample(), writes = [], commits = 0, failCommit = false;
  let ownerData = { id: OWNER, advisor_teacher_id: OTHER, major: "IT", year_level: 3, gpa: "3.00", profile_data_revision: "0" };
  const studentWrites = [], teacherQueries = [];
  let tail = Promise.resolve();
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  const student = id => ({ id, student_id: `safe-fixture-${id}`, first_name: "Safe", last_name: "Fixture", email: "fixture@example.invalid", profile: id === OWNER ? structuredClone(row) : null });
  t.mock.method(models.Student, "findByPk", async (id, options) => {
    if (options.transaction) {
      assert.ok([options.transaction.LOCK.UPDATE, options.transaction.LOCK.SHARE].includes(options.lock));
      assert.equal(options.transaction.ownerLocked, false);
      options.transaction.ownerLocked = true;
    }
    if (![OWNER, OTHER].includes(id)) return null;
    const state = id === OWNER ? options.transaction?.student || ownerData : { id, profile_data_revision: "0" };
    return { ...student(id), ...state, async update(values, updateOptions) {
      assert.equal(updateOptions.transaction, options.transaction);
      assert.deepEqual(updateOptions.fields, Object.keys(values));
      if (!Object.hasOwn(values, "profile_data_revision")) studentWrites.push(structuredClone(values));
      Object.assign(options.transaction.student, values);
      Object.assign(this, values);
    } };
  });
  t.mock.method(models.Teacher, "findByPk", async id => ({ id, first_name: "Safe", last_name: "Teacher" }));
  t.mock.method(models.Teacher, "findOne", async query => { teacherQueries.push(query); return { id: query.where.id }; });
  for (const name of ["StudentAddress", "StudentEducationRecord", "StudentTrainingRecord", "StudentSkill", "StudentFile"]) {
    t.mock.method(models[name], "findAll", async options => { assert.ok(options.transaction.ownerLocked); return []; });
  }
  const instance = (values, transaction) => ({
    ...structuredClone(values),
    async update(changes, options) {
      assert.equal(options.transaction, transaction);
      assert.deepEqual(options.fields, Object.keys(changes));
      writes.push(structuredClone(changes));
      Object.assign(transaction.row, changes, { updatedAt: `2026-01-01T00:00:${String(writes.length).padStart(2, "0")}.000Z` });
      for (const field of ["height_cm", "weight_kg"]) if (transaction.row[field] != null) transaction.row[field] = Number(transaction.row[field]).toFixed(2);
      Object.assign(this, transaction.row);
    },
    async reload(options) {
      assert.equal(options.transaction, transaction);
      for (const field of ["height_cm", "weight_kg"]) {
        if (transaction.row[field] != null) transaction.row[field] = Number(transaction.row[field]).toFixed(2);
      }
      Object.assign(this, transaction.row);
      return this;
    },
  });
  t.mock.method(models.StudentProfile, "findOne", async options => {
    const tx = options.transaction;
    assert.ok(tx.ownerLocked, "owner must be locked before profile lookup/creation");
    if (options.lock) assert.equal(options.lock, tx.LOCK.UPDATE);
    return options.where.student_id === OWNER && tx.row ? instance(tx.row, tx) : null;
  });
  t.mock.method(models.StudentProfile, "create", async (values, options) => {
    const tx = options.transaction;
    assert.ok(tx.ownerLocked);
    assert.equal(tx.row, null);
    tx.row = { ...Object.fromEntries(PROFILE_FIELDS.map(field => [field, null])), ...values,
      id: sample().id, updatedAt: "2026-01-02T00:00:00.000Z" };
    writes.push(structuredClone(values));
    return instance(tx.row, tx);
  });
  t.mock.method(models.sequelize, "transaction", async callback => {
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    const tx = { LOCK: { UPDATE: "UPDATE", SHARE: "SHARE" }, ownerLocked: false, row: structuredClone(row), student: structuredClone(ownerData) };
    try {
      const result = await callback(tx);
      if (failCommit) throw new Error("Injected commit failure");
      row = tx.row;
      ownerData = tx.student;
      if (writes.length || studentWrites.length) ++commits;
      return result;
    } finally { release(); }
  });
  const app = express();
  app.use(express.json());
  app.use("/api/student-profile", require("../../src/routes/studentProfile.routes"));
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const token = (id = OWNER, role = "student") => jwt.sign({ id, student_id: "safe-fixture", actor_type: role, role }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const request = async (method, body, revision, { id = OWNER, role = "student", auth = true, path = "/me" } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/student-profile${path}`, {
      method, headers: { ...(auth ? { Authorization: `Bearer ${token(id, role)}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(revision ? { "If-Match": revision } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  return { app, origin: `http://127.0.0.1:${server.address().port}`, token: token(), request, row: () => structuredClone(row), studentRow: () => structuredClone(ownerData), studentWrites, teacherQueries, writes, commits: () => commits, failCommit: () => { failCommit = true; } };
}

module.exports = { fixture, sample, OWNER, OTHER };
