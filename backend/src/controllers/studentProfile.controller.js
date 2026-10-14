const {
  Student,
  StudentFile,
  sequelize,
} = require("../models");
const fs = require("fs/promises");
const path = require("path");
const {
  resolveStoragePath,
  toStorageRelativePath,
} = require("../config/storage");
const { extractResumeText, normalizeExtractedText, isUsableResumeText } = require("../services/resumeText.service");
const { extractResumeWithOcr } = require("../services/resumeOcr.client");

// All profile mutations use the same aggregate transaction/revision service.
const aggregateController = require("./studentProfileAggregate.controller");
const getStudentProfile = aggregateController.getProfile;
const upsertStudentProfile = aggregateController.saveProfile;
const updateStudentInfo = aggregateController.saveStudent;
const uploadProfileImage = aggregateController.uploadImage;
const getProfileImage = aggregateController.getImage;

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

const uploadResume = async (req, res) => {
  const uploadedFile = req.file;
  let metadataCommitted = false;

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
          extracted_text: null,
          extraction_method: null,
          extraction_status: "pending",
          extracted_at: null,
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
    // The managed transaction has committed; the DB now owns the uploaded file.
    metadataCommitted = true;

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

    let extracted = "";
    let extractionMethod = null;
    try {
      const pdfBytes = await fs.readFile(resolveStoragePath(newStoragePath));
      const nativeText = normalizeExtractedText(await extractResumeText(pdfBytes));
      if (isUsableResumeText(nativeText)) {
        extracted = nativeText;
        extractionMethod = "pdf_text";
      } else {
        const ocrText = normalizeExtractedText(await extractResumeWithOcr(pdfBytes));
        if (isUsableResumeText(ocrText)) {
          extracted = ocrText.slice(0, 20_000);
          extractionMethod = "ocr";
        }
      }
    } catch {
      // Extraction is supplemental; a safely stored resume remains usable as an upload.
    }

    const extractionStatus = extractionMethod ? "ready" : "failed";
    await resume.update({
      extracted_text: extractionMethod ? extracted.slice(0, 20_000) : null,
      extraction_method: extractionMethod,
      extraction_status: extractionStatus,
      extracted_at: extractionMethod ? new Date() : null,
    });

    return res.status(200).json({
      message: "อัปโหลด Resume สำเร็จ",
      resume: {
        original_name: resume.original_name,
        mime_type: resume.mime_type,
        file_size: Number(resume.file_size),
        extraction_status: extractionStatus,
        extraction_method: extractionMethod,
      },
    });
  } catch (error) {
    if (uploadedFile && !metadataCommitted) {
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
