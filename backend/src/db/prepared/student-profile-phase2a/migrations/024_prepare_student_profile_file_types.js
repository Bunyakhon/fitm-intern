const { newFileTypes } = require("../schema");
const { runPrepared, down } = require("../migrationSupport");
// Commit this migration before any index/CHECK uses new enum labels (PostgreSQL).
const statements = newFileTypes.map(value =>
  "ALTER TYPE public.enum_student_files_file_type ADD VALUE IF NOT EXISTS '" + value + "'");
module.exports = { statements, up: ({ context }) => runPrepared(context, statements), down };
