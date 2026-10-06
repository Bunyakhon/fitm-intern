const models = require("../models");
const { Op } = require("sequelize");
const {
  WorkflowError,
  uuid,
  decisionPayload,
  teacherUpdate,
  text,
  page,
  object,
} = require("../validators/roleWorkflow.validator");
const {
  TEACHER_PROFILE_FIELDS,
  toSafeTeacherProfile,
} = require("./teacherAuth.service");
const { toSafeDepartmentStaffProfile } = require("./staffAuth.service");
const {prerequisiteInclude} = require('./coopPrerequisites');

const STAGES = {
  teacher: { from: ["submitted", "advisor_review"], next: "department_head_review" },
  department_head: { from: ["department_head_review"], next: "approved" },
};
const REQUEST_STATUSES = [
  "submitted",
  "staff_review",
  "advisor_review",
  "department_head_review",
  "approved",
  "document_issued",
  "in_progress",
  "rejected",
  "cancelled",
];
const JOB_STATUSES = [
  "pending_email_verification",
  "pending_review",
  "published",
  "rejected",
  "withdrawn",
  "expired",
];
const STUDENT_FIELDS = [
  "id",
  "student_id",
  "first_name",
  "last_name",
  "email",
  "major",
  "track",
  "status",
  "advisor_teacher_id",
  "coop_advisor_teacher_id",
];

function createRoleWorkflowService(m = models) {
  async function actor(role, id, transaction, lock) {
    uuid(id, "actor id");
    const record =
      role === "department_staff"
        ? await m.DepartmentStaff.findOne({
            where: { id, is_active: true },
            attributes: ["id", "first_name", "last_name", "email", "is_active"],
            transaction,
            lock,
          })
        : await m.Teacher.findOne({
            where: { id, status: "active" },
            attributes: TEACHER_PROFILE_FIELDS,
            transaction,
            lock,
          });
    if (
      !record ||
      (role === "department_head" &&
        (!record.is_department_head || !record.department?.trim()))
    )
      throw new WorkflowError("Actor is no longer authorized", 403);
    return record;
  }
  async function headStudentScope(head, student, transaction) {
    // Students have no department column. The explicit class-advisor relationship
    // supplies the department scope; do not infer it from free-text major names.
    const advisor =
      student.advisor_teacher_id &&
      (await m.Teacher.findByPk(student.advisor_teacher_id, {
        attributes: ["id", "department"],
        transaction,
      }));
    if (!advisor || advisor.department !== head.department)
      throw new WorkflowError("Student is outside this department", 403);
  }
  async function authorizeRequest(role, currentActor, student, transaction) {
    if (role === "teacher" && student.advisor_teacher_id !== currentActor.id)
      throw new WorkflowError(
        "Only the student's selected class advisor may review this request",
        403,
      );
    if (role === "department_head")
      await headStudentScope(currentActor, student, transaction);
  }
  function studentInclude(where) {
    return {
      model: m.Student,
      as: "student",
      attributes: STUDENT_FIELDS,
      required: true,
      ...(where ? { where } : {}),
    };
  }
  async function listRequests(role, actorId, query) {
    const currentActor = await actor(role, actorId);
    const status =
      query.status === undefined ? (role === 'department_staff' ? REQUEST_STATUSES : STAGES[role].from) : query.status;
    if (
      query.status !== undefined &&
      (typeof status !== "string" || !REQUEST_STATUSES.includes(status))
    )
      throw new WorkflowError("Unsupported request status");
    let where;
    if (role === "teacher") where = { advisor_teacher_id: actorId };
    if (role === "department_head") {
      const advisors = await m.Teacher.findAll({
        where: { department: currentActor.department },
        attributes: ["id"],
      });
      where = { advisor_teacher_id: { [Op.in]: advisors.map((t) => t.id) } };
    }
    return m.CoopRequest.findAll({
      where: { status },
      include: [studentInclude(where)],
      order: [
        ["submitted_at", "ASC"],
        ["id", "ASC"],
      ],
      ...page(query),
    });
  }
  async function requestDetail(role, actorId, id) {
    uuid(id);
    const currentActor = await actor(role, actorId);
    const request = await m.CoopRequest.findByPk(id, {
      include: [
        studentInclude(),
        {
          model: m.CoopRequestDeliveryMethod,
          as: "deliveryMethods",
          attributes: ["id", "method"],
        },
        { model: m.Company, as: "company" },
        { model: m.JobPosting, as: "jobPosting" },
        prerequisiteInclude(m),
      ],
    });
    if (!request) throw new WorkflowError("Coop request was not found", 404);
    await authorizeRequest(role, currentActor, request.student);
    const reviews = await m.CoopRequestReview.findAll({
      where: { coop_request_id: id },
      order: [
        ["created_at", "ASC"],
        ["id", "ASC"],
      ],
    });
    return { request, reviews };
  }
  async function reviewRequest(role, actorId, id, decision, body) {
    if (role === 'department_staff' && decision !== 'cancel') throw new WorkflowError('Staff cannot approve or forward Coop Requests', 403);
    uuid(id);
    const reason = decision === 'cancel' ? text(object(body, ['reason']).reason, 'reason', 2000) : decisionPayload(body, decision);
    const stage = role === 'department_staff' ? {from: ['submitted','advisor_review','staff_review','department_head_review'], next: 'cancelled'} : STAGES[role];
    if (!stage || !(role === 'department_staff' ? ['cancel'] : ['approve','reject']).includes(decision))
      throw new WorkflowError("Unsupported review decision");
    return m.sequelize.transaction(async (transaction) => {
      const currentActor = await actor(
        role,
        actorId,
        transaction,
        transaction.LOCK.SHARE,
      );
      // Student first: serializes advisor changes and matches submission locking.
      const reference = await m.CoopRequest.findByPk(id, {
        attributes: ["student_id"],
        transaction,
      });
      if (!reference)
        throw new WorkflowError("Coop request was not found", 404);
      const student = await m.Student.findByPk(reference.student_id, {
        attributes: STUDENT_FIELDS,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!student) throw new WorkflowError("Student was not found", 404);
      await authorizeRequest(role, currentActor, student, transaction);
      const request = await m.CoopRequest.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!stage.from.includes(request.status))
        throw new WorkflowError(
          "Request is no longer awaiting this review stage",
          409,
        );
      const fromStatus = request.status;
      const toStatus = decision === "reject" ? 'rejected' : stage.next;
      await request.update({ status: toStatus, ...(decision === 'cancel' ? {cancelled_at: new Date()} : {}) }, { transaction });
      const review = await m.CoopRequestReview.create(
        {
          coop_request_id: id,
          actor_role: role,
          teacher_id: role === "department_staff" ? null : actorId,
          department_staff_id: role === "department_staff" ? actorId : null,
          from_status: fromStatus,
          to_status: toStatus,
          decision,
          reason,
        },
        { transaction },
      );
      return { request, review };
    });
  }
  async function listJobs(staffId, query) {
    await actor("department_staff", staffId);
    const status = query.status ?? "pending_review";
    if (!JOB_STATUSES.includes(status))
      throw new WorkflowError("Unsupported job status");
    return m.JobPosting.findAll({
      where: { status },
      include: [
        { model: m.Company, as: "company" },
        { model: m.JobSubmission, as: "submission" },
        { model: m.JobPostingWorkMode, as: "workModes", attributes: ["mode"] },
      ],
      order: [
        ["submitted_at", "ASC"],
        ["id", "ASC"],
      ],
      ...page(query),
    });
  }
  async function jobDetail(staffId, id) {
    uuid(id);
    await actor("department_staff", staffId);
    const job = await m.JobPosting.findByPk(id, {
      include: [
        { model: m.Company, as: "company" },
        { model: m.JobSubmission, as: "submission" },
        { model: m.JobPostingWorkMode, as: "workModes", attributes: ["mode"] },
      ],
    });
    if (!job) throw new WorkflowError("Job posting was not found", 404);
    const jobs = await m.JobPosting.findAll({
      where: { submission_id: job.submission_id },
      include: [
        { model: m.JobPostingWorkMode, as: "workModes", attributes: ["mode"] },
      ],
      order: [["id", "ASC"]],
    });
    const reviews = await m.JobPostingReview.findAll({
      where: { job_posting_id: id },
      order: [["created_at", "ASC"]],
    });
    return { job, jobs, reviews };
  }
  async function reviewJob(staffId, id, decision, body) {
    uuid(id);
    const reason = decisionPayload(body, decision);
    if (!["approve", "reject"].includes(decision))
      throw new WorkflowError("Unsupported review decision");
    return m.sequelize.transaction(async (transaction) => {
      await actor(
        "department_staff",
        staffId,
        transaction,
        transaction.LOCK.SHARE,
      );
      const job = await m.JobPosting.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!job) throw new WorkflowError("Job posting was not found", 404);
      if (
        job.status !== "pending_review" ||
        (job.expires_at && job.expires_at <= new Date())
      )
        throw new WorkflowError("Job is no longer eligible for review", 409);
      const submission = await m.JobSubmission.findByPk(job.submission_id, {
        transaction,
      });
      if (!submission || submission.verification_status !== "verified")
        throw new WorkflowError(
          "Submission email must be verified before review",
          409,
        );
      const now = new Date();
      const status = decision === "approve" ? "published" : "rejected";
      await job.update(
        {
          status,
          reviewed_at: now,
          published_at: decision === "approve" ? now : null,
          rejection_reason: decision === "reject" ? reason : null,
        },
        { transaction },
      );
      const review = await m.JobPostingReview.create(
        {
          job_posting_id: id,
          department_staff_id: staffId,
          from_status: "pending_review",
          to_status: status,
          decision,
          reason,
        },
        { transaction },
      );
      return { job, review };
    });
  }
  async function listTeachers(headId, query) {
    const head = await actor("department_head", headId);
    const where = { department: head.department };
    if (
      query.department !== undefined &&
      text(query.department, "department") !== head.department
    )
      throw new WorkflowError("Department is outside your scope", 403);
    if (query.major !== undefined) where.major = text(query.major, "major");
    if (query.status !== undefined) {
      if (!["active", "inactive"].includes(query.status))
        throw new WorkflowError("Unsupported teacher status");
      where.status = query.status;
    }
    if (query.q !== undefined) {
      const q = text(query.q, "q", 100).replace(/[\\%_]/g, "\\$&");
      where[Op.or] = ["first_name", "last_name", "email"].map((key) => ({
        [key]: { [Op.iLike]: `%${q}%` },
      }));
    }
    return m.Teacher.findAll({
      where,
      attributes: TEACHER_PROFILE_FIELDS,
      order: [
        ["first_name", "ASC"],
        ["id", "ASC"],
      ],
      ...page(query),
    });
  }
  async function updateTeacher(headId, teacherId, body, own = false) {
    uuid(teacherId);
    const values = teacherUpdate(body, own);
    return m.sequelize.transaction(async (transaction) => {
      const head = await actor(
        "department_head",
        headId,
        transaction,
        transaction.LOCK.UPDATE,
      );
      const teacher =
        teacherId === headId
          ? head
          : await m.Teacher.findByPk(teacherId, {
              transaction,
              lock: transaction.LOCK.UPDATE,
            });
      if (!teacher) throw new WorkflowError("Teacher was not found", 404);
      if (
        teacher.department !== head.department ||
        (values.department && values.department !== head.department)
      )
        throw new WorkflowError("Teacher is outside this department", 403);
      // Model virtual password runs the existing bcrypt hashing hook.
      await teacher.update(values, {
        transaction,
        fields: [
          ...Object.keys(values),
          ...(values.password ? ["password_hash"] : []),
        ],
      });
      return toSafeTeacherProfile(teacher);
    });
  }
  async function assignProjectAdvisor(headId, studentId, body) {
    // Retain a clear response for old clients; direct assignment would bypass
    // the Student request and the selected Teacher's explicit confirmation.
    throw new WorkflowError("Project advisors require a Student request and Teacher acceptance", 409);
  }
  async function profile(role, id) {
    const currentActor = await actor(role, id);
    return role === "department_staff"
      ? toSafeDepartmentStaffProfile(currentActor)
      : toSafeTeacherProfile(currentActor);
  }
  return {
    profile,
    listRequests,
    requestDetail,
    reviewRequest,
    listJobs,
    jobDetail,
    reviewJob,
    listTeachers,
    updateTeacher,
    assignProjectAdvisor,
  };
}
module.exports = { createRoleWorkflowService, STAGES };
