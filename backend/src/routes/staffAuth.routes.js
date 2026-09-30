const express = require("express");
const { loginDepartmentStaff } = require("../controllers/staffAuth.controller");

const router = express.Router();

router.post("/login", loginDepartmentStaff);

module.exports = router;
