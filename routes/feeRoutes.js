const express = require("express");
const router = express.Router();
const feeController = require("../controllers/feeController");

// SUMMARY
router.get("/summary/:admissionId/:schoolCode", feeController.getSummary);

// HISTORY
router.get("/history/:admissionId/:schoolCode", feeController.getHistory);

// CREATE FEE MASTER (ONLY IF NOT EXISTS)
router.post("/master/create", feeController.createFeeMaster);

router.get("/fee-receipt/:admissionId/:schoolCode", feeController.getFeeReceipt);

// ADD PAYMENT
router.post("/pay", feeController.addPayment);

module.exports = router;
