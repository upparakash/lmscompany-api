const express = require("express");
const router = express.Router();
const {
  addFeePayment,
  getFeesByStudent,
} = require("../controllers/feeController");

// Add Fee Payment
router.post("/add", addFeePayment);

// Get All Fee Records by Student ID
router.get("/student/:studentId", getFeesByStudent);

module.exports = router;
