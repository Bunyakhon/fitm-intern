require("dotenv").config();

const { DepartmentStaff, sequelize } = require("../models");

const REQUIRED_ENVIRONMENT = [
  "DEPARTMENT_STAFF_FIRST_NAME",
  "DEPARTMENT_STAFF_LAST_NAME",
  "DEPARTMENT_STAFF_EMAIL",
  "DEPARTMENT_STAFF_PASSWORD",
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Department staff creation is disabled in production");
  }

  const missing = REQUIRED_ENVIRONMENT.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  await sequelize.authenticate();
  const staff = await DepartmentStaff.create({
    first_name: process.env.DEPARTMENT_STAFF_FIRST_NAME.trim(),
    last_name: process.env.DEPARTMENT_STAFF_LAST_NAME.trim(),
    email: process.env.DEPARTMENT_STAFF_EMAIL,
    password: process.env.DEPARTMENT_STAFF_PASSWORD,
    is_active: true,
  });

  console.log(`Department staff account created: ${staff.id}`);
}

main()
  .catch((error) => {
    console.error("Unable to create department staff account:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
