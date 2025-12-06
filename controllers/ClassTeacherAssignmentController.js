const db = require("../config/db");


// ----------------------------------------------------------
// GET ALL ASSIGNMENTS
// ----------------------------------------------------------
exports.getAssignments = async (req, res) => {
  try {
    console.log("\n📥 GET ASSIGNMENTS | Incoming Query Params:", req.query);

    const { schoolCode, standard, teacherName } = req.query;

    if (!schoolCode) {
      console.log("❌ Missing schoolCode in request");
      return res.status(400).json({ error: "schoolCode is required" });
    }

    let query = `
      SELECT 
        id, 
        schoolCode, 
        standard, 
        section, 
        teacherId, 
        teacherName
      FROM class_teacher_assignments
      WHERE schoolCode = ?
    `;

    const params = [schoolCode];

    if (standard) {
      console.log("➡ Filter: standard =", standard);
      query += " AND standard = ?";
      params.push(standard);
    }

    if (teacherName) {
      console.log("➡ Filter: teacherName LIKE", teacherName);
      query += " AND teacherName LIKE ?";
      params.push(`%${teacherName}%`);
    }

    console.log("🔍 Final SQL Query:", query);
    console.log("🧩 Query Params:", params);

    const [rows] = await db.query(query, params);

    console.log("✅ Assignments fetched:", rows.length);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET ASSIGNMENTS ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};


// ----------------------------------------------------------
// CREATE ASSIGNMENT
// ----------------------------------------------------------
exports.assignTeacher = async (req, res) => {
  console.log("\n📥 POST ASSIGN TEACHER | Incoming Body:", req.body);

  try {
    const { schoolCode, standard, section, teacherId, teacherName } = req.body;

    console.log(`
    ➡ Received Fields:
    - schoolCode: ${schoolCode}
    - standard: ${standard}
    - section: ${section}
    - teacherId: ${teacherId}
    - teacherName: ${teacherName}
    `);

    if (!schoolCode || !standard || !section || !teacherId || !teacherName) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Duplicate check
    console.log("🔍 Checking if assignment already exists...");
    const [existing] = await db.query(
      `SELECT * FROM class_teacher_assignments 
       WHERE schoolCode=? AND standard=? AND section=?`,
      [schoolCode, standard, section]
    );

    if (existing.length > 0) {
      console.log("⚠ DUPLICATE FOUND:", existing);
      return res.status(400).json({
        error: "Assignment already exists for this class & section",
      });
    }

    console.log("🆕 Inserting new assignment...");

    const [insert] = await db.query(
      `INSERT INTO class_teacher_assignments 
       (schoolCode, standard, section, teacherId, teacherName)
       VALUES (?, ?, ?, ?, ?)`,
      [schoolCode, standard, section, teacherId, teacherName]
    );

    console.log("✅ INSERT SUCCESS | Insert ID:", insert.insertId);

    return res.json({
      success: true,
      message: "Teacher assigned successfully",
      id: insert.insertId,
    });
  } catch (err) {
    console.error("❌ ASSIGN TEACHER ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};


// ----------------------------------------------------------
// EDIT ASSIGNMENT
// ----------------------------------------------------------
exports.editAssignment = async (req, res) => {
  try {
    console.log("\n✏ UPDATE ASSIGNMENT | Params:", req.params);
    console.log("📥 Body:", req.body);

    const { id } = req.params;
    const { standard, section, teacherId, teacherName } = req.body;

    if (!id || !standard || !section || !teacherId || !teacherName) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("🛠 Updating assignment ID:", id);

    const [update] = await db.query(
      `UPDATE class_teacher_assignments 
       SET standard=?, section=?, teacherId=?, teacherName=?
       WHERE id=?`,
      [standard, section, teacherId, teacherName, id]
    );

    console.log("✅ UPDATE RESULT:", update);

    return res.json({
      success: true,
      message: "Assignment updated successfully",
    });
  } catch (err) {
    console.error("❌ EDIT ASSIGNMENT ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};


// ----------------------------------------------------------
// DELETE ASSIGNMENT
// ----------------------------------------------------------
exports.deleteAssignment = async (req, res) => {
  try {
    console.log("\n🗑 DELETE ASSIGNMENT | Params:", req.params);

    const { id } = req.params;

    if (!id) {
      console.log("❌ Missing ID for deletion");
      return res.status(400).json({ error: "Missing assignment ID" });
    }

    console.log("🚮 Deleting assignment ID:", id);

    const [del] = await db.query(
      `DELETE FROM class_teacher_assignments WHERE id=?`,
      [id]
    );

    console.log("✅ DELETE RESULT:", del);

    return res.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (err) {
    console.error("❌ DELETE ASSIGNMENT ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};



// ----------------------------------------------------------
// ✅ GET STUDENTS OF CLASS (NEW FUNCTION)
// ----------------------------------------------------------
exports.getStudentsOfClass = async (req, res) => {
  try {
    console.log("\n📘 GET STUDENTS OF CLASS | Query:", req.query);

    const { schoolCode, standard, section } = req.query;

    if (!schoolCode || !standard || !section) {
      return res.status(400).json({
        success: false,
        message: "schoolCode, standard & section are required",
      });
    }

    const sql = `
      SELECT 
        id AS studentId,
        fullname,
        admissionId,
        contactNumber AS parentContact,
        photo
      FROM students
      WHERE schoolCode=? AND standard=? AND section=?
      ORDER BY id ASC
    `;

    const [rows] = await db.query(sql, [schoolCode, standard, section]);

    return res.json({
      success: true,
      count: rows.length,
      students: rows,
    });

  } catch (err) {
    console.error("❌ ERROR getStudentsOfClass:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching students",
    });
  }
};
