const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const {
  createRoleWorkflowRouter,
} = require("../src/routes/roleWorkflow.routes");
const {
  createStaffLoginHandler,
} = require("../src/controllers/staffAuth.controller");
const {
  issueDepartmentStaffToken,
} = require("../src/services/staffAuth.service");
const { issueTeacherToken } = require("../src/services/teacherAuth.service");
const {
  createRoleWorkflowService,
} = require("../src/services/roleWorkflow.service");
const migration = require("../src/db/migrations/011_add_role_workflow_reviews");

test(
  "Role authentication, scopes, workflow, concurrency and migration on disposable PostgreSQL",
  { skip: process.env.ROLE_BACKEND_INTEGRATION_TEST !== "true" },
  async (t) => {
    const sequelize = new Sequelize("fitm_role_test", "postgres", null, {
      host: "a013-postgres",
      dialect: "postgres",
      logging: false,
      pool: { max: 8 },
    });
    let server;
    try {
      const [guard] = await sequelize.query(
        "SELECT current_database() AS db, current_setting('fitm.a013_disposable', true) AS disposable",
        { type: Sequelize.QueryTypes.SELECT },
      );
      assert.equal(guard.db, "fitm_role_test");
      assert.equal(guard.disposable, "on");
      const m = { sequelize };
      for (const file of fs
        .readdirSync(path.join(__dirname, "../src/models"))
        .filter((f) => f.endsWith(".model.js"))) {
        const model = require(`../src/models/${file}`)(sequelize);
        m[model.name] = model;
      }
      for (const model of Object.values(m))
        if (model.associate) model.associate(m);
      const umzug = new Umzug({
        migrations: {
          glob: ["*.js", { cwd: path.join(__dirname, "../src/db/migrations") }],
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({
          sequelize,
          tableName: "sequelize_meta",
        }),
        logger: undefined,
      });
      await umzug.up();
      await t.test(
        "011 up/down/up is reversible on empty fixture, with secure defaults",
        async () => {
          assert.equal((await umzug.executed()).length, 12);
          await umzug.down();
          const columns = await sequelize
            .getQueryInterface()
            .describeTable("teachers");
          assert.equal(columns.is_department_head, undefined);
          const originalQuery = sequelize.query;
          sequelize.query = function (statement, options) {
            if (
              typeof statement === "string" &&
              statement.startsWith("CREATE TABLE") &&
              statement.includes("job_posting_reviews")
            )
              return Promise.reject(new Error("injected DDL failure"));
            return originalQuery.call(this, statement, options);
          };
          try {
            await assert.rejects(
              () => migration.up({ context: sequelize.getQueryInterface() }),
              /injected DDL failure/,
            );
          } finally {
            sequelize.query = originalQuery;
          }
          assert.equal(
            (await sequelize.getQueryInterface().describeTable("teachers"))
              .is_department_head,
            undefined,
          );
          assert.equal(
            (await sequelize.getQueryInterface().showAllTables()).includes(
              "coop_request_reviews",
            ),
            false,
          );
          await umzug.up();
          assert.equal((await umzug.pending()).length, 0);
        },
      );
      const password = "fixture-password-123";
      const teacher = await m.Teacher.create({
        email: "advisor@example.test",
        first_name: "Advisor",
        last_name: "One",
        department: "FITM",
        major: "IT",
        password,
      });
      const other = await m.Teacher.create({
        email: "other@example.test",
        first_name: "Other",
        last_name: "Two",
        department: "FITM",
        major: "INE",
        password,
      });
      const head = await m.Teacher.create({
        email: "head@example.test",
        first_name: "Head",
        last_name: "One",
        department: "FITM",
        password,
        is_department_head: true,
      });
      const outsider = await m.Teacher.create({
        email: "outside@example.test",
        first_name: "Other",
        last_name: "Department",
        department: "OTHER",
        password,
      });
      const staff = await m.DepartmentStaff.create({
        email: "staff@example.test",
        first_name: "Staff",
        last_name: "One",
        password,
      });
      const student = await m.Student.create({
        student_id: "test-001",
        email: "fixture@email.kmutnb.ac.th",
        first_name: "Student",
        last_name: "One",
        track: "co_op",
        advisor_teacher_id: teacher.id,
        password,
      });
      await t.test(
        "011 rollback preserves granted Head privilege even before reviews exist",
        async () => {
          await assert.rejects(
            () => migration.down({ context: sequelize.getQueryInterface() }),
            /rollback refused/,
          );
          await head.reload();
          assert.equal(head.is_department_head, true);
        },
      );
      const legacyStudentToken = jwt.sign(
        { id: student.id, student_id: student.student_id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const tokens = {
        teacher: issueTeacherToken(teacher),
        other: issueTeacherToken(other),
        head: issueTeacherToken(head),
        staff: issueDepartmentStaffToken(staff),
        student: legacyStudentToken,
      };
      const app = express();
      app.use(express.json());
      app.post(
        "/api/staff/auth/login",
        createStaffLoginHandler({ DepartmentStaff: m.DepartmentStaff }),
      );
      app.use("/api/staff", createRoleWorkflowRouter("department_staff", m));
      app.use("/api/teachers", createRoleWorkflowRouter("teacher", m));
      app.use(
        "/api/department-head",
        createRoleWorkflowRouter("department_head", m),
      );
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      async function call(route, { token, method = "GET", body } = {}) {
        const response = await fetch(base + route, {
          method,
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined
              ? { "content-type": "application/json" }
              : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        assert.equal(
          /password_hash|token_hash/.test(JSON.stringify(data)),
          false,
        );
        if (response.status !== 200)
          assert.equal(
            /stack|sql|parameters/i.test(JSON.stringify(data)),
            false,
          );
        return { status: response.status, body: data };
      }
      const request = (status = "submitted", studentId = student.id) =>
        m.CoopRequest.create({
          student_id: studentId,
          company_name: "Test Company",
          company_province: "Bangkok",
          letter_recipient_name: "HR",
          company_address: "Bangkok",
          work_start_date: "2026-11-01",
          work_end_date: "2027-02-01",
          status,
          submitted_at: new Date(),
        });
      const approve = (namespace, id, token, body = {}) =>
        call(`/api/${namespace}/coop-requests/${id}/approve`, {
          token,
          method: "POST",
          body,
        });
      const reject = (namespace, id, token, reason = "Needs correction") =>
        call(`/api/${namespace}/coop-requests/${id}/reject`, {
          token,
          method: "POST",
          body: { reason },
        });
      await t.test(
        "Staff/Teacher/Head logins use real bcrypt and return safe actor-separated profiles",
        async () => {
          for (const [route, email, role] of [
            ["staff/auth/login", staff.email, "department_staff"],
            ["teachers/auth/login", teacher.email, "teacher"],
            ["department-head/auth/login", head.email, "department_head"],
          ]) {
            const result = await call(`/api/${route}`, {
              method: "POST",
              body: { email, password },
            });
            assert.equal(result.status, 200);
            assert.equal(
              jwt.verify(result.body.token, process.env.JWT_SECRET).role,
              role,
            );
          }
          assert.equal(
            (
              await call("/api/teachers/auth/login", {
                method: "POST",
                body: { email: teacher.email, password: "wrong" },
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await call("/api/department-head/auth/login", {
                method: "POST",
                body: { email: teacher.email, password },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await call("/api/teachers/auth/login", {
                method: "POST",
                body: {
                  email: teacher.email,
                  password,
                  is_department_head: true,
                },
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "all /me routes reload existing active actors and omit hashes",
        async () => {
          for (const [namespace, token] of [
            ["staff", tokens.staff],
            ["teachers", tokens.teacher],
            ["department-head", tokens.head],
          ])
            assert.equal(
              (await call(`/api/${namespace}/me`, { token })).status,
              200,
            );
        },
      );
      await t.test(
        "missing, invalid, expired credentials are 401; cross-role access is 403",
        async () => {
          for (const token of [
            undefined,
            "invalid",
            jwt.sign({ id: teacher.id }, process.env.JWT_SECRET, {
              expiresIn: -1,
            }),
          ])
            assert.equal(
              (await call("/api/teachers/me", { token })).status,
              401,
            );
          for (const [namespace, wrong] of [
            ["staff", tokens.student],
            ["teachers", tokens.student],
            ["department-head", tokens.student],
            ["teachers", tokens.staff],
            ["department-head", tokens.staff],
            ["department-head", tokens.teacher],
            ["staff", tokens.teacher],
          ])
            assert.equal(
              (await call(`/api/${namespace}/me`, { token: wrong })).status,
              403,
            );
          const missingActor = issueTeacherToken({
            id: crypto.randomUUID(),
            is_department_head: false,
          });
          assert.equal(
            (await call("/api/teachers/me", { token: missingActor })).status,
            403,
          );
        },
      );
      await t.test(
        "inactive Teacher cannot login or use an existing JWT",
        async () => {
          await other.update({ status: "inactive" });
          assert.equal(
            (
              await call("/api/teachers/auth/login", {
                method: "POST",
                body: { email: other.email, password },
              })
            ).status,
            401,
          );
          assert.equal(
            (await call("/api/teachers/me", { token: tokens.other })).status,
            403,
          );
          await other.update({ status: "active" });
        },
      );
      await t.test(
        "head privilege is checked in DB after JWT issuance; free-text position grants nothing",
        async () => {
          await head.update({ is_department_head: false });
          assert.equal(
            (await call("/api/department-head/me", { token: tokens.head }))
              .status,
            403,
          );
          await head.update({ is_department_head: true });
          await teacher.update({ position: "หัวหน้าภาควิชา" });
          assert.equal(
            (await call("/api/department-head/me", { token: tokens.teacher }))
              .status,
            403,
          );
        },
      );
      await t.test(
        "Teacher list/detail is scoped to student's selected class advisor; other teacher receives 403",
        async () => {
          const row = await request();
          const mine = await call("/api/teachers/coop-requests", {
            token: tokens.teacher,
          });
          assert.ok(mine.body.data.some((r) => r.id === row.id));
          const unrelated = await call("/api/teachers/coop-requests", {
            token: tokens.other,
          });
          assert.equal(unrelated.body.data.length, 0);
          assert.equal(
            (
              await call(`/api/teachers/coop-requests/${row.id}`, {
                token: tokens.other,
              })
            ).status,
            403,
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.other)).status,
            403,
          );
          assert.equal(
            (await reject("teachers", row.id, tokens.other)).status,
            403,
          );
        },
      );
      await t.test(
        "Teacher → Staff → Head approval follows stages and preserves audit actors",
        async () => {
          const row = await request();
          assert.equal(
            (await approve("staff", row.id, tokens.staff)).status,
            409,
          );
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).status,
            409,
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).body.data
              .request.status,
            "staff_review",
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).status,
            409,
          );
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).status,
            409,
          );
          const staffList = await call("/api/staff/coop-requests", {
            token: tokens.staff,
          });
          assert.ok(staffList.body.data.some((r) => r.id === row.id));
          assert.equal(
            (
              await call(`/api/staff/coop-requests/${row.id}`, {
                token: tokens.staff,
              })
            ).status,
            200,
          );
          assert.equal(
            (await approve("staff", row.id, tokens.staff)).body.data.request
              .status,
            "department_head_review",
          );
          const headList = await call("/api/department-head/coop-requests", {
            token: tokens.head,
          });
          assert.ok(headList.body.data.some((r) => r.id === row.id));
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).body.data
              .request.status,
            "approved",
          );
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).status,
            409,
          );
          const detail = await call(
            `/api/department-head/coop-requests/${row.id}`,
            { token: tokens.head },
          );
          assert.deepEqual(
            detail.body.data.reviews.map((r) => r.actor_role),
            ["teacher", "department_staff", "department_head"],
          );
          assert.ok(
            detail.body.data.reviews.every(
              (r) => r.createdAt && (r.teacher_id || r.department_staff_id),
            ),
          );
        },
      );
      await t.test(
        "advisor_review is accepted at Teacher stage without skipping Staff",
        async () => {
          const row = await request("advisor_review");
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).body.data
              .request.status,
            "staff_review",
          );
        },
      );
      await t.test(
        "each role may reject only its own stage, with required persisted reason",
        async () => {
          for (const [namespace, status, token] of [
            ["teachers", "submitted", tokens.teacher],
            ["staff", "staff_review", tokens.staff],
            ["department-head", "department_head_review", tokens.head],
          ]) {
            const row = await request(status);
            assert.equal(
              (await reject(namespace, row.id, token, " ")).status,
              400,
            );
            assert.equal(
              (await reject(namespace, row.id, token)).body.data.request.status,
              "rejected",
            );
            const event = await m.CoopRequestReview.findOne({
              where: { coop_request_id: row.id },
            });
            assert.equal(event.reason, "Needs correction");
            assert.equal((await reject(namespace, row.id, token)).status, 409);
          }
        },
      );
      await t.test(
        "terminal states and unsupported payloads/UUIDs cannot be reviewed",
        async () => {
          for (const status of [
            "approved",
            "document_issued",
            "in_progress",
            "rejected",
            "cancelled",
          ])
            assert.equal(
              (
                await approve(
                  "teachers",
                  (await request(status)).id,
                  tokens.teacher,
                )
              ).status,
              409,
            );
          const row = await request();
          assert.equal(
            (
              await approve("teachers", row.id, tokens.teacher, {
                status: "approved",
              })
            ).status,
            400,
          );
          assert.equal(
            (await approve("teachers", "not-uuid", tokens.teacher)).status,
            400,
          );
          assert.equal(
            (await approve("teachers", crypto.randomUUID(), tokens.teacher))
              .status,
            404,
          );
          assert.equal(
            (
              await call("/api/staff/coop-requests?status=unknown", {
                token: tokens.staff,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(
                "/api/staff/coop-requests?status=submitted&status=staff_review",
                { token: tokens.staff },
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "concurrent Teacher approvals produce one transition and one review event",
        async () => {
          const row = await request();
          const results = await Promise.all([
            approve("teachers", row.id, tokens.teacher),
            approve("teachers", row.id, tokens.teacher),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            await m.CoopRequestReview.count({
              where: { coop_request_id: row.id },
            }),
            1,
          );
        },
      );
      await t.test(
        "concurrent Staff/Head decisions each produce one legal transition",
        async () => {
          for (const [namespace, status, token] of [
            ["staff", "staff_review", tokens.staff],
            ["department-head", "department_head_review", tokens.head],
          ]) {
            const row = await request(status);
            const results = await Promise.all([
              approve(namespace, row.id, token),
              reject(namespace, row.id, token),
            ]);
            assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
            assert.equal(
              await m.CoopRequestReview.count({
                where: { coop_request_id: row.id },
              }),
              1,
            );
          }
        },
      );
      await t.test(
        "changing selected class advisor transfers pending review authority without altering project advisor",
        async () => {
          const row = await request();
          await m.Student.update(
            { advisor_teacher_id: other.id },
            { where: { id: student.id } },
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).status,
            403,
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.other)).status,
            200,
          );
          await m.Student.update(
            { advisor_teacher_id: teacher.id },
            { where: { id: student.id } },
          );
        },
      );
      await t.test(
        "Head search/filter and safe Teacher updates enforce department scope",
        async () => {
          const list = await call(
            "/api/department-head/teachers?q=Advisor&major=IT&department=FITM",
            { token: tokens.head },
          );
          assert.equal(list.status, 200);
          assert.equal(list.body.data.length, 1);
          const update = await call(
            `/api/department-head/teachers/${other.id}`,
            {
              token: tokens.head,
              method: "PATCH",
              body: {
                first_name: "Updated",
                last_name: "Name",
                email: "updated@example.test",
                major: "IT",
                department: "FITM",
              },
            },
          );
          assert.equal(update.status, 200);
          assert.equal(
            (
              await call(`/api/department-head/teachers/${other.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { is_department_head: true },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(`/api/department-head/teachers/${outsider.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { first_name: "Escape" },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await call(`/api/department-head/teachers/${other.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { department: "OTHER" },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await call("/api/department-head/teachers?department=OTHER", {
                token: tokens.head,
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await call("/api/department-head/teachers?limit=500", {
                token: tokens.head,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(`/api/department-head/teachers/${other.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { email: teacher.email },
              })
            ).status,
            409,
          );
        },
      );
      await t.test(
        "Head password reset uses bcrypt and own profile cannot promote or change department",
        async () => {
          const newPassword = "updated-fixture-password";
          assert.equal(
            (
              await call(`/api/department-head/teachers/${other.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { password: newPassword },
              })
            ).status,
            200,
          );
          await other.reload();
          assert.ok(await other.comparePassword(newPassword));
          assert.equal(await other.comparePassword(password), false);
          assert.equal(
            (
              await call("/api/department-head/me", {
                token: tokens.head,
                method: "PATCH",
                body: { first_name: "Updated Head" },
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await call("/api/department-head/me", {
                token: tokens.head,
                method: "PATCH",
                body: { department: "OTHER" },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(`/api/department-head/teachers/${other.id}`, {
                token: tokens.head,
                method: "PATCH",
                body: { password: "ก".repeat(30) },
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "Project advisor assignment is separate from class advisor and restricted to Co-op students",
        async () => {
          const result = await call(
            `/api/department-head/students/${student.id}/coop-advisor`,
            {
              token: tokens.head,
              method: "PATCH",
              body: { coop_advisor_teacher_id: other.id },
            },
          );
          assert.equal(result.status, 200);
          await student.reload();
          assert.equal(student.advisor_teacher_id, teacher.id);
          assert.equal(student.coop_advisor_teacher_id, other.id);
          await m.Student.update(
            { track: "internship" },
            { where: { id: student.id } },
          );
          assert.equal(
            (
              await call(
                `/api/department-head/students/${student.id}/coop-advisor`,
                {
                  token: tokens.head,
                  method: "PATCH",
                  body: { coop_advisor_teacher_id: other.id },
                },
              )
            ).status,
            400,
          );
          await m.Student.update(
            { track: "co_op" },
            { where: { id: student.id } },
          );
          assert.equal(
            (
              await call(
                `/api/department-head/students/${student.id}/coop-advisor`,
                {
                  token: tokens.head,
                  method: "PATCH",
                  body: { coop_advisor_teacher_id: outsider.id },
                },
              )
            ).status,
            400,
          );
          await other.update({ status: "inactive" });
          assert.equal(
            (
              await call(
                `/api/department-head/students/${student.id}/coop-advisor`,
                {
                  token: tokens.head,
                  method: "PATCH",
                  body: { coop_advisor_teacher_id: other.id },
                },
              )
            ).status,
            400,
          );
          await other.update({ status: "active" });
        },
      );
      await t.test(
        "Head cannot review a request whose class advisor belongs to another department",
        async () => {
          const outsideStudent = await m.Student.create({
            student_id: "outside-001",
            email: "outside@email.kmutnb.ac.th",
            first_name: "Outside",
            last_name: "Student",
            advisor_teacher_id: outsider.id,
            password,
          });
          const row = await request(
            "department_head_review",
            outsideStudent.id,
          );
          assert.equal(
            (
              await call(`/api/department-head/coop-requests/${row.id}`, {
                token: tokens.head,
              })
            ).status,
            403,
          );
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).status,
            403,
          );
        },
      );
      const company = await m.Company.create({
        name: "Review Company",
        normalized_name: "review company",
        email: "hr@example.test",
        normalized_email: "hr@example.test",
        phone: "021234567",
        address_no: "1",
        subdistrict: "Test",
        district: "Test",
        province: "Bangkok",
      });
      const submission = await m.JobSubmission.create({
        company_id: company.id,
        submitted_email: company.email,
        normalized_submitted_email: company.email,
        verification_status: "verified",
        verified_at: new Date(),
      });
      const job = (status = "pending_review", overrides = {}) =>
        m.JobPosting.create({
          company_id: company.id,
          submission_id: submission.id,
          title: "Internship Review",
          category: "information_technology",
          description: "Build reliable applications alongside the team.",
          quota: 1,
          compensation_text: "Negotiable",
          work_days_per_week: 5,
          status,
          ...overrides,
        });
      const publish = (id) =>
        call(`/api/staff/job-postings/${id}/publish`, {
          token: tokens.staff,
          method: "POST",
          body: {},
        });
      await t.test(
        "Staff pending-review list/detail includes submission, email, sibling jobs and work modes",
        async () => {
          const row = await job();
          await m.JobPostingWorkMode.create({
            job_posting_id: row.id,
            mode: "hybrid",
          });
          const list = await call("/api/staff/job-postings", {
            token: tokens.staff,
          });
          assert.ok(list.body.data.some((j) => j.id === row.id));
          const detail = await call(`/api/staff/job-postings/${row.id}`, {
            token: tokens.staff,
          });
          assert.equal(detail.status, 200);
          assert.equal(
            detail.body.data.job.submission.submitted_email,
            company.email,
          );
          assert.equal(detail.body.data.job.workModes[0].mode, "hybrid");
        },
      );
      await t.test(
        "Staff publish/reject records actor/time/reason and concurrent publication cannot duplicate",
        async () => {
          const row = await job();
          const results = await Promise.all([publish(row.id), publish(row.id)]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          await row.reload();
          assert.equal(row.status, "published");
          assert.ok(row.published_at && row.reviewed_at);
          assert.equal(
            await m.JobPostingReview.count({
              where: { job_posting_id: row.id },
            }),
            1,
          );
          const denied = await job();
          assert.equal(
            (
              await call(`/api/staff/job-postings/${denied.id}/reject`, {
                token: tokens.staff,
                method: "POST",
                body: {},
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(`/api/staff/job-postings/${denied.id}/reject`, {
                token: tokens.staff,
                method: "POST",
                body: { reason: "Incomplete job description" },
              })
            ).status,
            200,
          );
          const event = await m.JobPostingReview.findOne({
            where: { job_posting_id: denied.id },
          });
          assert.equal(event.department_staff_id, staff.id);
          assert.equal(event.reason, "Incomplete job description");
          assert.equal((await publish(denied.id)).status, 409);
        },
      );
      await t.test(
        "Staff cannot publish unverified, terminal or date-expired jobs",
        async () => {
          for (const status of [
            "pending_email_verification",
            "published",
            "rejected",
            "withdrawn",
            "expired",
          ])
            assert.equal((await publish((await job(status)).id)).status, 409);
          assert.equal(
            (
              await publish(
                (
                  await job("pending_review", {
                    expires_at: new Date(Date.now() - 1000),
                  })
                ).id,
              )
            ).status,
            409,
          );
          await submission.update({
            verification_status: "pending_email_verification",
          });
          assert.equal((await publish((await job()).id)).status, 409);
          await submission.update({ verification_status: "verified" });
        },
      );
      await t.test(
        "audit insertion failures roll status mutation back atomically",
        async () => {
          const row = await request();
          const service = createRoleWorkflowService({
            ...m,
            CoopRequestReview: {
              create: async () => {
                throw new Error("injected audit failure");
              },
            },
          });
          await assert.rejects(() =>
            service.reviewRequest("teacher", teacher.id, row.id, "approve", {}),
          );
          await row.reload();
          assert.equal(row.status, "submitted");
          const posting = await job();
          const jobs = createRoleWorkflowService({
            ...m,
            JobPostingReview: {
              create: async () => {
                throw new Error("injected audit failure");
              },
            },
          });
          await assert.rejects(() =>
            jobs.reviewJob(staff.id, posting.id, "approve", {}),
          );
          await posting.reload();
          assert.equal(posting.status, "pending_review");
        },
      );
      await t.test(
        "database audit constraints enforce reviewer FKs, role identity, legal transitions and rejection reason",
        async () => {
          const row = await request();
          const baseEvent = {
            coop_request_id: row.id,
            actor_role: "teacher",
            teacher_id: teacher.id,
            from_status: "submitted",
            to_status: "staff_review",
            decision: "approve",
          };
          for (const override of [
            { teacher_id: crypto.randomUUID() },
            { department_staff_id: staff.id },
            { to_status: "approved" },
            { decision: "reject", to_status: "rejected", reason: null },
          ])
            await assert.rejects(() =>
              m.CoopRequestReview.create({ ...baseEvent, ...override }),
            );
          await assert.rejects(() => staff.destroy()); // Existing reviews retain actor identity.
        },
      );
      await t.test(
        "011 down refuses to erase populated audit records or privileges",
        async () => {
          const before = await m.CoopRequestReview.count();
          await assert.rejects(
            () => migration.down({ context: sequelize.getQueryInterface() }),
            /rollback refused/,
          );
          assert.equal(await m.CoopRequestReview.count(), before);
          assert.equal((await umzug.executed()).length, 12);
        },
      );
      await t.test(
        "deactivated Staff and revoked Head cannot mutate with previously valid tokens",
        async () => {
          const row = await request("staff_review");
          const posting = await job();
          await staff.update({ is_active: false });
          assert.equal(
            (await approve("staff", row.id, tokens.staff)).status,
            403,
          );
          assert.equal((await publish(posting.id)).status, 403);
          const headRow = await request("department_head_review");
          await head.update({ is_department_head: false });
          assert.equal(
            (await approve("department-head", headRow.id, tokens.head)).status,
            403,
          );
          await staff.update({ is_active: true });
          await head.update({ is_department_head: true });
        },
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await sequelize.close();
    }
  },
);
