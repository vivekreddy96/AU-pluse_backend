const express = require("express");
const {
  getDashboard,
  getClasses,
  getSections,
  getSubjects,
  getSchedule,
  getWeeklySchedule,
  getStudents
} = require("../controllers/facultyController");

const router = express.Router();

router.get("/dashboard", getDashboard);
router.get("/classes", getClasses);
router.get("/sections", getSections);
router.get("/subjects", getSubjects);
router.get("/schedule", getSchedule);
router.get("/schedule/week", getWeeklySchedule);
router.get("/students", getStudents);

module.exports = router;
