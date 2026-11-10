const { uuid, object } = require("../validators/roleWorkflow.validator");
const { documentUrl } = require("./projectDocumentUrl.rules");
const providers = { "project-book": "overleaf", poster: "drive" };
function fail(status, code, message) { throw Object.assign(new Error(message), { status, code }); }
function category(value) {
  if (!Object.hasOwn(providers, value)) fail(400, "PROJECT_LINK_CATEGORY_INVALID", "ประเภทลิงก์ไม่ถูกต้อง");
  return value;
}
function createStudentProjectLinksService({ Student, CoopProjectLink: Link, sequelize }) {
  async function owner(studentId, transaction) {
    uuid(studentId);
    const student = await Student.findByPk(studentId, { attributes: ["id", "track"], transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!student || student.track !== "co_op") fail(403, "PROJECT_LINK_FORBIDDEN", "สำหรับนักศึกษาสหกิจศึกษาที่เป็นเจ้าของข้อมูลเท่านั้น");
  }
  const dto = (kind, row) => ({ category: kind, document_url: row?.document_url || "", version: row?.version || 0 });
  async function read(studentId, kind) {
    category(kind);
    await owner(studentId);
    return dto(kind, await Link.findOne({ where: { student_id: studentId, category: kind } }));
  }
  async function save(studentId, kind, body, header) {
    category(kind);
    object(body, ["document_url"]);
    if (!Object.hasOwn(body, "document_url")) fail(400, "PROJECT_URL_INVALID", "กรุณาระบุลิงก์ให้ชัดเจน");
    const url = documentUrl(body.document_url, providers[kind]);
    if (header == null) fail(428, "PROJECT_LINK_REVISION_REQUIRED", "กรุณาโหลดลิงก์ล่าสุดก่อนบันทึก");
    let readyToCommit = false;
    try {
      return await sequelize.transaction(async transaction => {
        await owner(studentId, transaction);
        let row = await Link.findOne({ where: { student_id: studentId, category: kind }, transaction, lock: transaction.LOCK.UPDATE });
        const version = row?.version || 0;
        if (header !== `"${version}"` || version >= 2147483647) fail(409, "PROJECT_LINK_CONFLICT", "ลิงก์เปลี่ยนแล้ว ร่างยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก");
        if (!row || row.document_url !== url) {
          if (row) await row.update({ document_url: url, version: version + 1 }, { transaction });
          else if (url) row = await Link.create({ student_id: studentId, category: kind, document_url: url, version: 1 }, { transaction });
        }
        const result = dto(kind, row);
        readyToCommit = true;
        return result;
      });
    } catch (error) {
      if (readyToCommit) fail(503, "PROJECT_LINK_COMMIT_UNCERTAIN", "ยังยืนยันผลบันทึกลิงก์ไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่");
      throw error;
    }
  }
  return { read, save };
}
module.exports = { createStudentProjectLinksService };
