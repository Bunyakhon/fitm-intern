const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ensureStudentStorage } = require("../config/storage");

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const RESUME_MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
};

const createStorage = (directoryName, mimeExtensions, studentStorage = ensureStudentStorage) => multer.diskStorage({
  destination: async (req, file, callback) => {
    try {
      if (!req.user?.id) {
        return callback(new Error("Authenticated student is required"));
      }

      const paths = await studentStorage(req.user.id);
      return callback(null, paths[directoryName]);
    } catch (error) {
      return callback(error);
    }
  },
  filename: (req, file, callback) => {
    const extension = mimeExtensions[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const createSingleFileUpload = (directoryName, mimeExtensions, fileSize, { storageConfig, ...options } = {}) => multer({
  ...options,
  storage: createStorage(directoryName, mimeExtensions, storageConfig?.ensureStudentStorage),
  limits: { fileSize },
  fileFilter: (req, file, callback) => {
    if (!mimeExtensions[file.mimetype]) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }

    return callback(null, true);
  },
});

const profileImageUpload = createSingleFileUpload(
  "profile",
  MIME_EXTENSIONS,
  5 * 1024 * 1024,
);

const resumeUpload = createSingleFileUpload(
  "resume",
  RESUME_MIME_EXTENSIONS,
  10 * 1024 * 1024,
);

module.exports = {
  createSingleFileUpload,
  profileImageUpload,
  resumeUpload,
  MIME_EXTENSIONS,
  RESUME_MIME_EXTENSIONS,
};
