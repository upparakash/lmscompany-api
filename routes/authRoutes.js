const express = require("express");
const router = express.Router();
const { register, login, getAdmins, updatePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Register new admin
router.post("/register", register);

// Login
router.post("/login", login);

// Get all admins (protected)
router.get("/admins", protect, getAdmins);

// Update password (protected)
router.put("/update-password", protect, updatePassword);

module.exports = router;
