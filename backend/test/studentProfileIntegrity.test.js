const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, sample, OWNER, OTHER } = require("./helpers/studentProfileIntegrityFixture");
const { PROFILE_FIELDS, isCalendarDate, todayInBangkok, profileRevision } = require("../src/services/studentProfileIntegrity");

for (const [label, patch] of [
  ["personal only", { birth_date: "2004-02-29", height_cm: 175 }],
  ["contact only", { current_phone: "0000000001", emergency_contact_name: "Safe Contact" }],
  ["both categories", { religion: "Safe Religion", parent_contact_address: "Safe Address" }],
]) {
  test(`${label}: partial write changes exactly requested fields and refresh agrees`, async t => {
    const f = await fixture(t), before = f.row();
    const loaded = await f.request("GET");
    assert.equal(loaded.status, 200);
    const saved = await f.request("PUT", patch, loaded.body.profile_revision);
    assert.equal(saved.status, 200);
    assert.deepEqual(f.writes, [patch]);
    for (const field of PROFILE_FIELDS) {
      const expected = Object.hasOwn(patch, field) ? patch[field] : before[field];
      if (["height_cm", "weight_kg"].includes(field) && expected != null) assert.equal(Number(f.row()[field]), Number(expected));
      else assert.deepEqual(f.row()[field], expected, field);
    }
    const refreshed = await f.request("GET");
    assert.equal(refreshed.body.profile_revision, saved.body.profile_revision);
    assert.deepEqual(refreshed.body.student.profile, saved.body.profile);
  });
}

test("unchanged full payload and empty object cause no writes; explicit null clears only that field", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  const unchanged = Object.fromEntries(PROFILE_FIELDS.map(field => [field, ["height_cm", "weight_kg"].includes(field) ? Number(before[field]) : before[field]]));
  assert.equal((await f.request("PUT", unchanged, revision)).status, 200);
  assert.equal((await f.request("PUT", {}, revision)).status, 200);
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.row(), before);
  assert.equal((await f.request("PUT", { allergies: null }, revision)).status, 200);
  assert.deepEqual(f.writes, [{ allergies: null }]);
  for (const field of PROFILE_FIELDS) assert.equal(f.row()[field], field === "allergies" ? null : before[field]);
});

test("legacy blank remains explicit clear; undefined/omitted fields never clear", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  assert.equal((await f.request("PUT", { medical_conditions: "", current_phone: undefined }, revision)).status, 200);
  assert.deepEqual(f.writes, [{ medical_conditions: null }]);
  assert.equal(f.row().current_phone, before.current_phone);
});

test("stale full payload is rejected even when it includes previously unchanged values", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  await f.request("PUT", { current_phone: "0000000001" }, revision);
  const stale = Object.fromEntries(PROFILE_FIELDS.map(field => [field, ["height_cm", "weight_kg"].includes(field) ? Number(before[field]) : before[field]]));
  const rejected = await f.request("PUT", stale, revision);
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.code, "STUDENT_PROFILE_CONFLICT");
  assert.equal(f.row().current_phone, "0000000001");
  assert.equal(f.writes.length, 1);
});

for (const empty of [false, true]) test(`two simultaneous browser snapshots (${empty ? "first create" : "existing row"}) get one success and one conflict`, async t => {
  const f = await fixture(t, { empty });
  const a = (await f.request("GET")).body.profile_revision;
  const b = (await f.request("GET")).body.profile_revision;
  const responses = await Promise.all([
    f.request("PUT", { current_phone: "0000000001" }, a),
    f.request("PUT", { related_skills: "Safe Skill" }, b),
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [empty ? 201 : 200, 409]);
  assert.equal(f.writes.length, 1);
  const latest = await f.request("GET");
  assert.equal((await f.request("PUT", { related_skills: "Confirmed Skill" }, latest.body.profile_revision)).status, 200);
  assert.equal(f.row().related_skills, "Confirmed Skill");
});

test("missing/malformed revision and read-only/ownership fields cannot write", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  assert.equal((await f.request("PUT", { current_phone: "0000000001" })).status, 428);
  for (const bad of ["*", "W/" + revision, "bad", `${revision}, ${revision}`]) {
    assert.equal((await f.request("PUT", { religion: "Safe" }, bad)).status, 400);
  }
  for (const field of ["id", "student_id", "first_name", "last_name", "email", "age", "advisor_teacher_id", "coop_advisor_teacher_id", "updatedAt", "profile_revision"]) {
    assert.equal((await f.request("PUT", { [field]: OTHER }, revision)).status, 400, field);
  }
  assert.equal((await f.request("GET", undefined, undefined, { auth: false })).status, 401);
  assert.equal((await f.request("PUT", {}, revision, { role: "teacher" })).status, 403);
  assert.equal((await f.request("PUT", { allergies: "Safe" }, revision, { id: OTHER })).status, 409);
  assert.deepEqual(f.row(), before);
  assert.equal(f.writes.length, 0);
});

test("failed transaction preserves all committed data", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  f.failCommit();
  assert.equal((await f.request("PUT", { religion: "Changed" }, revision)).status, 500);
  assert.deepEqual(f.row(), before);
  assert.equal(f.commits(), 0);
});

test("empty patch on missing profile does not create a blank row", async t => {
  const f = await fixture(t, { empty: true });
  assert.equal((await f.request("PUT", {}, (await f.request("GET")).body.profile_revision)).status, 200);
  assert.equal(f.row(), null);
  assert.equal(f.writes.length, 0);
});

test("calendar and leap-year validation through HTTP rejects invalid/future dates without any write", async t => {
  const f = await fixture(t), before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  for (const date of ["2023-02-30", "2023-02-29", "1900-02-29", "2024-04-31", "2024-00-01", "2024-13-01", "2024-01-00", "2024-01-32", "0000-01-01", "2024-2-01", "9999-12-31", 20240229]) {
    assert.equal((await f.request("PUT", { birth_date: date, religion: "Must not save" }, revision)).status, 400, String(date));
  }
  assert.deepEqual(f.row(), before);
  for (const date of ["2000-02-29", "2024-02-29", "2023-02-28", todayInBangkok(), null]) {
    const latest = (await f.request("GET")).body.profile_revision;
    assert.equal((await f.request("PUT", { birth_date: date }, latest)).status, 200, String(date));
    assert.equal(f.row().birth_date, date);
  }
});

test("calendar century rules, Bangkok midnight and numeric representation validators are stable", () => {
  assert.equal(isCalendarDate("1900-02-29"), false);
  assert.equal(isCalendarDate("2000-02-29"), true);
  assert.equal(isCalendarDate("2100-02-29"), false);
  assert.equal(todayInBangkok(new Date("2026-10-09T17:00:00Z")), "2026-10-10");
  assert.equal(profileRevision(OWNER, sample()), profileRevision(OWNER, { ...sample(), height_cm: 170, weight_kg: 60.5 }));
  assert.notEqual(profileRevision(OWNER, sample()), profileRevision(OTHER, sample()));
  assert.notEqual(profileRevision(OWNER, null), profileRevision(OWNER, {}));
});
