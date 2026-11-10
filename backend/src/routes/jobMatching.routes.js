const express = require("express");
const { getMyJobMatches, getMyJobMatchingSource, listPublishedJobs } = require("../controllers/jobMatching.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

function requireStudentActor(req, res, next) {
  if (
    typeof req.user?.id !== "string" ||
    typeof req.user?.student_id !== "string" ||
    ![undefined, "student"].includes(req.user.actor_type) ||
    (req.user.role !== undefined && req.user.role !== "student")
  ) {
    return res.status(403).json({
      message: "Student authorization is required",
      code: "STUDENT_AUTHORIZATION_REQUIRED",
    });
  }

  return next();
}

router.post("/me", authenticateToken, requireStudentActor, getMyJobMatches);
router.get("/me/source", authenticateToken, requireStudentActor, getMyJobMatchingSource);
router.get("/me/jobs", authenticateToken, requireStudentActor, listPublishedJobs);

module.exports = router;
module.exports.requireStudentActor = requireStudentActor;
