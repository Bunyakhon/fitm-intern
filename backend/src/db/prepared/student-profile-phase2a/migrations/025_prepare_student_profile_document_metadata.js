const { newFileTypes } = require("../schema");
const { addColumns, runPrepared, down } = require("../migrationSupport");
const labels = newFileTypes.map(value => "'" + value + "'").join(", ");
const singles = newFileTypes.filter(value => value !== "supporting_other").map(value => "'" + value + "'").join(", ");
const statements = [
  ...addColumns("student_files"),
  "ALTER TABLE public.student_files ADD CONSTRAINT phase2a_student_file_owner_unique UNIQUE (id, student_id)",
  "ALTER TABLE public.student_files ADD CONSTRAINT phase2a_supersedes_owner FOREIGN KEY (supersedes_file_id, student_id) REFERENCES public.student_files(id, student_id) ON UPDATE RESTRICT ON DELETE RESTRICT",
  // Keep all legacy partial indexes and their exact behaviour.
  "CREATE UNIQUE INDEX phase2a_profile_document_current ON public.student_files(student_id, file_type) WHERE is_current AND file_type IN (" + singles + ")",
  "CREATE INDEX phase2a_profile_documents_owner ON public.student_files(student_id, file_type, created_at, id) WHERE file_type IN (" + labels + ")",
];
module.exports = { statements, up: ({ context }) => runPrepared(context, statements), down };
