const crypto = require('node:crypto');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { uuid, object, page, WorkflowError } = require('../validators/roleWorkflow.validator');
const { TEMPLATE_VERSION, TITLES, renderDevelopmentLetter } = require('./coopDocumentTemplate');
const { responseValues, placementEligibility } = require('./companyResponseRules');
const ELIGIBLE = ['approved', 'document_issued', 'in_progress'];
const STUDENT_FIELDS = ['id', 'student_id', 'first_name', 'last_name', 'major', 'email', 'advisor_teacher_id', 'coop_advisor_teacher_id'];
const DOC_FIELDS = ['id', 'coop_request_id', 'document_type', 'status', 'version', 'document_number', 'metadata', 'snapshot', 'template_version', 'content_sha256', 'generated_at', 'created_by', 'updated_by', 'createdAt', 'updatedAt'];
const EDITABLE = ['document_number', 'issue_date', 'signatory_name', 'signatory_position', 'notes'];
function fail(status, message, extra = {}) { throw Object.assign(new WorkflowError(message, status), extra); }
function type(value) { if (!Object.hasOwn(TITLES, value)) fail(400, 'ประเภทเอกสารไม่ถูกต้อง'); return value; }
function date(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
function metadata(body, updating = false) {
  object(body, updating ? ['version', ...EDITABLE] : EDITABLE, { empty: !updating });
  if (updating && (!Number.isInteger(body.version) || body.version < 1)) fail(400, 'กรุณาระบุ version ของเอกสาร');
  const result = {};
  for (const field of EDITABLE) if (Object.hasOwn(body, field)) {
    const value = body[field];
    if (field === 'issue_date') { if (!date(value)) fail(400, 'วันที่หนังสือไม่ถูกต้อง'); result[field] = value; }
    else {
      if (value !== null && typeof value !== 'string') fail(400, `ข้อมูล ${field} ไม่ถูกต้อง`);
      const text = value?.trim() || null, max = field === 'notes' ? 2000 : field === 'document_number' ? 80 : 255;
      if (text && (text.length > max || /[\u0000-\u001f\u007f]/.test(text.replace(/[\n\r\t]/g, '')))) fail(400, `ข้อมูล ${field} ยาวเกินกำหนดหรือมีอักขระที่ไม่รองรับ`);
      result[field] = text;
    }
  }
  return result;
}
function missing(snapshot) {
  const result = [];
  for (const field of ['first_name', 'last_name', 'student_id', 'major']) if (!snapshot.student?.[field]?.trim()) result.push(`student.${field}`);
  for (const field of ['company_name', 'company_address', 'company_province', 'letter_recipient_name']) if (!snapshot.request?.[field]?.trim()) result.push(`request.${field}`);
  for (const field of ['work_start_date', 'work_end_date']) if (!date(snapshot.request?.[field])) result.push(`request.${field}`);
  if (snapshot.request?.work_end_date < snapshot.request?.work_start_date) result.push('request.work_period');
  if (!snapshot.approval?.class?.teacher_id) result.push('approval.class');
  if (!snapshot.approval?.head?.teacher_id) result.push('approval.head');
  return result;
}
function requireComplete(snapshot) {
  const fields = missing(snapshot);
  if (fields.length) fail(400, 'ไม่สามารถสร้างเอกสารได้ เนื่องจากข้อมูลยังไม่ครบ', { code: 'DOCUMENT_MISSING_DATA', missing_fields: fields });
}
const publicDocument = row => Object.fromEntries(DOC_FIELDS.map(key => [key, row.get ? row.get(key) : row[key]]));
function createStaffDocumentsService(m, { render = renderDevelopmentLetter } = {}) {
  async function responseSchemaReady(transaction) {
    const [[schema]] = await m.sequelize.query("SELECT to_regclass('company_responses') IS NOT NULL AND to_regclass('company_response_history') IS NOT NULL AS ready", { transaction });
    return schema.ready === true;
  }
  const schemaBlocker = { available: false, code: 'COMPANY_RESPONSE_SCHEMA_REQUIRED', message: 'ระบบยังไม่พร้อมบันทึกผลตอบกลับ ต้องตรวจสอบและติดตั้ง migration 017 โดยผู้ดูแลก่อน' };
  async function requireResponseSchema(transaction) { if (!await responseSchemaReady(transaction)) fail(409, schemaBlocker.message, { code: schemaBlocker.code }); }
  async function actor(id, transaction) {
    uuid(id, 'staff id');
    const record = await m.DepartmentStaff.findOne({ where: { id, is_active: true }, attributes: ['id'], transaction, ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
    if (!record) fail(403, 'Department staff authorization is required');
  }
  async function lockedRequest(id, transaction) {
    uuid(id, 'request id');
    const reference = await m.CoopRequest.findByPk(id, { attributes: ['student_id'], transaction });
    if (!reference) fail(404, 'ไม่พบคำร้อง');
    const student = await m.Student.findByPk(reference.student_id, { attributes: STUDENT_FIELDS, transaction, lock: transaction.LOCK.UPDATE });
    const request = await m.CoopRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!student || !request) fail(404, 'ไม่พบคำร้อง');
    if (!ELIGIBLE.includes(request.status)) fail(409, 'จัดการเอกสารได้เฉพาะคำร้องที่ผ่านการอนุมัติแล้ว', { code: 'REQUEST_NOT_APPROVED' });
    return { student, request };
  }
  const reviewInclude = [{ model: m.Teacher, as: 'teacher', attributes: ['id', 'academic_title', 'first_name', 'last_name'] }];
  async function reviews(id, transaction) {
    return m.CoopRequestReview.findAll({ where: { coop_request_id: id }, attributes: ['id', 'actor_role', 'teacher_id', 'from_status', 'to_status', 'decision', 'reason', 'createdAt'], include: reviewInclude, order: [['created_at', 'ASC'], ['id', 'ASC']], transaction });
  }
  function snapshot(request, student, history) {
    const approval = (role, from, to) => {
      const row = history.find(review => review.actor_role === role && review.decision === 'approve' && review.from_status === from && review.to_status === to);
      return row ? { teacher_id: row.teacher_id, name: row.teacher ? `${row.teacher.academic_title || ''}${row.teacher.first_name} ${row.teacher.last_name}`.trim() : null, approved_at: row.createdAt } : null;
    };
    return {
      student: Object.fromEntries(STUDENT_FIELDS.filter(key => key !== 'email').map(key => [key, student[key]])),
      request: Object.fromEntries(['id', 'student_id', 'company_id', 'job_posting_id', 'company_name', 'company_address', 'company_province', 'letter_recipient_name', 'letter_recipient_position_department', 'work_start_date', 'work_end_date'].map(key => [key, request[key]])),
      approval: { class: approval('teacher', 'advisor_review', 'department_head_review'), head: approval('department_head', 'department_head_review', 'approved') },
    };
  }
  async function list(staffId, query = {}) {
    await actor(staffId);
    const hasResponseSchema = await responseSchemaReady();
    object(query, ['status', 'search', 'document_status', 'offset', 'limit'], { empty: true });
    const { limit, offset } = page(query);
    if (query.status && !ELIGIBLE.includes(query.status)) fail(400, 'สถานะคำร้องไม่ถูกต้อง');
    if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 100)) fail(400, 'คำค้นยาวเกินกำหนด');
    const where = { status: query.status || { [Op.in]: ELIGIBLE } };
    if (query.search?.trim()) {
      const pattern = `%${query.search.trim().replace(/[\\%_]/g, '\\$&')}%`;
      where[Op.or] = ['company_name', '$student.student_id$', '$student.first_name$', '$student.last_name$'].map(key => ({ [key]: { [Op.iLike]: pattern } }));
      where[Op.or].push(sqlWhere(fn('concat', col('student.first_name'), ' ', col('student.last_name')), { [Op.iLike]: pattern }));
    }
    if (query.document_status && query.document_status !== 'all') {
      if (!['missing', 'draft', 'generated'].includes(query.document_status)) fail(400, 'สถานะเอกสารไม่ถูกต้อง');
      // Validated enum only, static identifiers: filter the cooperation letter.
      where[Op.and] = [m.sequelize.literal(query.document_status === 'missing'
        ? `NOT EXISTS (SELECT 1 FROM coop_documents d WHERE d.coop_request_id = "CoopRequest".id AND d.document_type = 'cooperation')`
        : `EXISTS (SELECT 1 FROM coop_documents d WHERE d.coop_request_id = "CoopRequest".id AND d.document_type = 'cooperation' AND d.status = '${query.document_status}')`)];
    }
    return m.CoopRequest.findAll({ where, attributes: ['id', 'company_name', 'status', 'submitted_at', 'updatedAt'],
      include: [{ model: m.Student, as: 'student', attributes: STUDENT_FIELDS.filter(key => key !== 'email'), required: true }, { model: m.CoopDocument, as: 'documents', attributes: ['id', 'document_type', 'status', 'version', 'updatedAt'], separate: true }, ...(hasResponseSchema ? [{ model: m.CompanyResponse, as: 'companyResponse', attributes: ['status', 'responded_at', 'version', 'updatedAt'] }] : [])],
      order: [['submitted_at', 'DESC'], ['id', 'ASC']], limit, offset, subQuery: false });
  }
  async function detail(staffId, id) {
    uuid(id, 'request id'); await actor(staffId);
    const request = await m.CoopRequest.findByPk(id, { include: [{ model: m.Student, as: 'student', attributes: STUDENT_FIELDS }, { model: m.CoopRequestDeliveryMethod, as: 'deliveryMethods', attributes: ['method'] }, { model: m.JobPosting, as: 'jobPosting', attributes: ['id', 'title', 'description'] }] });
    if (!request) fail(404, 'ไม่พบคำร้อง');
    const history = await reviews(id);
    const documents = await m.CoopDocument.findAll({ where: { coop_request_id: id }, attributes: DOC_FIELDS, order: [['document_type', 'ASC']] });
    const revisions = await m.CoopDocumentRevision.findAll({ where: { coop_document_id: { [Op.in]: documents.map(doc => doc.id) } }, attributes: ['id', 'coop_document_id', 'version', 'action', 'status', 'department_staff_id', 'document_number', 'content_sha256', 'createdAt'], include: [{ model: m.DepartmentStaff, as: 'staff', attributes: ['id', 'first_name', 'last_name'] }], order: [['created_at', 'ASC'], ['version', 'ASC']] });
    const savedCooperation = documents.find(doc => doc.document_type === 'cooperation');
    const hasResponseSchema = await responseSchemaReady();
    const company = hasResponseSchema ? await responseRead(id) : { response: null, history: [] };
    const placement = hasResponseSchema ? placementEligibility(request, savedCooperation, company.response) : { ...schemaBlocker };
    const fields = missing(savedCooperation?.snapshot || snapshot(request, request.student, history));
    const savedPlacement = documents.find(doc => doc.document_type === 'placement');
    const placementFields = savedPlacement ? missing(savedPlacement.snapshot) : [...new Set([...fields, ...missing(snapshot(request, request.student, history))])];
    if (placement.available && placementFields.length) Object.assign(placement, { available: false, code: 'DOCUMENT_MISSING_DATA', message: 'ข้อมูลเอกสารยังไม่ครบ', missing_fields: placementFields });
    return { request, reviews: history, documents, revisions, missing_fields: fields, eligible: ELIGIBLE.includes(request.status), company_response: company.response, company_response_history: company.history, company_response_ready: hasResponseSchema, company_response_editable: hasResponseSchema && ELIGIBLE.includes(request.status) && savedCooperation?.status === 'generated' && !documents.some(doc => doc.document_type === 'placement'), placement, template: { version: TEMPLATE_VERSION, official: false, format: 'html' } };
  }
  const RESPONSE_FIELDS = ['id', 'coop_request_id', 'status', 'responded_at', 'note', 'version', 'department_staff_id', 'cooperation_document_id', 'cooperation_version', 'createdAt', 'updatedAt'];
  const staffInclude = [{ model: m.DepartmentStaff, as: 'staff', attributes: ['id', 'first_name', 'last_name'] }];
  async function responseRead(id) {
    const response = await m.CompanyResponse.findOne({ where: { coop_request_id: id }, attributes: RESPONSE_FIELDS, include: staffInclude });
    const history = response ? await m.CompanyResponseHistory.findAll({ where: { company_response_id: response.id }, attributes: ['id', 'company_response_id', 'status', 'responded_at', 'note', 'version', 'department_staff_id', 'cooperation_document_id', 'cooperation_version', 'action', 'correction_reason', 'createdAt'], include: staffInclude, order: [['version', 'ASC']] }) : [];
    return { response, history };
  }
  async function getCompanyResponse(staffId, id) {
    uuid(id, 'request id'); await actor(staffId);
    await requireResponseSchema();
    if (!await m.CoopRequest.findByPk(id, { attributes: ['id'] })) fail(404, 'ไม่พบคำร้อง');
    return responseRead(id);
  }
  async function recordCompanyResponse(staffId, id, body, correcting = false) {
    const values = responseValues(body, correcting);
    return m.sequelize.transaction(async transaction => {
      await actor(staffId, transaction);
      const { request, student } = await lockedRequest(id, transaction);
      await requireResponseSchema(transaction);
      // Student -> request serializes response changes and both document types.
      const cooperation = await m.CoopDocument.findOne({ where: { coop_request_id: id, document_type: 'cooperation' }, transaction, lock: transaction.LOCK.UPDATE });
      const prerequisite = placementEligibility(request, cooperation, { status: 'accepted' });
      if (!prerequisite.available) fail(409, prerequisite.message, { code: prerequisite.code });
      requireComplete(snapshot(request, student, await reviews(id, transaction)));
      requireComplete(cooperation.snapshot);
      let response = await m.CompanyResponse.findOne({ where: { coop_request_id: id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!correcting && response) fail(409, 'มีผลตอบกลับแล้ว กรุณาใช้การแก้ไขพร้อมระบุเหตุผล', { code: 'COMPANY_RESPONSE_EXISTS' });
      if (correcting && !response) fail(404, 'ยังไม่มีผลตอบกลับให้แก้ไข', { code: 'COMPANY_RESPONSE_NOT_FOUND' });
      if (correcting && response.version !== body.version) fail(409, 'ผลตอบกลับเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด', { code: 'COMPANY_RESPONSE_VERSION_CONFLICT' });
      if (await m.CoopDocument.findOne({ where: { coop_request_id: id, document_type: 'placement' }, transaction }))
        fail(409, 'มีหนังสือส่งตัวแล้ว จึงแก้ไขผลตอบกลับไม่ได้ ต้องดำเนินการยกเลิกเอกสารผ่านกระบวนการที่กำหนดก่อน', { code: 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT' });
      const { correction_reason, ...data } = values;
      if (correcting && response.status === data.status && new Date(response.responded_at).getTime() === data.responded_at.getTime() && response.note === data.note)
        fail(409, 'ข้อมูลผลตอบกลับเหมือนฉบับที่บันทึกแล้ว', { code: 'COMPANY_RESPONSE_UNCHANGED' });
      const saved = { ...data, department_staff_id: staffId, cooperation_document_id: cooperation.id, cooperation_version: cooperation.version, version: response ? response.version + 1 : 1 };
      if (response) await response.update(saved, { transaction });
      else response = await m.CompanyResponse.create({ coop_request_id: id, ...saved }, { transaction });
      await m.CompanyResponseHistory.create({ company_response_id: response.id, ...saved, action: correcting ? 'correct' : 'create', correction_reason: correction_reason || null }, { transaction });
      return Object.fromEntries(RESPONSE_FIELDS.map(key => [key, response[key]]));
    });
  }
  async function audit(document, staffId, action, transaction) {
    await m.CoopDocumentRevision.create({ coop_document_id: document.id, version: document.version, action, status: document.status, department_staff_id: staffId,
      document_number: document.document_number, metadata: document.metadata, snapshot: document.snapshot, template_version: document.template_version, rendered_html: document.rendered_html, content_sha256: document.content_sha256 }, { transaction });
  }
  async function mutate(staffId, id, documentType, action, body) {
    type(documentType);
    let values;
    if (action === 'generate') { object(body, ['version']); if (!Number.isInteger(body.version) || body.version < 1) fail(400, 'กรุณาระบุ version ของเอกสาร'); }
    else values = metadata(body, action === 'edit');
    return m.sequelize.transaction(async transaction => {
      await actor(staffId, transaction);
      const { request, student } = await lockedRequest(id, transaction);
      let cooperation, response;
      if (documentType === 'placement') {
        await requireResponseSchema(transaction);
        cooperation = await m.CoopDocument.findOne({ where: { coop_request_id: id, document_type: 'cooperation' }, transaction, lock: transaction.LOCK.UPDATE });
        response = await m.CompanyResponse.findOne({ where: { coop_request_id: id }, transaction, lock: transaction.LOCK.UPDATE });
        const eligibility = placementEligibility(request, cooperation, response);
        if (!eligibility.available) fail(409, eligibility.message, { code: eligibility.code });
      }
      let document = await m.CoopDocument.findOne({ where: { coop_request_id: id, document_type: documentType }, transaction, lock: transaction.LOCK.UPDATE });
      if (action === 'create') {
        if (document) fail(409, 'มีเอกสารชนิดนี้แล้ว กรุณาเปิดฉบับที่บันทึกไว้');
        const savedSnapshot = documentType === 'placement' ? JSON.parse(JSON.stringify(cooperation.snapshot)) : snapshot(request, student, await reviews(id, transaction)); requireComplete(savedSnapshot);
        if (documentType === 'placement') {
          requireComplete(snapshot(request, student, await reviews(id, transaction)));
          savedSnapshot.company_response = { id: response.id, version: response.version, status: response.status, responded_at: response.responded_at, note: response.note, department_staff_id: response.department_staff_id };
          savedSnapshot.cooperation_document = { id: cooperation.id, version: cooperation.version, content_sha256: cooperation.content_sha256 };
        }
        const { document_number = null, ...meta } = values;
        document = await m.CoopDocument.create({ coop_request_id: id, document_type: documentType, status: 'draft', version: 1,
          document_number, metadata: { issue_date: new Date().toISOString().slice(0, 10), ...meta }, snapshot: savedSnapshot, template_version: TEMPLATE_VERSION, created_by: staffId, updated_by: staffId }, { transaction });
      } else {
        if (!document) fail(404, 'ไม่พบเอกสาร');
        if (document.version !== body.version) fail(409, 'เอกสารมีการเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด');
        if (action === 'edit') {
          const { document_number, ...meta } = values;
          const next = { ...document.metadata, ...meta };
          if (JSON.stringify(next) === JSON.stringify(document.metadata) && (document_number === undefined || document_number === document.document_number)) return publicDocument(document);
          await document.update({ ...(document_number !== undefined ? { document_number } : {}), metadata: next, status: 'draft', rendered_html: null, content_sha256: null, generated_at: null, version: document.version + 1, updated_by: staffId }, { transaction });
        } else {
          requireComplete(document.snapshot);
          if (documentType === 'placement' && (document.snapshot.company_response?.id !== response.id || document.snapshot.company_response?.version !== response.version || document.snapshot.company_response?.status !== 'accepted'))
            fail(409, 'หลักฐานตอบรับในร่างหนังสือส่งตัวไม่ตรงกับข้อมูลที่บันทึก', { code: 'PLACEMENT_ACCEPTANCE_MISMATCH' });
          if (!date(document.metadata.issue_date)) fail(400, 'วันที่หนังสือไม่ถูกต้อง');
          const version = document.version + 1;
          const rendered = render({ ...publicDocument(document), version });
          if (typeof rendered !== 'string' || !rendered.trim() || Buffer.byteLength(rendered) > 250000) fail(500, 'สร้างฉบับตัวอย่างไม่สำเร็จ');
          const wasGenerated = document.status === 'generated';
          await document.update({ version, status: 'generated', rendered_html: rendered, content_sha256: crypto.createHash('sha256').update(rendered).digest('hex'), generated_at: new Date(), updated_by: staffId }, { transaction });
          action = wasGenerated ? 'regenerate' : 'generate';
        }
      }
      await audit(document, staffId, action, transaction);
      return publicDocument(document);
    });
  }
  async function content(staffId, id, documentType, query = {}) {
    uuid(id, 'request id'); type(documentType); object(query, ['version'], { empty: true }); await actor(staffId);
    const document = await m.CoopDocument.findOne({ where: { coop_request_id: id, document_type: documentType } });
    if (!document) fail(404, 'ไม่พบเอกสาร');
    let current = document;
    if (query.version !== undefined) {
      if (typeof query.version !== 'string') fail(400, 'version ไม่ถูกต้อง');
      const version = Number(query.version);
      if (!Number.isInteger(version) || version < 1) fail(400, 'version ไม่ถูกต้อง');
      current = await m.CoopDocumentRevision.findOne({ where: { coop_document_id: document.id, version } });
      if (!current) fail(404, 'ไม่พบฉบับเอกสาร');
    }
    if (current.status !== 'generated' || !current.rendered_html) fail(409, 'กรุณาสร้างฉบับตัวอย่างจากข้อมูลที่บันทึกไว้ก่อน');
    if (crypto.createHash('sha256').update(current.rendered_html).digest('hex') !== current.content_sha256) fail(500, 'ตรวจสอบเนื้อหาเอกสารไม่สำเร็จ');
    return { html: current.rendered_html, filename: `${documentType}-${document.id}-v${current.version}.html` };
  }
  return { list, detail, mutate, content, getCompanyResponse, recordCompanyResponse };
}
module.exports = { createStaffDocumentsService, ELIGIBLE, missing };
