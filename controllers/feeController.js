const db = require("../config/db");

// ----------------------------------------
// ADD FEE PAYMENT
// ----------------------------------------
exports.addFeePayment = (req, res) => {
  const {
    studentId,
    totalFeeAmount,
    paidAmount,
    payingNow,
    remainingAmount,
    dueDate,
    schoolCode,
  } = req.body;

  // Auto set today's date as payingDate
  const payingDate = new Date().toISOString().split("T")[0];

  if (!studentId || !payingNow || !dueDate) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO fee_payments
      (studentId, totalFeeAmount, paidAmount, payingNow, remainingAmount, payingDate, dueDate, schoolCode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      studentId,
      totalFeeAmount,
      paidAmount,
      payingNow,
      remainingAmount,
      payingDate,
      dueDate,
      schoolCode,
    ],
    (err, result) => {
      if (err) {
        console.log("Fee Insert Error:", err);
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }

      res.json({
        success: true,
        message: "Fee payment added successfully",
        feeId: result.insertId,
        payingDate,
      });
    }
  );
};

// ----------------------------------------
// GET FEES FOR ONE STUDENT
// ----------------------------------------
exports.getFeesByStudent = (req, res) => {
  const studentId = req.params.studentId;

  db.query(
    "SELECT * FROM fee_payments WHERE studentId = ? ORDER BY id DESC",
    [studentId],
    (err, results) => {
      if (err) {
        console.log("Fee Fetch Error:", err);
        return res.status(500).json({ success: false, message: "Database error", error: err });
      }

      res.json({
        success: true,
        count: results.length,
        data: results,
      });
    }
  );
};
