const express = require("express");
const router = express.Router();
const classTeacherController = require("../controllers/ClassTeacherAssignmentController");

// GET all assignments (with optional filters)
router.get("/assignments", classTeacherController.getAssignments);

// CREATE assignment
router.post("/assign", classTeacherController.assignTeacher);

// EDIT assignment
router.put("/edit/:id", classTeacherController.editAssignment);

// DELETE assignment
router.delete("/delete/:id", classTeacherController.deleteAssignment);

router.get("/students", classTeacherController.getStudentsOfClass);

module.exports = router;
