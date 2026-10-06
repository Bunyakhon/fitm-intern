const {
  CoopRequest,
  CoopRequestDeliveryMethod,
  CoopRequestPrerequisiteCourse,
  CoopRequestReview,
  Student,
  StudentProfile,
  Teacher,
  Company,
  JobPosting,
  sequelize,
} = require("../models");
const {normalizePrerequisites, prerequisiteInclude} = require('../services/coopPrerequisites');
const PREREQUISITE_INCLUDE = prerequisiteInclude(require('../models'));
const REVIEW_INCLUDE = {model: CoopRequestReview, as: 'reviews', attributes: ['actor_role','student_id','teacher_id','department_staff_id','decision','from_status','to_status','reason','created_at'], separate: true, order: [['created_at','ASC'],['id','ASC']]};
const { Op } = require("sequelize");

const ACTIVE_STATUSES = new Set([
  "submitted",
  "staff_review",
  "advisor_review",
  "department_head_review",
  "approved",
  "document_issued",
  "in_progress",
]);

const CANCELLABLE_STATUSES = new Set([
  "submitted",
  "staff_review",
  "advisor_review",
  "department_head_review",
]);

const DELIVERY_METHODS = new Set(["self_submit", "postal", "email"]);

const INPUT_FIELDS = new Set([
  "company_name",
  "company_province",
  "letter_recipient_name",
  "letter_recipient_position_department",
  "company_address",
  "work_start_date",
  "work_end_date",
  "delivery_methods",
  "company_id",
  "job_posting_id",
  "prerequisite_courses",
]);

const DELIVERY_METHOD_INCLUDE = {
  model: CoopRequestDeliveryMethod,
  as: "deliveryMethods",
  attributes: ["id", "method"],
};

const STUDENT_INCLUDE = {
  model: Student,
  as: "student",
  attributes: [
    "first_name",
    "last_name",
    "student_id",
    "year_level",
    "gpa",
    "email",
    "advisor_teacher_id",
  ],
  include: [
    {
      model: StudentProfile,
      as: "profile",
      attributes: ["prefix", "current_phone"],
      required: false,
    },
    {
      model: Teacher,
      as: "advisorTeacher",
      attributes: ["id", "academic_title", "first_name", "last_name"],
      required: false,
    },
  ],
};

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeRequiredText(value, field, maxLength) {
  if (typeof value !== "string") {
    throw validationError(`${field} ต้องเป็นข้อความ`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw validationError(`กรุณากรอก${field}`);
  }
  if (Number.isFinite(maxLength) && normalized.length > maxLength) {
    throw validationError(`${field} ต้องมีความยาวไม่เกิน ${maxLength} ตัวอักษร`);
  }

  return normalized;
}

function normalizeOptionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw validationError(`${field} ต้องเป็นข้อความ`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw validationError(`${field} ต้องมีความยาวไม่เกิน ${maxLength} ตัวอักษร`);
  }

  return normalized || null;
}

function normalizeOptionalUuid(value, field) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw validationError(`${field} must be a valid identifier`);
  }
  return value;
}

function normalizeDate(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${field} ต้องอยู่ในรูปแบบ YYYY-MM-DD`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw validationError(`${field} ไม่ใช่วันที่ที่ถูกต้อง`);
  }

  return value;
}

function normalizeDeliveryMethods(value) {
  if (!Array.isArray(value)) {
    throw validationError("delivery_methods ต้องเป็นรายการวิธีจัดส่ง");
  }
  if (value.length < 1 || value.length > 3) {
    throw validationError("กรุณาเลือกวิธีจัดส่งหนังสืออย่างน้อย 1 และไม่เกิน 3 วิธี");
  }
  if (new Set(value).size !== value.length) {
    throw validationError("วิธีจัดส่งหนังสือห้ามซ้ำกัน");
  }
  if (value.some((method) => typeof method !== "string" || !DELIVERY_METHODS.has(method))) {
    throw validationError("พบวิธีจัดส่งหนังสือที่ไม่รองรับ");
  }

  return value;
}

function normalizeRequestPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("ข้อมูลที่ส่งมาต้องเป็น JSON object");
  }

  const unsupportedFields = Object.keys(body).filter((field) => !INPUT_FIELDS.has(field));
  if (unsupportedFields.length) {
    throw validationError(`ไม่อนุญาตให้ส่งข้อมูล: ${unsupportedFields.join(", ")}`);
  }

  const workStartDate = normalizeDate(body.work_start_date, "วันเริ่มปฏิบัติงาน");
  const workEndDate = normalizeDate(body.work_end_date, "วันสิ้นสุดปฏิบัติงาน");
  if (workEndDate < workStartDate) {
    throw validationError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มปฏิบัติงาน");
  }

  return {
    company_id: normalizeOptionalUuid(body.company_id, "company_id"),
    job_posting_id: normalizeOptionalUuid(body.job_posting_id, "job_posting_id"),
    company_name: normalizeRequiredText(body.company_name, "ชื่อบริษัท / หน่วยงาน", 255),
    company_province: normalizeRequiredText(body.company_province, "จังหวัด", 100),
    letter_recipient_name: normalizeRequiredText(body.letter_recipient_name, "เรียนถึง", 255),
    letter_recipient_position_department: normalizeOptionalText(
      body.letter_recipient_position_department,
      "ตำแหน่ง / หน่วยงานผู้รับหนังสือ",
      255,
    ),
    company_address: normalizeRequiredText(body.company_address, "ที่อยู่"),
    work_start_date: workStartDate,
    work_end_date: workEndDate,
    delivery_methods: normalizeDeliveryMethods(body.delivery_methods),
  };
}

function toErrorResponse(error, res, fallbackMessage) {
  if (error.status === 400) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: error.errors?.[0]?.message || "ข้อมูลคำร้องไม่ถูกต้อง",
    });
  }
  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "ข้อมูลวิธีจัดส่งซ้ำกัน",
    });
  }

  console.error("COOP REQUEST ERROR:", error);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

async function findOwnedRequest(id, studentId, options = {}) {
  return CoopRequest.findOne({
    where: { id, student_id: studentId },
    ...options,
  });
}

exports.getMyCoopRequests = async (req, res) => {
  try {
    const requests = await CoopRequest.findAll({
      where: { student_id: req.user.id },
      include: [DELIVERY_METHOD_INCLUDE],
      order: [["submitted_at", "DESC"], ["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "ดึงรายการคำร้องสหกิจศึกษาสำเร็จ",
      data: requests,
    });
  } catch (error) {
    return toErrorResponse(error, res, "เกิดข้อผิดพลาดในการดึงรายการคำร้องสหกิจศึกษา");
  }
};

exports.getCoopRequestById = async (req, res) => {
  try {
    const request = await findOwnedRequest(req.params.id, req.user.id, {
      include: [DELIVERY_METHOD_INCLUDE, STUDENT_INCLUDE, PREREQUISITE_INCLUDE, REVIEW_INCLUDE],
    });

    if (!request) {
      return res.status(404).json({ success: false, message: "ไม่พบคำร้องสหกิจศึกษา" });
    }

    return res.status(200).json({
      success: true,
      message: "ดึงรายละเอียดคำร้องสหกิจศึกษาสำเร็จ",
      data: request,
    });
  } catch (error) {
    return toErrorResponse(error, res, "เกิดข้อผิดพลาดในการดึงรายละเอียดคำร้องสหกิจศึกษา");
  }
};

exports.createCoopRequest = async (req, res) => {
  let transaction;

  try {
    const payload = normalizeRequestPayload(req.body);
    transaction = await sequelize.transaction();

    let company = null;
    if (payload.company_id) {
      company = await Company.findByPk(payload.company_id, { transaction });
      if (!company) { await transaction.rollback(); transaction = null; return res.status(404).json({ success: false, message: "Company was not found" }); }
      payload.company_name = company.name;
      payload.company_province = company.province;
      payload.company_address = [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ");
    }
    if (payload.job_posting_id) {
      const jobPosting = await JobPosting.findByPk(payload.job_posting_id, { transaction });
      if (!jobPosting || jobPosting.status !== "published") { await transaction.rollback(); transaction = null; return res.status(400).json({ success: false, message: "Job posting is unavailable" }); }
      if (company && jobPosting.company_id !== company.id) { await transaction.rollback(); transaction = null; return res.status(400).json({ success: false, message: "Job posting does not belong to the selected company" }); }
      if (!company) {
        company = await Company.findByPk(jobPosting.company_id, { transaction });
        if (!company) { await transaction.rollback(); transaction = null; return res.status(400).json({ success: false, message: "Job posting company is unavailable" }); }
        payload.company_id = company.id;
        payload.company_name = company.name;
        payload.company_province = company.province;
        payload.company_address = [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ");
      }
    }

    // Locking the student row serializes submissions from the same owner so that
    // two simultaneous requests cannot both pass the active-request check.
    const student = await Student.findByPk(req.user.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!student) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนักศึกษา" });
    }
    const prerequisiteRows = normalizePrerequisites(student.major, req.body.prerequisite_courses);

    const activeRequest = await CoopRequest.findOne({
      where: {
        student_id: req.user.id,
        status: [...ACTIVE_STATUSES],
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (activeRequest) {
      await transaction.rollback();
      transaction = null;
      return res.status(409).json({
        success: false,
        message: "คุณมีคำร้องสหกิจศึกษาที่ยังดำเนินการอยู่แล้ว",
      });
    }

    const request = await CoopRequest.create(
      {
        ...payload,
        student_id: req.user.id,
        status: "advisor_review",
        submitted_at: new Date(),
      },
      { transaction },
    );

    await CoopRequestPrerequisiteCourse.bulkCreate(prerequisiteRows.map(row => ({...row, coop_request_id: request.id})), {transaction, validate: true});
    await CoopRequestReview.create({coop_request_id: request.id, actor_role: 'student', student_id: req.user.id,
      teacher_id: null, department_staff_id: null, from_status: 'new', to_status: 'advisor_review', decision: 'submit', reason: null}, {transaction});

    await CoopRequestDeliveryMethod.bulkCreate(
      payload.delivery_methods.map((method) => ({
        coop_request_id: request.id,
        method,
      })),
      { transaction },
    );

    await transaction.commit();
    transaction = null;

    const createdRequest = await findOwnedRequest(request.id, req.user.id, {
      include: [DELIVERY_METHOD_INCLUDE, PREREQUISITE_INCLUDE],
    });
    return res.status(201).json({
      success: true,
      message: "ยื่นคำร้องสหกิจศึกษาเรียบร้อยแล้ว",
      data: createdRequest,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return toErrorResponse(error, res, "เกิดข้อผิดพลาดในการยื่นคำร้องสหกิจศึกษา");
  }
};

exports.searchCompanies = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 2) return res.status(200).json({ success: true, data: [] });
  try {
    const companies = await Company.findAll({
      where: { name: { [Op.iLike]: `%${query.replace(/[\\%_]/g, "\\$&")}%` } },
      attributes: ["id", "name", "province", "address_no", "moo", "subdistrict", "district"],
      order: [["name", "ASC"]], limit: 20,
    });
    return res.json({ success: true, data: companies });
  } catch (error) { return toErrorResponse(error, res, "Unable to search companies"); }
};

exports.checkCompanyDuplicate = async (req, res) => {
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!name || name.length > 255) return res.status(400).json({ success: false, message: "Company name is required" });
  try {
    const normalized = name.replace(/\s+/gu, " ").toLocaleLowerCase("th-TH");
    const matches = await Company.findAll({
      where: { normalized_name: normalized },
      attributes: ["id", "name", "province", "address_no", "moo", "subdistrict", "district"],
      limit: 20,
    });
    return res.json({ success: true, data: matches });
  } catch (error) { return toErrorResponse(error, res, "Unable to check company duplicates"); }
};

exports.getPublishedJobPostingForCoopRequest = async (req, res) => {
  try {
    const job = await JobPosting.findOne({ where: { id: req.params.id, status: "published" }, attributes: ["id", "title", "company_id"], include: [{ model: Company, as: "company", attributes: ["id", "name", "province", "address_no", "moo", "subdistrict", "district"] }] });
    if (!job || !job.company) return res.status(404).json({ success: false, message: "Published job posting was not found" });
    return res.json({ success: true, data: job });
  } catch (error) { return toErrorResponse(error, res, "Unable to load job posting"); }
};

exports.cancelCoopRequest = async (req, res) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const request = await findOwnedRequest(req.params.id, req.user.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!request) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ success: false, message: "ไม่พบคำร้องสหกิจศึกษา" });
    }
    if (!CANCELLABLE_STATUSES.has(request.status)) {
      await transaction.rollback();
      transaction = null;
      return res.status(400).json({
        success: false,
        message: "คำร้องนี้ไม่สามารถยกเลิกได้ในสถานะปัจจุบัน",
      });
    }

    const fromStatus = request.status;
    request.status = "cancelled";
    request.cancelled_at = new Date();
    await request.save({ transaction });
    await CoopRequestReview.create({coop_request_id: request.id, actor_role: 'student', student_id: req.user.id,
      teacher_id: null, department_staff_id: null, from_status: fromStatus, to_status: 'cancelled', decision: 'cancel', reason: 'Cancelled by student'}, {transaction});
    await transaction.commit();
    transaction = null;

    const cancelledRequest = await findOwnedRequest(request.id, req.user.id, {
      include: [DELIVERY_METHOD_INCLUDE],
    });
    return res.status(200).json({
      success: true,
      message: "ยกเลิกคำร้องสหกิจศึกษาเรียบร้อยแล้ว",
      data: cancelledRequest,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return toErrorResponse(error, res, "เกิดข้อผิดพลาดในการยกเลิกคำร้องสหกิจศึกษา");
  }
};
