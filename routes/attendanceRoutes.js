const express = require("express");
const {
  saveAttendance,
  getSessionDetails,
  updateSessionAttendance,
  getAttendanceHistory
} = require("../controllers/attendanceController");

const router = express.Router();

router.post("/", saveAttendance);
router.get("/history", getAttendanceHistory);
router.get("/session/:id", getSessionDetails);
router.put("/session/:id", updateSessionAttendance);

module.exports = router;
