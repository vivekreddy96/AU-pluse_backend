const express = require("express");
const {
  getDashboard,
  getAttendanceSummary,
  getAttendanceHistory,
  getSchedule,
  getWeeklySchedule
} = require("../controllers/studentController");

const router = express.Router();

router.get("/dashboard", getDashboard);
router.get("/attendance", getAttendanceSummary);
router.get("/attendance/summary", getAttendanceSummary);
router.get("/attendance/history", getAttendanceHistory);
router.get("/schedule", getSchedule);
router.get("/schedule/week", getWeeklySchedule);

module.exports = router;
