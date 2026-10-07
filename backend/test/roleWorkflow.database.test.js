const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
process.env.JWT_SECRET ||= crypto.randomBytes(32).toString('hex');
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
    const sequelize = process.env.ROLE_DISPOSABLE_DATABASE_URL ? new Sequelize(process.env.ROLE_DISPOSABLE_DATABASE_URL, {dialect: 'postgres', logging: false, pool: {max: 8}}) : new Sequelize("fitm_role_test", "postgres", null, {
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
      await umzug.up({to: '011_add_role_workflow_reviews.js'});
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
          await umzug.up({to: '011_add_role_workflow_reviews.js'});
          assert.deepEqual((await umzug.pending()).map(m => m.name), [
            "012_coop_prerequisites_and_direct_review.js",
            "013_add_coop_projects_and_current_files.js",
            "014_add_coop_project_advisor_requests.js",
            "015_add_company_evaluations.js",
            "016_add_coop_documents.js",
          ]);
        },
      );
      await umzug.up(); // 012 corrects review constraints before workflow fixtures.
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
        const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {message: 'Route unavailable'};
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
      const request = (status = "advisor_review", studentId = student.id) =>
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
        "Teacher → Head approval follows stages; Staff is view/cancel only",
        async () => {
          const row = await request();
          assert.equal(
            (await approve("staff", row.id, tokens.staff)).status,
            404,
          );
          assert.equal(
            (await approve("department-head", row.id, tokens.head)).status,
            409,
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).body.data
              .request.status,
            "department_head_review",
          );
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).status,
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
            (await approve("staff", row.id, tokens.staff)).status,
            404,
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
            ["teacher", "department_head"],
          );
          assert.ok(
            detail.body.data.reviews.every(
              (r) => r.createdAt && (r.teacher_id || r.department_staff_id),
            ),
          );
        },
      );
      await t.test(
        "advisor_review advances directly to Head",
        async () => {
          const row = await request("advisor_review");
          assert.equal(
            (await approve("teachers", row.id, tokens.teacher)).body.data
              .request.status,
            "department_head_review",
          );
        },
      );
      await t.test(
        "each role may reject only its own stage, with required persisted reason",
        async () => {
          for (const [namespace, status, token] of [
            ["teachers", "advisor_review", tokens.teacher],
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
            "submitted",
            "staff_review",
            "department_head_review",
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
        "concurrent Head decisions produce one legal transition",
        async () => {
          for (const [namespace, status, token] of [
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
        "Legacy Head assignment cannot bypass Student request and Teacher confirmation",
        async () => {
          const result = await call(
            `/api/department-head/students/${student.id}/coop-advisor`,
            {
              token: tokens.head,
              method: "PATCH",
              body: { coop_advisor_teacher_id: other.id },
            },
          );
          assert.equal(result.status, 409);
          await student.reload();
          assert.equal(student.advisor_teacher_id, teacher.id);
          assert.equal(student.coop_advisor_teacher_id, null);
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
            409,
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
            409,
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
            409,
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
          assert.equal(row.status, "advisor_review");
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
            to_status: "department_head_review",
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
          const ledgerBefore = (await umzug.executed()).map(m => m.name);
          await assert.rejects(
            () => migration.down({ context: sequelize.getQueryInterface() }),
            /rollback refused/,
          );
          assert.equal(await m.CoopRequestReview.count(), before);
          assert.deepEqual((await umzug.executed()).map(m => m.name), ledgerBefore);
        },
      );
      await t.test(
        "deactivated Staff and revoked Head cannot mutate with previously valid tokens",
        async () => {
          const row = await request("staff_review");
          const posting = await job();
          await staff.update({ is_active: false });
          assert.equal(
            (await call(`/api/staff/coop-requests/${row.id}/cancel`, {method: 'POST', token: tokens.staff, body: {reason: 'Fixture cancellation'}})).status,
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
      // Load the real controller against this guarded disposable registry only;
      await t.test('Staff HTTP cancellation is audited, terminal-safe and concurrent-safe', async () => {
        const cancel = id => call(`/api/staff/coop-requests/${id}/cancel`, {token:tokens.staff, method:'POST', body:{reason:'Department cancellation'}});
        for (const status of ['submitted','advisor_review','staff_review','department_head_review']) {
          const row = await request(status); const result = await cancel(row.id);
          assert.equal(result.status,200); assert.equal(result.body.data.request.status,'cancelled');
          assert.equal(result.body.data.review.actor_role,'department_staff'); assert.equal(result.body.data.review.from_status,status);
        }
        for (const status of ['approved','rejected','cancelled']) {const row = await request(status); assert.equal((await cancel(row.id)).status,409);}
        const row = await request('advisor_review'); const results = await Promise.all([cancel(row.id),cancel(row.id)]);
        assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
        assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:row.id}}),1);
        assert.equal((await call(`/api/staff/coop-requests/${row.id}/cancel`, {token:tokens.teacher,method:'POST',body:{reason:'Fixture'}})).status,403);
      });
      // restore module caches immediately, never connect its normal DB instance.
      const registryPath = require.resolve('../src/models');
      const controllerPath = require.resolve('../src/controllers/coopRequest.controller');
      const registryExports = require.cache[registryPath].exports;
      const controllerCache = require.cache[controllerPath];
      let studentController;
      try {
        require.cache[registryPath].exports = m;
        delete require.cache[controllerPath];
        studentController = require(controllerPath);
      } finally {
        require.cache[registryPath].exports = registryExports;
        if (controllerCache) require.cache[controllerPath] = controllerCache;
        else delete require.cache[controllerPath];
      }
      const {CATALOG} = require('../src/services/coopPrerequisites');
      const response = () => ({statusCode: 200, status(code) {this.statusCode = code; return this;}, json(body) {this.body = body; return this;}});
      const requestFields = {company_name:'Safe fixture', company_province:'Bangkok', company_address:'123 Fixture', letter_recipient_name:'Recipient', work_start_date:'2026-11-01', work_end_date:'2027-01-01', delivery_methods:['email']};
      for (const decision of ['approve','reject']) await t.test(`Head ${decision}: full authenticated Class -> Head HTTP/SQL/Student history with safe named actors`,async()=>{
        const suffix=crypto.randomUUID().slice(0,8);
        const owner=await m.Student.create({student_id:`head-${suffix}`,email:`head-${suffix}@email.kmutnb.ac.th`,first_name:'Head',last_name:'Advisee',major:'IT',track:'co_op',advisor_teacher_id:teacher.id,coop_advisor_teacher_id:other.id,password});
        const created=response();await studentController.createCoopRequest({user:{id:owner.id},body:{...requestFields,prerequisite_courses:CATALOG.IT.map(([course_code])=>({course_code,status:'passed',grade:'B+'}))}},created);
        assert.equal(created.statusCode,201);const id=created.body.data.id;
        assert.equal((await approve('department-head',id,tokens.head)).status,409);assert.equal((await reject('department-head',id,tokens.head)).status,409);
        assert.equal((await m.CoopRequest.findByPk(id)).status,'advisor_review');assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:id}}),1);
        assert.equal((await approve('teachers',id,tokens.teacher)).status,200);assert.equal((await approve('teachers',id,tokens.teacher)).status,409);
        const queue=await call('/api/department-head/coop-requests',{token:tokens.head});assert.equal(queue.status,200);
        const mine=queue.body.data.find(row=>row.id===id);assert.ok(mine);assert.equal(mine.status,'department_head_review');assert.equal(mine.student.advisorTeacher.id,teacher.id);assert.equal(mine.student.email,undefined);
        assert.equal(mine.prerequisite_courses.length,5);const approvedByClass=mine.reviews.find(row=>row.actor_role==='teacher');assert.equal(approvedByClass.teacher.id,teacher.id);assert.ok(approvedByClass.createdAt);
        const detail=await call(`/api/department-head/coop-requests/${id}`,{token:tokens.head});assert.equal(detail.status,200);assert.equal(detail.body.data.reviews.length,2);assert.equal(detail.body.data.reviews.find(row=>row.actor_role==='teacher').teacher.first_name,teacher.first_name);
        for(const token of [tokens.teacher,tokens.other,tokens.staff,tokens.student]) {
          for(const route of ['/api/department-head/coop-requests?is_department_head=true',`/api/department-head/coop-requests/${id}`])assert.equal((await call(route,{token})).status,403);
          assert.equal((await approve('department-head',id,token)).status,403);assert.equal((await reject('department-head',id,token)).status,403);
        }
        assert.equal((await approve('department-head',id,undefined)).status,401);
        assert.equal((await approve('department-head',id,tokens.head,{is_department_head:true})).status,400);
        assert.equal((await approve('department-head',id,tokens.head,{teacher_id:teacher.id})).status,400);
        const results=await Promise.all(Array.from({length:2},()=>decision==='approve'?approve('department-head',id,tokens.head):reject('department-head',id,tokens.head,'  Head correction  ')));
        assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);const expected=decision==='approve'?'approved':'rejected';
        assert.equal((await approve('department-head',id,tokens.head)).status,409);assert.equal((await reject('department-head',id,tokens.head)).status,409);
        const audits=await m.CoopRequestReview.findAll({where:{coop_request_id:id},order:[['created_at','ASC']]});assert.equal(audits.length,3);
        assert.deepEqual(audits.map(row=>row.actor_role),['student','teacher','department_head']);assert.equal(audits[2].teacher_id,head.id);assert.equal(audits[2].from_status,'department_head_review');assert.equal(audits[2].to_status,expected);assert.equal(audits[2].decision,decision);assert.ok(audits.every(row=>row.createdAt));
        const read=response();await studentController.getCoopRequestById({user:{id:owner.id},params:{id}},read);assert.equal(read.statusCode,200);assert.equal(read.body.data.status,expected);assert.equal(read.body.data.reviews.length,3);
        if(decision==='reject')assert.equal(read.body.data.reviews.find(row=>row.actor_role==='department_head').reason,'Head correction');
        const history=response();await studentController.getMyCoopRequests({user:{id:owner.id}},history);assert.equal(history.body.data.find(row=>row.id===id).status,expected);
        const finalDetail=await call(`/api/department-head/coop-requests/${id}`,{token:tokens.head});assert.equal(finalDetail.body.data.reviews.find(row=>row.actor_role==='department_head').teacher.id,head.id);
        await owner.reload();assert.equal(owner.advisor_teacher_id,teacher.id);assert.equal(owner.coop_advisor_teacher_id,other.id);
      });
      await t.test('Head department scope and live flag block queue/detail/decisions despite spoofed text/claims',async()=>{
        const owner=await m.Student.create({student_id:'head-foreign-fixture',email:'head-foreign-fixture@email.kmutnb.ac.th',first_name:'Other',last_name:'Department',major:'IT',track:'co_op',advisor_teacher_id:outsider.id,password});
        const foreign=await request('department_head_review',owner.id);
        assert.ok(!(await call(`/api/department-head/coop-requests?department=OTHER&teacher_id=${outsider.id}&is_department_head=true`,{token:tokens.head})).body.data.some(row=>row.id===foreign.id));
        assert.equal((await call(`/api/department-head/coop-requests/${foreign.id}`,{token:tokens.head})).status,403);
        assert.equal((await approve('department-head',foreign.id,tokens.head)).status,403);assert.equal((await reject('department-head',foreign.id,tokens.head)).status,403);
        const row=await request('department_head_review');await head.update({is_department_head:false});
        try {
          assert.equal((await call('/api/department-head/coop-requests',{token:tokens.head})).status,403);assert.equal((await call(`/api/department-head/coop-requests/${row.id}`,{token:tokens.head})).status,403);
          assert.equal((await approve('department-head',row.id,tokens.head)).status,403);assert.equal((await reject('department-head',row.id,tokens.head)).status,403);
        }finally{await head.update({is_department_head:true});}
        const spoofed=jwt.sign({id:teacher.id,teacher_id:teacher.id,actor_type:'teacher',role:'department_head',is_department_head:true},process.env.JWT_SECRET,{expiresIn:'1h'});
        assert.equal((await approve('department-head',row.id,spoofed)).status,403);
        assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:row.id}}),0);assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:foreign.id}}),0);
      });
      await t.test('Head refuses every non-department_head_review state with no mutation or audit',async()=>{
        for(const state of ['submitted','staff_review','advisor_review','approved','rejected','cancelled','document_issued','in_progress']) {
          const row=await request(state);assert.equal((await approve('department-head',row.id,tokens.head)).status,409);assert.equal((await reject('department-head',row.id,tokens.head)).status,409);
          assert.equal((await m.CoopRequest.findByPk(row.id)).status,state);assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:row.id}}),0);
        }
      });
      for (const decision of ['approve', 'reject']) await t.test(`Class A / Project B ${decision}: authenticated HTTP, SQL history and Student read-back`, async () => {
        const suffix = crypto.randomUUID().slice(0, 8);
        const owner = await m.Student.create({student_id:`class-${suffix}`,email:`class-${suffix}@email.kmutnb.ac.th`,first_name:'Class',last_name:'Fixture',major:'IT',track:'co_op',advisor_teacher_id:teacher.id,coop_advisor_teacher_id:other.id,password});
        const created = response();
        await studentController.createCoopRequest({user:{id:owner.id},body:{...requestFields,prerequisite_courses:CATALOG.IT.map(([course_code])=>({course_code,status:'passed',grade:'A'}))}},created);
        assert.equal(created.statusCode,201); const id=created.body.data.id;
        const mine = await call(`/api/teachers/coop-requests?status=advisor_review&teacher_id=${other.id}`,{token:tokens.teacher});
        const listed = mine.body.data.find(row=>row.id===id); assert.ok(listed); assert.equal(listed.prerequisite_courses.length,5); assert.equal(listed.student.email,undefined);
        assert.ok(!(await call(`/api/teachers/coop-requests?teacher_id=${teacher.id}`,{token:tokens.other})).body.data.some(row=>row.id===id));
        assert.equal((await approve('teachers',id,tokens.other)).status,403);
        assert.equal((await reject('teachers',id,tokens.other)).status,403);
        assert.equal((await approve('teachers',id,undefined)).status,401);
        assert.equal((await approve('teachers',id,tokens.teacher,{teacher_id:other.id})).status,400);
        assert.equal((await m.CoopRequest.findByPk(id)).status,'advisor_review');
        const results=await Promise.all(Array.from({length:2},()=>decision==='approve'?approve('teachers',id,tokens.teacher):reject('teachers',id,tokens.teacher,'  Correction required  ')));
        assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);
        const expected=decision==='approve'?'department_head_review':'rejected';
        assert.equal((await m.CoopRequest.findByPk(id)).status,expected);
        const audits=await m.CoopRequestReview.findAll({where:{coop_request_id:id},order:[['created_at','ASC']]});
        assert.equal(audits.length,2); assert.equal(audits[0].decision,'submit'); assert.equal(audits[1].actor_role,'teacher');
        assert.equal(audits[1].teacher_id,teacher.id); assert.equal(audits[1].from_status,'advisor_review'); assert.equal(audits[1].to_status,expected);
        if(decision==='reject') assert.equal(audits[1].reason,'Correction required');
        const read=response(); await studentController.getCoopRequestById({user:{id:owner.id},params:{id}},read);
        assert.equal(read.statusCode,200); assert.equal(read.body.data.status,expected); assert.equal(read.body.data.reviews.length,2);
        if(decision==='reject') assert.equal(read.body.data.reviews.find(row=>row.decision==='reject').reason,'Correction required');
        const history=response(); await studentController.getMyCoopRequests({user:{id:owner.id}},history);
        assert.equal(history.body.data.find(row=>row.id===id).status,expected);
        const staffDetail=await call(`/api/staff/coop-requests/${id}`,{token:tokens.staff}); assert.equal(staffDetail.status,200); assert.equal(staffDetail.body.data.reviews.length,2);
        assert.equal((await approve('staff',id,tokens.staff)).status,404);
        assert.equal((await approve('teachers',id,tokens.staff)).status,403);
        await owner.reload(); assert.equal(owner.advisor_teacher_id,teacher.id); assert.equal(owner.coop_advisor_teacher_id,other.id);
      });
      await t.test('every non-advisor_review state blocks both Teacher decisions without history', async () => {
        for(const state of ['submitted','staff_review','department_head_review','approved','document_issued','in_progress','rejected','cancelled']) {
          const row=await request(state); assert.equal((await approve('teachers',row.id,tokens.teacher)).status,409); assert.equal((await reject('teachers',row.id,tokens.teacher)).status,409);
          assert.equal((await m.CoopRequest.findByPk(row.id)).status,state); assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:row.id}}),0);
        }
      });
      await t.test('Head flag on Teacher namespace cannot skip Class Advisor or perform final approval', async () => {
        const row=await request(); assert.equal((await approve('teachers',row.id,tokens.head)).status,403);
        const owner=await m.Student.create({student_id:'head-class-fixture',email:'head-class-fixture@email.kmutnb.ac.th',first_name:'Head',last_name:'Advisee',major:'IT',track:'co_op',advisor_teacher_id:head.id,password});
        const own=await request('advisor_review',owner.id);
        assert.equal((await approve('teachers',own.id,tokens.head)).body.data.request.status,'department_head_review');
        assert.equal((await approve('teachers',own.id,tokens.head)).status,409);
        assert.equal((await approve('department-head',row.id,tokens.teacher)).status,403);
      });
      for (const program of ['IT','INE']) await t.test(`${program} real controller SQL create/detail/history snapshot`, async () => {
        const owner = await m.Student.create({student_id:`coop-${program}`, email:`coop-${program}@email.kmutnb.ac.th`, first_name:'Fixture', last_name:'Student', track:'co_op', major:program, advisor_teacher_id:teacher.id, password});
        const prerequisite_courses = CATALOG[program].map(([course_code], index) => ({course_code,status:index === 0 ? 'passed' : 'unselected',grade:index === 0 ? 'B+' : null}));
        const create = response(); await studentController.createCoopRequest({user:{id:owner.id}, body:{...requestFields, prerequisite_courses}},create);
        assert.equal(create.statusCode,201); assert.equal(create.body.data.status,'advisor_review');
        const id = create.body.data.id;
        assert.equal(await m.CoopRequestPrerequisiteCourse.count({where:{coop_request_id:id}}),5);
        await owner.update({major:program === 'IT' ? 'INE' : 'IT'});
        const detail = response(); await studentController.getCoopRequestById({user:{id:owner.id},params:{id}},detail);
        assert.equal(detail.statusCode,200);
        assert.deepEqual(detail.body.data.prerequisite_courses.map(row => row.course_code),CATALOG[program].map(([code]) => code));
        assert.equal(detail.body.data.prerequisite_courses[0].program,program); assert.equal(detail.body.data.prerequisite_courses[0].grade,'B+');
        const foreign = response(); await studentController.getCoopRequestById({user:{id:student.id},params:{id}},foreign); assert.equal(foreign.statusCode,404);
        const cancelled = response(); await studentController.cancelCoopRequest({user:{id:owner.id},params:{id}},cancelled); assert.equal(cancelled.statusCode,200);
        const history = response(); await studentController.getMyCoopRequests({user:{id:owner.id}},history); assert.ok(history.body.data.some(row=>row.id === id));
        const old = response(); await studentController.getCoopRequestById({user:{id:owner.id},params:{id}},old); assert.equal(old.body.data.prerequisite_courses[0].grade,'B+');
        assert.equal(old.body.data.reviews.length,2);
        const nextProgram = program === 'IT' ? 'INE' : 'IT';
        const second = response(); await studentController.createCoopRequest({user:{id:owner.id},body:{...requestFields,prerequisite_courses:CATALOG[nextProgram].map(([course_code],index)=>({course_code,status:index === 0 ? 'passed' : 'unselected',grade:index === 0 ? 'A' : null}))}},second);
        assert.equal(second.statusCode,201);
        const original = response(); await studentController.getCoopRequestById({user:{id:owner.id},params:{id}},original);
        assert.equal(original.body.data.prerequisite_courses[0].grade,'B+'); assert.equal(original.body.data.prerequisite_courses[0].program,program);
      });
      await t.test('concurrent Student creates commit one complete request snapshot', async () => {
        const owner=await m.Student.create({student_id:'coop-race',email:'coop-race@email.kmutnb.ac.th',first_name:'Fixture',last_name:'Student',track:'co_op',major:'IT',password});
        const body={...requestFields,prerequisite_courses:CATALOG.IT.map(([course_code])=>({course_code,status:'unselected',grade:null}))};
        const results=[response(),response()]; await Promise.all(results.map(res=>studentController.createCoopRequest({user:{id:owner.id},body},res)));
        assert.deepEqual(results.map(res=>res.statusCode).sort(),[201,409]);
        const created=await m.CoopRequest.findOne({where:{student_id:owner.id}}); assert.equal(await m.CoopRequestPrerequisiteCourse.count({where:{coop_request_id:created.id}}),5);
        assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:created.id}}),1);
      });
      await t.test('real SQL snapshot failure rolls back Request and audit', async child => {
        const owner = await m.Student.create({student_id:'coop-rollback',email:'rollback-fixture@email.kmutnb.ac.th',first_name:'Fixture',last_name:'Student',track:'co_op',major:'IT',password});
        child.mock.method(console,'error',()=>{});
        child.mock.method(m.CoopRequestPrerequisiteCourse,'bulkCreate',async()=>{throw new Error('injected prerequisite failure');});
        const res=response(); await studentController.createCoopRequest({user:{id:owner.id},body:{...requestFields,prerequisite_courses:CATALOG.IT.map(([course_code])=>({course_code,status:'unselected',grade:null}))}},res);
        assert.equal(res.statusCode,500); assert.equal(await m.CoopRequest.count({where:{student_id:owner.id}}),0);
      });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await sequelize.close();
    }
  },
);
