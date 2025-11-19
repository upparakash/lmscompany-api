const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ✅ ADD THIS
// Save uploaded photo
const saveImage = (file) => {
  if (!file) return null;
  const fileName = `student_${Date.now()}.png`;
  const uploadPath = path.join(__dirname, "..", "uploads", fileName);
  fs.writeFileSync(uploadPath, file.buffer);
  return `/uploads/${fileName}`;
};

// 📍 ADD Student
exports.addStudent = async (req, res) => {
  try {
    const {
      fullname, admissionId, standard, section, dateofbirth,
      gender, contactNumber, address, email, password, schoolCode
    } = req.body;

    // Check duplicate admission based on school
    const [existing] = await db.query(
      "SELECT id FROM students WHERE admissionId = ? AND schoolCode = ?",
      [admissionId, schoolCode]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Admission ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoUrl = saveImage(req.file);

    const sql = `
      INSERT INTO students (fullname, admissionId, standard, section, dateofbirth, gender,
      contactNumber, address, email, password, photo, schoolCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      fullname, admissionId, standard, section, dateofbirth, gender,
      contactNumber, address, email, hashedPassword, photoUrl, schoolCode
    ]);

    res.json({ success: true, message: "Student added successfully" });
  } catch (err) {
    console.error("Add Student Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📍 GET Students
exports.getStudents = async (req, res) => {
  try {
    const { school_code } = req.query;

    if (!school_code)
      return res.status(400).json({ success: false, message: "school_code required" });

    const [rows] = await db.query(
      `SELECT id, fullname, admissionId, standard, section, dateofbirth, gender,
      contactNumber, address, email, photo, schoolCode
      FROM students WHERE schoolCode = ?`,
      [school_code]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Get Students Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📍 UPDATE Student
exports.updateStudent = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      fullname, admissionId, standard, section, dateofbirth,
      gender, contactNumber, address, email, schoolCode
    } = req.body;

    let photoUrl = null;

    if (req.file) {
      photoUrl = saveImage(req.file);
      const [[old]] = await db.query("SELECT photo FROM students WHERE id = ?", [id]);
      if (old?.photo) {
        const oldPath = path.join(__dirname, "..", old.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const sql = `
      UPDATE students SET fullname=?, admissionId=?, standard=?, section=?, dateofbirth=?, gender=?,
      contactNumber=?, address=?, email=?, photo=COALESCE(?, photo), schoolCode=?
      WHERE id=?
    `;

    await db.query(sql, [
      fullname, admissionId, standard, section, dateofbirth, gender,
      contactNumber, address, email, photoUrl, schoolCode, id
    ]);

    res.json({ success: true, message: "Student updated successfully" });
  } catch (err) {
    console.error("Update Student Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📍 DELETE Student
exports.deleteStudent = async (req, res) => {
  try {
    const id = req.params.id;

    const [[student]] = await db.query("SELECT photo FROM students WHERE id=?", [id]);

    if (!student) return res.status(404).json({ success: false, message: "Not found" });

    if (student.photo) {
      const filePath = path.join(__dirname, "..", student.photo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM students WHERE id=?", [id]);

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete Student Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.studentLogin = async (req, res) => {
  try {
    console.log("Login Request Body:", req.body);

    const { admissionId, password, schoolCode } = req.body;

    if (!admissionId || !password || !schoolCode) {
      console.log("Missing fields");
      return res.status(400).json({
        success: false,
        message: "Admission ID, Password & School Code are required"
      });
    }

    console.log("Checking student in DB...");

    const [rows] = await db.query(
      "SELECT id, fullname, admissionId, password, schoolCode FROM students WHERE admissionId = ? AND schoolCode = ?",
      [admissionId, schoolCode]
    );

    console.log("DB Result:", rows);

    if (rows.length === 0) {
      console.log("No student found");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const student = rows[0];
    console.log("Student Found:", student);

    const isMatch = await bcrypt.compare(password, student.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      console.log("Password does not match");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: student.id,
        admissionId: student.admissionId,
        schoolCode: student.schoolCode
      },
      process.env.JWT_SECRET || "STUDENT_SECRET_KEY",
      { expiresIn: "7d" }
    );

    console.log("Token Generated");

    res.json({
      success: true,
      message: "Login successful",
      token,
      student: {
        id: student.id,
        fullname: student.fullname,
        admissionId: student.admissionId,
        schoolCode: student.schoolCode
      }
    });

  } catch (err) {
    console.error("Student Login Error:", err.message, err.stack);
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ✅ Get Logged-in Student Profile
exports.studentProfile = async (req, res) => {
  try {
    const { admissionId, schoolCode } = req.user; // comes from JWT

    const [student] = await db.query(
      "SELECT fullname, admissionId, standard, section, dateofbirth, gender, contactNumber, address, email, photo, schoolCode FROM students WHERE admissionId = ? AND schoolCode = ?",
      [admissionId, schoolCode]
    );

    if (student.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, data: student[0] });
  } catch (err) {
    console.error("Student Profile Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.searchStudents = async (req, res) => {
  try {
    const { query, schoolCode } = req.query;

    if (!query || !schoolCode) {
      return res.status(400).json({
        success: false,
        message: "query & schoolCode required"
      });
    }

    const search = `%${query}%`;

    const [rows] = await db.query(
      `SELECT id, fullname, admissionId, contactNumber, email, photo 
       FROM students 
       WHERE schoolCode = ?
       AND (
            admissionId LIKE ?
            OR fullname LIKE ?
            OR contactNumber LIKE ?
            OR email LIKE ?
       )`,
      [schoolCode, search, search, search, search]
    );

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("Search Students Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
