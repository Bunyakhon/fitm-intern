const { addColumns, runPrepared, down } = require("../migrationSupport");
const statements = [...addColumns("students"), ...addColumns("student_profiles")];
module.exports = { statements, up: ({ context }) => runPrepared(context, statements), down };
