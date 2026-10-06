// Administrative bootstrap only. No public API may grant/revoke this marker.
require("dotenv").config({ quiet: true });
const { Teacher, sequelize } = require("../models");
const { uuid } = require("../validators/roleWorkflow.validator");
async function main() {
  const [decision, id] = process.argv.slice(2);
  if (!["grant", "revoke"].includes(decision))
    throw new Error(
      "Usage: node src/seeders/setDepartmentHead.js grant|revoke <teacher UUID>",
    );
  uuid(id);
  await sequelize.transaction(async (transaction) => {
    const teacher = await Teacher.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!teacher) throw new Error("Teacher was not found");
    if (
      decision === "grant" &&
      (teacher.status !== "active" ||
        !teacher.department?.trim() ||
        !teacher.email ||
        !teacher.password_hash)
    )
      throw new Error(
        "Head must be an active teacher with department and existing login credentials",
      );
    await teacher.update(
      { is_department_head: decision === "grant" },
      { transaction },
    );
  });
  console.info(
    "Department head authorization updated; log in again for fresh role claims",
  );
}
main()
  .catch((error) => {
    console.error(
      error.status === 400 || !error.parent
        ? error.message
        : "Unable to update department head authorization",
    );
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
