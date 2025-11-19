const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  addSchool,
  getSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  schoolLogin
} = require("../controllers/schoolController");

const multer = require("multer");

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Add new school (with file upload)
router.post("/", protect, upload.single("school_logo"), addSchool);

// Update school
router.put("/:id", protect, upload.single("school_logo"), updateSchool);

router.get("/", protect, getSchools);
router.get("/:id", protect, getSchool);
router.delete("/:id", protect, deleteSchool);
router.post("/login", schoolLogin);
module.exports = router;
