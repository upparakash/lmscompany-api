const db = require("../config/db");

// ----------------------------------------------------------
// GET SUMMARY (total fee + total paid)
// ----------------------------------------------------------
exports.getSummary = async (req, res) => {
  try {
    

    const { admissionId, schoolCode } = req.params;


    const [master] = await db.query(
      `SELECT * FROM fee_master WHERE admissionId = ? AND schoolCode = ?`,
      [admissionId, schoolCode]
    );

    console.log("📌 Master Result:", master);

    if (master.length === 0) {
      console.log("❗ No master found");
      return res.json({
        exists: false,
        summary: {}
      });
    }

    const feeMasterId = master[0].feeMasterId;
    const [payments] = await db.query(
      `SELECT SUM(payingNow) AS totalPaid 
       FROM fee_payments WHERE feeMasterId = ?`,
      [feeMasterId]
    );

    console.log("📌 Payments Summary:", payments);

    const totalPaid = payments[0].totalPaid || 0;

    // ➤ Fetch latest due date
    console.log("➡ Fetching last due date...");
    const [lastPayment] = await db.query(
      `SELECT dueDate 
       FROM fee_payments 
       WHERE feeMasterId = ? 
       ORDER BY paymentId DESC 
       LIMIT 1`,
      [feeMasterId]
    );

    const lastDueDate = lastPayment.length ? lastPayment[0].dueDate : null;

    console.log("🎉 Final Summary Response:", {
      totalFeeAmount: master[0].totalFeeAmount,
      totalPaid,
      lastDueDate
    });

    return res.json({
      exists: true,
      summary: {
        totalFeeAmount: master[0].totalFeeAmount,
        totalPaid,
        lastDueDate
      }
    });
  } catch (err) {
    console.error("❌ GET SUMMARY ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};


// ----------------------------------------------------------
// GET PAYMENT HISTORY
// ----------------------------------------------------------
exports.getHistory = async (req, res) => {
  try {
    const { admissionId, schoolCode } = req.params;
    const [master] = await db.query(
      `SELECT feeMasterId FROM fee_master 
       WHERE admissionId=? AND schoolCode=?`,
      [admissionId, schoolCode]
    );

    if (master.length === 0) {
      return res.json({ payments: [] });
    }

    const feeMasterId = master[0].feeMasterId;
    const [payments] = await db.query(
      `SELECT paymentId, payingNow, paymentDate, dueDate, remarks 
       FROM fee_payments 
       WHERE feeMasterId=? 
       ORDER BY paymentId DESC`,
      [feeMasterId]
    );

    return res.json({ payments });
  } catch (err) {
    console.error("❌ GET HISTORY ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

// ----------------------------------------------------------
// CREATE FEE MASTER (ONLY IF NOT EXISTS)
// ----------------------------------------------------------
exports.createFeeMaster = async (req, res) => {
  try {
    console.log("➡ Incoming request to createFeeMaster:", req.body);

    const { admissionId, studentId, totalFeeAmount, schoolCode, remarks } = req.body;

    // Validate required fields
    if (!admissionId || !studentId || !totalFeeAmount || !schoolCode) {
      console.log("❌ Missing input fields:", { admissionId, studentId, totalFeeAmount, schoolCode });
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`➡ Checking if master exists for Admission ID: ${admissionId}, School Code: ${schoolCode}`);

    const [existing] = await db.query(
      `SELECT feeMasterId FROM fee_master WHERE admissionId=? AND schoolCode=?`,
      [admissionId, schoolCode]
    );

    console.log("📌 Existing Master Query Result:", existing);

    if (existing.length > 0) {
      console.log("✔ Master already exists → Returning existing feeMasterId:", existing[0].feeMasterId);
      return res.json({
        success: true,
        message: "Fee master already exists",
        feeMasterId: existing[0].feeMasterId
      });
    }

    console.log("➡ No existing master found → Creating new fee master...");

    const [insert] = await db.query(
      `INSERT INTO fee_master 
       (admissionId, studentId, schoolCode, totalFeeAmount, remarks) 
       VALUES (?, ?, ?, ?, ?)`,
      [admissionId, studentId, schoolCode, totalFeeAmount, remarks || null]
    );

    console.log("🎉 New Fee Master Created Successfully:", insert);
    console.log("➡ Inserted feeMasterId:", insert.insertId);

    return res.json({
      success: true,
      message: "Fee master created",
      feeMasterId: insert.insertId
    });
  } catch (err) {
    console.error("❌ CREATE FEE MASTER ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};



exports.addPayment = async (req, res) => {
  try {
    const {
      admissionId,
      studentId,
      schoolCode,
      payingNow,
      dueDate,
      remarks
    } = req.body;

    if (!admissionId || !studentId || !schoolCode || !payingNow || !dueDate) {
      console.log("❌ Missing payment fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("➡ Checking master for payment...");

    const [master] = await db.query(
      `SELECT feeMasterId FROM fee_master 
       WHERE admissionId=? AND schoolCode=?`,
      [admissionId, schoolCode]
    );

    console.log("📌 Master:", master);

    if (master.length === 0) {
      console.log("❗ Master not found → cannot add payment");
      return res.status(400).json({
        error: "Fee master not found. Create master first."
      });
    }

    const feeMasterId = master[0].feeMasterId;
    console.log("➡ Adding payment for feeMasterId:", feeMasterId);

    await db.query(
      `INSERT INTO fee_payments 
      (feeMasterId, admissionId, studentId, payingNow, paymentDate, dueDate, schoolCode, remarks) 
      VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)`,
      [feeMasterId, admissionId, studentId, payingNow, dueDate, schoolCode, remarks || null]
    );

    console.log("🎉 Payment inserted successfully");

    return res.json({ success: true, message: "Payment added successfully" });
  } catch (err) {
    console.error("❌ ADD PAYMENT ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};




exports.getFeeReceipt = async (req, res) => {
  try {
    const { admissionId, schoolCode } = req.params;

    if (!admissionId || !schoolCode) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log("➡ Fetching fee receipt for:", admissionId, schoolCode);

    // 1️⃣ Fetch master record (no 'remarks' here)
    const [master] = await db.query(
      `SELECT feeMasterId, admissionId, studentId, totalFeeAmount, schoolCode
       FROM fee_master
       WHERE admissionId=? AND schoolCode=?`,
      [admissionId, schoolCode]
    );

    if (master.length === 0) {
      return res.status(404).json({ error: "Fee master not found" });
    }

    const feeMasterId = master[0].feeMasterId;

    // 2️⃣ Fetch all payments for this fee master
   const [payments] = await db.query(
  `SELECT fp.paymentId, fp.payingNow, fp.dueDate, fp.remarks, fm.createdAt
   FROM fee_payments fp
   JOIN fee_master fm ON fm.feeMasterId = fp.feeMasterId
   WHERE fp.feeMasterId = ?
   ORDER BY fp.paymentDate DESC`,
  [feeMasterId]
);


    console.log("🎉 Payment history loaded:", payments.length);

    // 3️⃣ Calculate total paid and pending
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.payingNow), 0);
    const totalPending = parseFloat(master[0].totalFeeAmount) - totalPaid;

    return res.json({
      success: true,
      feeMaster: master[0],
      payments,
      summary: {
        totalFee: parseFloat(master[0].totalFeeAmount),
        totalPaid,
        totalPending
      }
    });

  } catch (err) {
    console.error("❌ GET FEE RECEIPT ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

