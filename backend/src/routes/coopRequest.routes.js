const express = require("express");

const {
  getMyCoopRequests,
  getCoopRequestById,
  createCoopRequest,
  cancelCoopRequest,
} = require("../controllers/coopRequest.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me", authenticateToken, getMyCoopRequests);
router.get("/:id", authenticateToken, getCoopRequestById);
router.post("/", authenticateToken, createCoopRequest);
router.patch("/:id/cancel", authenticateToken, cancelCoopRequest);

module.exports = router;
