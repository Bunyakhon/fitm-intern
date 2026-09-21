const fs = require("fs/promises");
const path = require("path");

const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_ROOT || path.join(__dirname, "../../storage"),
);

const isWithinStorageRoot = (targetPath) => {
  const relativePath = path.relative(STORAGE_ROOT, targetPath);

  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    relativePath !== ".." &&
    !path.isAbsolute(relativePath)
  );
};

const ensureDirectory = async (directoryPath) => {
  const resolvedPath = path.resolve(directoryPath);

  if (resolvedPath !== STORAGE_ROOT && !isWithinStorageRoot(resolvedPath)) {
    throw new Error("Storage directory must be inside STORAGE_ROOT");
  }

  await fs.mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
};

const getStudentStoragePaths = (studentId) => {
  if (typeof studentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId)) {
    throw new Error("Invalid student storage identifier");
  }

  const studentRoot = path.resolve(STORAGE_ROOT, "students", studentId);

  if (!isWithinStorageRoot(studentRoot)) {
    throw new Error("Invalid student storage path");
  }

  return {
    root: studentRoot,
    profile: path.join(studentRoot, "profile"),
    resume: path.join(studentRoot, "resume"),
    coop: path.join(studentRoot, "coop"),
    posters: path.join(studentRoot, "coop", "posters"),
    projectBooks: path.join(studentRoot, "coop", "project-books"),
    practiceLogBooks: path.join(studentRoot, "coop", "practice-log-books"),
  };
};

const ensureStudentStorage = async (studentId) => {
  const paths = getStudentStoragePaths(studentId);

  await Promise.all(Object.values(paths).map(ensureDirectory));
  return paths;
};

const toStorageRelativePath = (absolutePath) => {
  const resolvedPath = path.resolve(absolutePath);

  if (!isWithinStorageRoot(resolvedPath)) {
    throw new Error("Path must be inside STORAGE_ROOT");
  }

  return path.relative(STORAGE_ROOT, resolvedPath).split(path.sep).join("/");
};

const resolveStoragePath = (storagePath) => {
  if (typeof storagePath !== "string" || !storagePath.trim() || path.isAbsolute(storagePath)) {
    throw new Error("Invalid storage path");
  }

  const resolvedPath = path.resolve(STORAGE_ROOT, storagePath);

  if (!isWithinStorageRoot(resolvedPath)) {
    throw new Error("Storage path escapes STORAGE_ROOT");
  }

  return resolvedPath;
};

module.exports = {
  STORAGE_ROOT,
  ensureDirectory,
  getStudentStoragePaths,
  ensureStudentStorage,
  toStorageRelativePath,
  resolveStoragePath,
};
