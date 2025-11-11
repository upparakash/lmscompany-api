const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
  addTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  teacherLogin,
  getTeacherProfile,
  updateTeacherProfile
} = require("../controllers/TeacherController");

const router = express.Router();

// Memory storage to receive file buffer from frontend
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST - Add Teacher
router.post("/add", upload.single("photo"), addTeacher);

// GET - Fetch All Teachers
router.get("/", getTeachers);

// PUT - Update Teacher
router.put("/update/:id", upload.single("photo"), updateTeacher);

// DELETE - Delete Teacher
router.delete("/delete/:id", deleteTeacher);
router.post("/login", teacherLogin);
router.get("/profile", protect, getTeacherProfile);

// Update profile (protected) - accepts optional 'photo' file
router.put("/profile/update", protect, upload.single("photo"), updateTeacherProfile);

module.exports = router;
