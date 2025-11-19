const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");

const {
  addStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  studentLogin,
  searchStudents,    // ⭐ ADD THIS
  studentProfile
} = require("../controllers/StudentController");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ➤ Add Student
router.post("/add", upload.single("photo"), addStudent);

// ➤ Get All Students
router.get("/", getStudents);

// ⭐ SEARCH Students (new)
router.get("/search", searchStudents);

// ➤ Update Student
router.put("/update/:id", upload.single("photo"), updateStudent);

// ➤ Delete Student
router.delete("/delete/:id", deleteStudent);

// ➤ Login
router.post("/login", studentLogin);

// ➤ Protected profile
router.get("/profile", protect, studentProfile);

module.exports = router;
