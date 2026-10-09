require("dotenv").config();

const express = require("express");

const cors = require("cors");

const sequelize = require("./config/database");

const authRoutes = require("./routes/auth.routes");

const studentProfileRoutes = require("./routes/studentProfile.routes");

const teacherRoutes = require("./routes/teacher.routes");

const mentorRoutes = require("./routes/mentor.routes");
const mentorVerificationRoutes = require("./routes/mentorVerification.routes");
const coopRequestRoutes = require("./routes/coopRequest.routes");
const jobSubmissionRoutes = require("./routes/jobSubmission.routes");
const staffAuthRoutes = require("./routes/staffAuth.routes");
const jobMatchingRoutes = require("./routes/jobMatching.routes");
const { createStudentCoopRouter } = require("./routes/studentCoop.routes");
const { createRoleWorkflowRouter } = require("./routes/roleWorkflow.routes");
// โหลด models ทั้งหมด
// Student, StudentProfile และ associate()
require("./models");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).origin : false, credentials: true }));

app.use(express.json());

// ==============================
// Routes
// ==============================

// Route ทดสอบ API
app.get("/", (req, res) => {
  res.json({
    message: "fitm-intern API is running",
  });
});

// Route ทดสอบ Database
app.get("/health/db", async (req, res) => {
  try {
    await sequelize.authenticate();

    res.json({
      status: "ok",
      message: "Database connection is healthy",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Student Profile routes
app.use("/api/student-profile", studentProfileRoutes);

// Teacher routes
app.use("/api/teachers", teacherRoutes);

// Mentor routes
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentor-verification", mentorVerificationRoutes);
app.use("/api/coop-requests", coopRequestRoutes);
app.use("/api/job-submissions", jobSubmissionRoutes);
app.use("/api/staff/auth", staffAuthRoutes);
app.use("/api/staff", createRoleWorkflowRouter("department_staff"));
app.use("/api/teachers", createRoleWorkflowRouter("teacher"));
app.use("/api/department-head", createRoleWorkflowRouter("department_head"));
app.use("/api/job-matches", jobMatchingRoutes);
app.use("/api/student-coop", createStudentCoopRouter());
app.use("/api/internship-logs", require("./routes/internshipLogs.routes").createInternshipLogsRouter());
app.use("/api/supervision", require("./routes/supervision.routes").createSupervisionRouter());
app.use("/api/coop-activities", require("./routes/coopActivities.routes").createCoopActivitiesRouter());

// Do not return Express parser stacks, SQL details or provider diagnostics.
app.use((error, req, res, next) => {
  res.status(error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500)
    .json({ message: "Unable to process request" });
});

// ==============================
// Database + Server
// ==============================

// Schema changes are applied explicitly through `npm run db:migrate`.
// Application startup must not mutate the schema.
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);

    process.exit(1);
  });
