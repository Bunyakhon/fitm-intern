const {
  Student,
  StudentProfile,
  Teacher,
  StudentFile,
  sequelize,
} = require("../models");
const fs = require("fs/promises");
const path = require("path");
const {
  resolveStoragePath,
  toStorageRelativePath,
} = require("../config/storage");

const PROFILE_FIELDS = [
  "prefix", "birth_date", "height_cm", "weight_kg", "nationality",
  "ethnicity", "religion", "blood_type", "medical_conditions", "allergies",
  "special_abilities", "related_skills", "hometown_address", "hometown_phone",
  "current_address", "current_phone", "father_name", "father_age",
  "father_occupation", "mother_name", "mother_age", "mother_occupation",
  "parent_contact_address", "parent_phone", "emergency_contact_name",
  "emergency_contact_relation", "emergency_contact_address", "emergency_contact_phone",
];

const TEXT_FIELDS = new Set([
  "prefix", "nationality", "ethnicity", "religion", "blood_type",
  "medical_conditions", "allergies", "special_abilities", "related_skills",
  "hometown_address", "current_address", "father_name", "father_occupation",
  "mother_name", "mother_occupation", "parent_contact_address",
  "emergency_contact_name", "emergency_contact_relation", "emergency_contact_address",
]);
const PHONE_FIELDS = new Set(["hometown_phone", "current_phone", "parent_phone", "emergency_contact_phone"]);
const POSITIVE_NUMBER_FIELDS = new Set(["height_cm", "weight_kg"]);
const POSITIVE_INTEGER_FIELDS = new Set(["father_age", "mother_age"]);
const PREFIXES = new Set(["นาย", "นางสาว", "นาง"]);
const BLOOD_TYPES = new Set(["A", "B", "AB", "O", "ไม่ทราบ"]);

const validationError = (message) => Object.assign(new Error(message), { status: 400 });

const normalizeOptionalText = (value, field) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw validationError(`${field} ต้องเป็นข้อความหรือค่าว่าง`);
  return value.trim() || null;
};

const normalizeProfileData = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("ข้อมูลที่ส่งมาต้องเป็น JSON object");
  }
  const unsupported = Object.keys(body).filter((field) => !PROFILE_FIELDS.includes(field));
  if (unsupported.length) throw validationError(`ไม่อนุญาตให้แก้ไขข้อมูล: ${unsupported.join(", ")}`);

  const data = {};
  for (const field of PROFILE_FIELDS) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (TEXT_FIELDS.has(field)) {
      data[field] = normalizeOptionalText(value, field);
    } else if (PHONE_FIELDS.has(field)) {
      const phone = normalizeOptionalText(value, field);
      const digitCount = (phone?.match(/\d/g) || []).length;
      if (phone && (!/^[+\d\s()-]+$/.test(phone) || digitCount < 7 || digitCount > 20)) {
        throw validationError(`${field} มีรูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง`);
      }
      data[field] = phone;
    } else if (POSITIVE_NUMBER_FIELDS.has(field)) {
      if (value === null || value === "") data[field] = null;
      else if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw validationError(`${field} ต้องเป็นจำนวนบวก`);
      else data[field] = value;
    } else if (POSITIVE_INTEGER_FIELDS.has(field)) {
      if (value === null || value === "") data[field] = null;
      else if (!Number.isInteger(value) || value <= 0) throw validationError(`${field} ต้องเป็นจำนวนเต็มบวกหรือค่าว่าง`);
      else data[field] = value;
    } else if (field === "birth_date") {
      if (value === null || value === "") data[field] = null;
      else if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw validationError("birth_date ต้องอยู่ในรูปแบบ YYYY-MM-DD");
      else {
        const birthDate = new Date(`${value}T00:00:00Z`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(birthDate.getTime()) || birthDate > today) throw validationError("birth_date ต้องไม่เป็นวันที่ในอนาคต");
        data[field] = value;
      }
    }
  }
  if (data.prefix && !PREFIXES.has(data.prefix)) throw validationError("prefix ต้องเป็น นาย, นางสาว หรือ นาง");
  if (data.blood_type && !BLOOD_TYPES.has(data.blood_type)) throw validationError("blood_type ต้องเป็น A, B, AB, O หรือ ไม่ทราบ");
  return data;
};

// ==============================
// GET ข้อมูลประวัตินักศึกษา
// ของผู้ที่ Login อยู่
// ==============================

const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findByPk(
      studentId,
      {
        attributes: [
          "id",
          "student_id",
          "first_name",
          "last_name",
          "email",
          "major",
          "year_level",
          "gpa",
          "profile_image",
          "track",
          "status",

          // ==============================
          // อาจารย์ที่ปรึกษา
          // ==============================

          "advisor_teacher_id",

          // ==============================
          // อาจารย์ที่ปรึกษาสหกิจศึกษา
          // = อาจารย์นิเทศ
          // ==============================

          "coop_advisor_teacher_id",
        ],

        include: [
          // ==============================
          // ประวัตินักศึกษา
          // ==============================

          {
            model: StudentProfile,
            as: "profile",
          },

          // ==============================
          // อาจารย์ที่ปรึกษา
          // ==============================

          {
            model: Teacher,
            as: "advisorTeacher",

            attributes: [
              "id",
              "academic_title",
              "first_name",
              "last_name",
              "email",
              "department",
              "major",
              "position",
              "status",
            ],

            required: false,
          },

          // ==============================
          // อาจารย์ที่ปรึกษาสหกิจศึกษา
          // และเป็นอาจารย์นิเทศ
          // ==============================

          {
            model: Teacher,
            as: "coopAdvisorTeacher",

            attributes: [
              "id",
              "academic_title",
              "first_name",
              "last_name",
              "email",
              "department",
              "major",
              "position",
              "status",
            ],

            required: false,
          },
        ],
      },
    );

    if (!student) {
      return res.status(404).json({
        message: "ไม่พบข้อมูลนักศึกษา",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "ดึงข้อมูลประวัตินักศึกษาสำเร็จ",

      data: student,
      // Kept temporarily for the existing student dashboard caller.
      student,
    });
  } catch (error) {
    console.error(
      "GET STUDENT PROFILE ERROR:",
      error,
    );

    return res.status(500).json({
      message:
        "เกิดข้อผิดพลาดในการดึงข้อมูลประวัตินักศึกษา",
    });
  }
};

// ==============================
// เพิ่มหรือแก้ไขข้อมูลประวัตินักศึกษา
// ของผู้ที่ Login อยู่
// ==============================

const upsertStudentProfile = async (
  req,
  res,
) => {
  try {
    const studentId = req.user.id;

    const student =
      await Student.findByPk(
        studentId,
      );

    if (!student) {
      return res.status(404).json({
        message:
          "ไม่พบข้อมูลนักศึกษา",
      });
    }

    const allowedFields = [
      "prefix",
      "birth_date",
      "height_cm",
      "weight_kg",
      "nationality",
      "ethnicity",
      "religion",
      "blood_type",
      "medical_conditions",
      "allergies",
      "special_abilities",
      "related_skills",
      "hometown_address",
      "hometown_phone",
      "current_address",
      "current_phone",
      "father_name",
      "father_age",
      "father_occupation",
      "mother_name",
      "mother_age",
      "mother_occupation",
      "parent_contact_address",
      "parent_phone",
      "emergency_contact_name",
      "emergency_contact_relation",
      "emergency_contact_address",
      "emergency_contact_phone",
    ];

    const profileData = {};

    allowedFields.forEach(
      (field) => {
        if (
          req.body[field] !==
          undefined
        ) {
          profileData[field] =
            req.body[field];
        }
      },
    );

    const normalizedProfileData = normalizeProfileData(req.body);
    Object.keys(profileData).forEach((field) => delete profileData[field]);
    Object.assign(profileData, normalizedProfileData);

    let profile =
      await StudentProfile.findOne({
        where: {
          student_id: studentId,
        },
      });

    if (profile) {
      await profile.update(
        profileData,
      );

      return res.status(200).json({
        message:
          "แก้ไขข้อมูลประวัตินักศึกษาสำเร็จ",

        profile,
      });
    }

    profile =
      await StudentProfile.create({
        student_id: studentId,

        ...profileData,
      });

    return res.status(201).json({
      message:
        "บันทึกข้อมูลประวัตินักศึกษาสำเร็จ",

      profile,
    });
  } catch (error) {
    console.error(
      "UPSERT STUDENT PROFILE ERROR:",
      error,
    );

    if (error.status === 400 || error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message:
          error.status === 400 ? error.message : "ข้อมูลไม่ถูกต้อง",

        errors: error.errors?.map((item) => item.message) || [error.message],
      });
    }

    return res.status(500).json({
      message:
        "เกิดข้อผิดพลาดในการบันทึกข้อมูลประวัตินักศึกษา",
    });
  }
};

const updateStudentInfo = async (req, res) => {
  try {
    const allowedFields = [
      "major",
      "year_level",
      "gpa",
      "advisor_teacher_id",
    ];
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ message: "ข้อมูลที่ส่งมาต้องเป็น JSON object" });
    }

    const requestedFields = Object.keys(req.body);
    const unsupportedFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length) {
      return res.status(400).json({
        message: "ไม่อนุญาตให้แก้ไขข้อมูลนี้",
        fields: unsupportedFields,
      });
    }

    const student = await Student.findByPk(req.user.id);

    if (!student) {
      return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });
    }

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (
      updateData.major !== undefined &&
      updateData.major !== null &&
      typeof updateData.major !== "string"
    ) {
      return res.status(400).json({ message: "major ต้องเป็นข้อความหรือ null" });
    }

    if (
      updateData.year_level !== undefined &&
      updateData.year_level !== null &&
      (!Number.isInteger(updateData.year_level) ||
        updateData.year_level < 1 ||
        updateData.year_level > 4)
    ) {
      return res.status(400).json({ message: "year_level ต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 4 หรือ null" });
    }

    if (
      updateData.gpa !== undefined &&
      updateData.gpa !== null &&
      (typeof updateData.gpa !== "number" ||
        !Number.isFinite(updateData.gpa) ||
        updateData.gpa < 0 ||
        updateData.gpa > 4)
    ) {
      return res.status(400).json({ message: "gpa ต้องเป็นตัวเลขระหว่าง 0 ถึง 4 หรือ null" });
    }

    if (updateData.advisor_teacher_id !== undefined) {
      if (updateData.advisor_teacher_id !== null && typeof updateData.advisor_teacher_id !== "string") {
        return res.status(400).json({ message: "advisor_teacher_id ต้องเป็น UUID หรือ null" });
      }

      if (updateData.advisor_teacher_id) {
        const teacher = await Teacher.findOne({
          where: {
            id: updateData.advisor_teacher_id,
            status: "active",
          },
        });

        if (!teacher) {
          return res.status(400).json({
            message: "ไม่พบอาจารย์ที่ปรึกษาที่ active",
          });
        }
      }
    }

    await student.update(updateData);

    return res.status(200).json({
      message: "แก้ไขข้อมูลนักศึกษาสำเร็จ",
      student,
    });
  } catch (error) {
    console.error("UPDATE STUDENT INFO ERROR:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "ข้อมูลไม่ถูกต้อง",
        errors: error.errors.map((item) => item.message),
      });
    }

    return res.status(500).json({ message: "ไม่สามารถแก้ไขข้อมูลนักศึกษาได้" });
  }
};

const removeFileIfPresent = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  try {
    await fs.unlink(resolveStoragePath(storagePath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const uploadProfileImage = async (req, res) => {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      return res.status(400).json({ message: "กรุณาแนบไฟล์ profile_image" });
    }

    const student = await Student.findByPk(req.user.id);

    if (!student) {
      await fs.unlink(uploadedFile.path).catch(() => {});
      return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });
    }

    const newStoragePath = toStorageRelativePath(uploadedFile.path);
    const expectedPrefix = `students/${student.id}/profile/`;

    if (!newStoragePath.startsWith(expectedPrefix)) {
      await fs.unlink(uploadedFile.path).catch(() => {});
      return res.status(400).json({ message: "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง" });
    }

    const previousStoragePath = student.profile_image;

    try {
      await student.update({ profile_image: newStoragePath });
    } catch (error) {
      await fs.unlink(uploadedFile.path).catch(() => {});
      throw error;
    }

    if (
      previousStoragePath &&
      previousStoragePath !== newStoragePath &&
      previousStoragePath.startsWith(expectedPrefix)
    ) {
      try {
        await removeFileIfPresent(previousStoragePath);
      } catch (error) {
        console.error("REMOVE OLD PROFILE IMAGE ERROR:", error);
      }
    }

    return res.status(200).json({
      message: "อัปโหลดรูปโปรไฟล์สำเร็จ",
      profile_image: student.profile_image,
    });
  } catch (error) {
    console.error("UPLOAD PROFILE IMAGE ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้" });
  }
};

const getProfileImage = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id, {
      attributes: ["id", "profile_image"],
    });

    if (!student || !student.profile_image) {
      return res.status(404).json({ message: "ไม่พบรูปโปรไฟล์" });
    }

    const expectedPrefix = `students/${student.id}/profile/`;
    if (!student.profile_image.startsWith(expectedPrefix)) {
      return res.status(404).json({ message: "ไม่พบรูปโปรไฟล์" });
    }

    const imagePath = resolveStoragePath(student.profile_image);
    await fs.access(imagePath);

    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    const contentType = mimeTypes[path.extname(imagePath).toLowerCase()];

    if (!contentType) {
      return res.status(404).json({ message: "ไม่พบรูปโปรไฟล์" });
    }

    res.type(contentType);
    return res.sendFile(imagePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "ไม่พบรูปโปรไฟล์" });
    }

    console.error("GET PROFILE IMAGE ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถอ่านรูปโปรไฟล์ได้" });
  }
};

const uploadResume = async (req, res) => {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      return res.status(400).json({ message: "กรุณาแนบไฟล์ resume" });
    }

    const student = await Student.findByPk(req.user.id);

    if (!student) {
      await fs.unlink(uploadedFile.path).catch(() => {});
      return res.status(404).json({ message: "ไม่พบข้อมูลนักศึกษา" });
    }

    const newStoragePath = toStorageRelativePath(uploadedFile.path);
    const expectedPrefix = `students/${student.id}/resume/`;

    if (!newStoragePath.startsWith(expectedPrefix)) {
      await fs.unlink(uploadedFile.path).catch(() => {});
      return res.status(400).json({ message: "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง" });
    }

    const originalName = (
      path.basename(uploadedFile.originalname.replace(/\\/g, "/")) || "resume.pdf"
    ).slice(0, 255);

    const { resume, previousStoragePath } = await sequelize.transaction(
      async (transaction) => {
        const existingResume = await StudentFile.findOne({
          where: {
            student_id: student.id,
            file_type: "resume",
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const metadata = {
          original_name: originalName,
          storage_path: newStoragePath,
          mime_type: uploadedFile.mimetype,
          file_size: uploadedFile.size,
        };

        if (existingResume) {
          const previousPath = existingResume.storage_path;
          await existingResume.update(metadata, { transaction });
          return {
            resume: existingResume,
            previousStoragePath: previousPath,
          };
        }

        const createdResume = await StudentFile.create(
          {
            student_id: student.id,
            file_type: "resume",
            ...metadata,
          },
          { transaction },
        );

        return { resume: createdResume, previousStoragePath: null };
      },
    );

    if (
      previousStoragePath &&
      previousStoragePath !== newStoragePath &&
      previousStoragePath.startsWith(expectedPrefix)
    ) {
      try {
        await removeFileIfPresent(previousStoragePath);
      } catch (error) {
        console.error("REMOVE OLD RESUME ERROR:", error);
      }
    }

    return res.status(200).json({
      message: "อัปโหลด Resume สำเร็จ",
      resume,
    });
  } catch (error) {
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }

    console.error("UPLOAD RESUME ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถอัปโหลด Resume ได้" });
  }
};

module.exports = {
  getStudentProfile,
  getMyProfile: getStudentProfile,
  upsertStudentProfile,
  updateMyProfile: upsertStudentProfile,
  updateStudentInfo,
  uploadProfileImage,
  getProfileImage,
  uploadResume,
};
