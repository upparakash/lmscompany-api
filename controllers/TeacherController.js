const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
// ✅ Teacher Login
const jwt = require("jsonwebtoken");
// Save uploaded photo to /uploads folder
const saveImage = (file) => {
  if (!file) return null;
  const fileName = `teacher_${Date.now()}.png`;
  const uploadPath = path.join(__dirname, "..", "uploads", fileName);
  fs.writeFileSync(uploadPath, file.buffer);
  return `/uploads/${fileName}`;
};

// ✅ POST: Add Teacher
exports.addTeacher = async (req, res) => {
  try {
    const {
      fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, password, schoolCode
    } = req.body;

    // Check employee ID uniqueness
    const [existingEmp] = await db.query(
      "SELECT id FROM teachers WHERE employeeid = ? AND schoolCode = ?",
      [employeeid, schoolCode]
    );

    if (existingEmp.length > 0) {
      return res.status(400).json({ success: false, message: "Employee ID already exists in this school" });
    }

    // Check email uniqueness
    const [existingEmail] = await db.query(
      "SELECT id FROM teachers WHERE email = ? AND schoolCode = ?",
      [email, schoolCode]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists in this school" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoUrl = saveImage(req.file);

    const sql = `
      INSERT INTO teachers (fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, password, photo, schoolCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, hashedPassword, photoUrl, schoolCode
    ]);

    res.json({ success: true, message: "Teacher added successfully" });
  } catch (err) {
    console.error("Add Teacher Error:", err);
    res.status(500).json({ message: "Server Error", error: err });
  }
};

// ✅ GET: Fetch Teachers
exports.getTeachers = async (req, res) => {
  try {
    const { school_code } = req.query;

    if (!school_code) {
      return res.status(400).json({ success: false, message: "school_code required" });
    }

    const [rows] = await db.query(
      `SELECT id, fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, photo, schoolCode
      FROM teachers WHERE schoolCode = ?`,
      [school_code]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Fetch Teacher Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ✅ PUT: Update Teacher
exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email
    } = req.body;

    // Get old teacher data
    const [[oldTeacher]] = await db.query("SELECT photo FROM teachers WHERE id = ?", [id]);

    if (!oldTeacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Save new photo if uploaded
    let newPhoto = oldTeacher.photo;
    if (req.file) {
      newPhoto = saveImage(req.file);

      // Delete old image
      if (oldTeacher.photo) {
        const oldPath = path.join(__dirname, "..", oldTeacher.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const sql = `
      UPDATE teachers
      SET fullname = ?, subject = ?, qualification = ?, experience = ?, dateofbirth = ?,
      mobileNo = ?, employeeid = ?, presentAddress = ?, email = ?, photo = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, newPhoto, id
    ]);

    res.json({ success: true, message: "Teacher updated successfully" });
  } catch (err) {
    console.error("Update Teacher Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ❌ DELETE: Remove Teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Get photo path to delete from local storage
    const [[teacher]] = await db.query("SELECT photo FROM teachers WHERE id = ?", [id]);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Delete image
    if (teacher.photo) {
      const imagePath = path.join(__dirname, "..", teacher.photo);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await db.query("DELETE FROM teachers WHERE id = ?", [id]);

    res.json({ success: true, message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("Delete Teacher Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



exports.teacherLogin = async (req, res) => {
  try {
    const { email, password, schoolCode } = req.body;

    if (!email || !password || !schoolCode) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check Teacher Exists
    const [result] = await db.query(
      "SELECT id, fullname, email, password, employeeid, schoolCode FROM teachers WHERE email = ? AND schoolCode = ?",
      [email, schoolCode]
    );

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid Email or School Code" });
    }

    const teacher = result[0];

    // Validate Password
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect Password" });
    }

    // Create JWT Token
    const token = jwt.sign(
      {
        id: teacher.id,
        email: teacher.email,
        employeeid: teacher.employeeid,
        schoolCode: teacher.schoolCode,
      },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login Successful",
      token,
      data: {
        id: teacher.id,
        fullname: teacher.fullname,
        email: teacher.email,
        employeeid: teacher.employeeid,
        schoolCode: teacher.schoolCode,
      }
    });

  } catch (err) {
    console.error("Teacher Login Error:", err);
    return res.status(500).json({ success: false, message: "Server Error", error: err });
  }
};


// ✅ GET: Teacher Profile (Protected)
exports.getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.id; // from auth middleware

    const [rows] = await db.query(
      `SELECT id, fullname, subject, qualification, experience, dateofbirth,
      mobileNo, employeeid, presentAddress, email, photo, schoolCode
      FROM teachers WHERE id = ?`,
      [teacherId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get Teacher Profile Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// controllers/teacherController.js (append below existing exports)

exports.updateTeacherProfile = async (req, res) => {
  try {
    // req.user set by auth middleware (JWT)
    const teacherId = req.user?.id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Allowed fields only (editable)
    const {
      fullname,
      subject,
      qualification,
      experience,
      dateofbirth,
      mobileNo,
      presentAddress,
    } = req.body;

    // Get old teacher (to fetch old photo path)
    const [[oldRow]] = await db.query("SELECT photo FROM teachers WHERE id = ?", [teacherId]);
    if (!oldRow) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    let newPhoto = oldRow.photo;

    // If a new file uploaded, save and delete old
    if (req.file) {
      // saveImage expects file with buffer (your helper does fs.writeFileSync(file.buffer))
      const photoUrl = saveImage(req.file);

      // delete old file if exists
      if (oldRow.photo) {
        const oldPath = path.join(__dirname, "..", oldRow.photo);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn("Could not delete old photo", e); }
        }
      }

      newPhoto = photoUrl;
    }

    // Build SQL update, only update allowed fields (do not change email/employeeid/schoolCode)
    const sql = `
      UPDATE teachers
      SET fullname = ?, subject = ?, qualification = ?, experience = ?, dateofbirth = ?,
          mobileNo = ?, presentAddress = ?, photo = ?
      WHERE id = ?
    `;

    await db.query(sql, [
      fullname || null,
      subject || null,
      qualification || null,
      experience || null,
      dateofbirth || null,
      mobileNo || null,
      presentAddress || null,
      newPhoto,
      teacherId
    ]);

    // Return fresh profile
    const [rows] = await db.query(
      `SELECT id, fullname, subject, qualification, experience, dateofbirth,
              mobileNo, employeeid, presentAddress, email, photo, schoolCode
       FROM teachers WHERE id = ?`,
      [teacherId]
    );

    if (!rows || rows.length === 0) {
      return res.status(500).json({ success: false, message: "Failed to fetch updated profile" });
    }

    res.json({ success: true, message: "Profile updated successfully", data: rows[0] });
  } catch (err) {
    console.error("Update Teacher Profile Error:", err);
    res.status(500).json({ success: false, message: "Server Error", error: err.message || err });
  }
};

