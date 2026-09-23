require("dotenv").config();

const express = require("express");

const cors = require("cors");

const sequelize = require("./config/database");

const authRoutes = require("./routes/auth.routes");

const studentProfileRoutes = require("./routes/studentProfile.routes");

const teacherRoutes = require("./routes/teacher.routes");

const mentorRoutes = require("./routes/mentor.routes");
const mentorVerificationRoutes = require("./routes/mentorVerification.routes");
// โหลด models ทั้งหมด
// Student, StudentProfile และ associate()
require("./models");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

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


// ==============================
// Database + Server
// ==============================

// ใช้ alter: true เฉพาะตอน Development
// เมื่อ Schema นิ่งแล้วควรเปลี่ยนไปใช้ Migration
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected.");

    return sequelize.sync({
      alter: true,
    });
  })
  .then(() => {
    console.log("Models synced.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);

    process.exit(1);
  });
