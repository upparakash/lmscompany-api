const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
  addStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  studentLogin,
  studentProfile // ✅ IMPORT THIS
} = require("../controllers/StudentController");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Student APIs
router.post("/add", upload.single("photo"), addStudent);
router.get("/", getStudents);
router.put("/update/:id", upload.single("photo"), updateStudent);
router.delete("/delete/:id", deleteStudent);

// Login
router.post("/login", studentLogin);

// ✅ Protected Student Routes
router.get("/profile", protect, studentProfile);

module.exports = router;
