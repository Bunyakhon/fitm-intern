const express = require("express");

const {
  getStudentProfile,
  getMyProfile,
  upsertStudentProfile,
  updateMyProfile,
  updateStudentInfo,
  uploadProfileImage,
  getProfileImage,
  uploadResume,
} = require("../controllers/studentProfile.controller");

const {
  authenticateStudentToken: authenticateToken,
} = require("../middlewares/auth.middleware");
const {
  profileImageUpload,
  resumeUpload,
} = require("../middlewares/upload.middleware");

const router = express.Router();
const aggregate = require("../controllers/studentProfileAggregate.controller");
const { createSingleFileUpload } = require("../middlewares/upload.middleware");
const { DOCUMENT_MIME } = require("../services/studentProfileFiles.service");
const documentUpload = createSingleFileUpload("profileDocuments", DOCUMENT_MIME, 10 * 1024 * 1024);
const pdfImport = require("../controllers/studentProfilePdfImport.controller");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const pdfImportLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, keyGenerator: req => req.user.id,
  standardHeaders: "draft-7", legacyHeaders: false, message: { code: "PDF_IMPORT_RATE_LIMIT", message: "อ่าน PDF หลายครั้งแล้ว กรุณารอสักครู่ก่อนลองใหม่" } });
const pdfMemoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2, parts: 4, fieldSize: 256 * 1024 },
  fileFilter: (req, file, callback) => callback(file.mimetype === "application/pdf" ? null : new Error("PDF required"), file.mimetype === "application/pdf") }).single("document");
const receivePdf = (req, res, next) => pdfMemoryUpload(req, res, error => error
  ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ code: "PDF_UPLOAD_INVALID", message: "แนบ PDF หนึ่งไฟล์ ไม่เกิน 10MB" }) : next());
const privateImportResponse = (req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); };
router.post("/pdf-import/preview", authenticateToken, privateImportResponse, pdfImportLimit, receivePdf, pdfImport.preview);
router.post("/pdf-import/commit", authenticateToken, privateImportResponse, aggregate.requireRevision, receivePdf, pdfImport.commit);
router.post("/pdf-import/status", authenticateToken, privateImportResponse, pdfImport.status);
router.post("/pdf-import/review", authenticateToken, privateImportResponse, pdfImport.review);
router.get("/pdf-import/history", authenticateToken, privateImportResponse, pdfImport.history);

router.get("/aggregate", authenticateToken, aggregate.getProfile);
router.patch("/aggregate", authenticateToken, aggregate.saveAggregate);
router.put("/aggregate", authenticateToken, aggregate.saveAggregate);
for (const kind of ["addresses", "education", "training", "skills"]) {
  router.get("/" + kind, authenticateToken, aggregate.children(kind, "read"));
  router.get("/" + kind + "/:id", authenticateToken, aggregate.children(kind, "read"));
  router.post("/" + kind, authenticateToken, aggregate.children(kind, "create"));
  router.patch("/" + kind + "/:id", authenticateToken, aggregate.children(kind, "update"));
  router.delete("/" + kind + "/:id", authenticateToken, aggregate.children(kind, "delete"));
}
router.get("/documents", authenticateToken, aggregate.listDocuments);
router.get("/documents/:id/download", authenticateToken, aggregate.downloadDocument);
router.patch("/documents/:id", authenticateToken, aggregate.patchDocument);
router.delete("/documents/:id", authenticateToken, aggregate.deleteDocument);
router.post("/documents/:fileType", authenticateToken, aggregate.requireRevision, (req, res, next) => {
  documentUpload.single("document")(req, res, error => error
    ? res.status(400).json({ message: "รับเอกสาร PDF/JPEG/PNG หนึ่งไฟล์ ขนาดไม่เกิน 10MB" }) : next());
}, aggregate.uploadDocument);

// ดูข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.get("/me", authenticateToken, getMyProfile);
router.put("/me", authenticateToken, updateMyProfile);

router.get("/", authenticateToken, getStudentProfile);

router.get("/profile-image", authenticateToken, getProfileImage);
router.delete("/profile-image", authenticateToken, aggregate.deleteImage);

router.put("/student-info", authenticateToken, updateStudentInfo);

router.post(
  "/profile-image",
  authenticateToken,
  aggregate.requireRevision,
  (req, res, next) => {
    profileImageUpload.single("profile_image")(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ขนาดรูปต้องไม่เกิน 5MB" });
      }

      return res.status(400).json({
        message: "รองรับเฉพาะไฟล์ image/jpeg, image/png และ image/webp",
      });
    });
  },
  uploadProfileImage,
);

router.post(
  "/resume",
  authenticateToken,
  (req, res, next) => {
    resumeUpload.single("resume")(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ไฟล์ Resume ต้องไม่เกิน 10MB" });
      }

      return res.status(400).json({
        message: "รองรับเฉพาะไฟล์ PDF (application/pdf)",
      });
    });
  },
  uploadResume,
);

// เพิ่มหรือแก้ไขข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.put("/", authenticateToken, upsertStudentProfile);

module.exports = router;
