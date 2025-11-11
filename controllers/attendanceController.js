// controllers/attendanceController.js
const db = require("../config/db");

/*
  Attendance table columns assumed:
  - id, school_code, person_id, person_type, date, status, marked_by, created_at, updated_at
  person_id maps to:
    - students.admissionId  (when person_type='student')
    - teachers.employeeid   (when person_type='teacher')
*/

// ADD attendance
const addAttendance = async (req, res) => {
  const { school_code, person_id, person_type, date, status, marked_by } = req.body;
  if (!school_code || !person_id || !person_type || !date || !status || !marked_by) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const [existing] = await db.execute(
      "SELECT id FROM attendance WHERE school_code=? AND person_id=? AND date=? AND person_type=?",
      [school_code, person_id, date, person_type]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Attendance already exists. Use update." });
    }

    await db.execute(
      "INSERT INTO attendance (school_code, person_id, person_type, date, status, marked_by) VALUES (?,?,?,?,?,?)",
      [school_code, person_id, person_type, date, status, marked_by]
    );

    res.status(201).json({ success: true, message: "Attendance added successfully" });
  } catch (error) {
    console.error("Add Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// UPDATE attendance
const updateAttendance = async (req, res) => {
  const { school_code, person_id, person_type, date, status, marked_by } = req.body;
  if (!school_code || !person_id || !person_type || !date || !status || !marked_by) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const [existing] = await db.execute(
      "SELECT id FROM attendance WHERE school_code=? AND person_id=? AND date=? AND person_type=?",
      [school_code, person_id, date, person_type]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "No attendance found to update" });
    }

    await db.execute(
      "UPDATE attendance SET status=?, marked_by=? WHERE school_code=? AND person_id=? AND date=? AND person_type=?",
      [status, marked_by, school_code, person_id, date, person_type]
    );

    res.status(200).json({ success: true, message: "Attendance updated successfully" });
  } catch (error) {
    console.error("Update Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// GET attendance by date & type (returns array)
// This version joins with students/teachers to return person_name and person_id for mapping.
const getAttendanceByDateAndType = async (req, res) => {
  const { school_code, date, type } = req.query;
  if (!school_code || !date || !type) {
    return res.status(400).json({ success: false, message: "school_code, date and type are required" });
  }

  try {
    // Query attendance plus person name by joining on admissionId / employeeid
    const sql = `
      SELECT 
        a.person_id,
        a.person_type,
        a.date,
        a.status,
        a.marked_by,
        a.created_at,
        COALESCE(
          CASE WHEN a.person_type = 'student' THEN s.fullname END,
          CASE WHEN a.person_type = 'teacher' THEN t.fullname END
        , '') AS person_name
      FROM attendance a
      LEFT JOIN students s ON a.person_type = 'student' AND a.person_id = s.admissionId AND s.schoolCode = a.school_code
      LEFT JOIN teachers t ON a.person_type = 'teacher' AND a.person_id = t.employeeid AND t.schoolCode = a.school_code
      WHERE a.school_code = ? AND a.date = ? AND a.person_type = ?
    `;

    const [results] = await db.execute(sql, [school_code, date, type]);

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Get Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// CHECK single attendance record (for given person + date + type)
const checkAttendance = async (req, res) => {
  const { school_code, person_id, date, type } = req.query;
  if (!school_code || !person_id || !date || !type) {
    return res.status(400).json({ success: false, message: "school_code, person_id, date and type are required" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT * FROM attendance WHERE school_code=? AND person_id=? AND date=? AND person_type=? LIMIT 1",
      [school_code, person_id, date, type]
    );

    if (rows.length === 0) return res.status(200).json({ success: true, exists: false });
    return res.status(200).json({ success: true, exists: true, record: rows[0] });
  } catch (error) {
    console.error("Check Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Summary for one person
const getAttendanceSummary = async (req, res) => {
  const { school_code, personId } = req.params;
  if (!school_code || !personId) {
    return res.status(400).json({ success: false, message: "school_code and personId are required" });
  }

  try {
    const [results] = await db.execute(
      "SELECT status, COUNT(*) AS count FROM attendance WHERE school_code=? AND person_id=? GROUP BY status",
      [school_code, personId]
    );
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  addAttendance,
  updateAttendance,
  getAttendanceByDateAndType,
  checkAttendance,
  getAttendanceSummary,
};
