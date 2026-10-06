const express = require("express");

const {
  getMyCoopRequests,
  getCoopRequestById,
  createCoopRequest,
  cancelCoopRequest,
  searchCompanies,
  checkCompanyDuplicate,
  getPublishedJobPostingForCoopRequest,
} = require("../controllers/coopRequest.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

function requireStudentActor(req, res, next) {
  if (typeof req.user?.id !== "string" || typeof req.user?.student_id !== "string" || ![undefined, "student"].includes(req.user.actor_type) || (req.user.role !== undefined && req.user.role !== "student")) {
    return res.status(403).json({ success: false, message: "Student authorization is required" });
  }
  return next();
}

router.use(authenticateToken, requireStudentActor);
router.get("/companies/search", searchCompanies);
router.get("/companies/duplicate-check", checkCompanyDuplicate);
router.get("/job-postings/:id", getPublishedJobPostingForCoopRequest);
router.get("/me", getMyCoopRequests);
router.get("/:id", getCoopRequestById);
router.post("/", createCoopRequest);
router.patch("/:id/cancel", cancelCoopRequest);

module.exports = router;
