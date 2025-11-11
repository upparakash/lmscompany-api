// routes/attendanceRouter.js
const express = require("express");
const {
  addAttendance,
  updateAttendance,
  getAttendanceByDateAndType,
  checkAttendance,
  getAttendanceSummary,
} = require("../controllers/attendanceController");

const router = express.Router();

router.post("/add", addAttendance);
router.put("/update", updateAttendance);
router.get("/view", getAttendanceByDateAndType);         // ?school_code=&date=&type=
router.get("/check", checkAttendance);                   // ?school_code=&person_id=&date=&type=
router.get("/summary/:school_code/:personId", getAttendanceSummary);

module.exports = router;
