const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// School Login
exports.schoolLogin = async (req, res) => {
  try {
    const { email, password, school_code } = req.body;

    if (!email || !password || !school_code) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if school exists
    const [schools] = await pool.query(
      "SELECT * FROM schools WHERE email = ? AND school_code = ?",
      [email, school_code]
    );

    if (schools.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid school code or email" });
    }

    const school = schools[0];

    // Check password
    const isMatch = await bcrypt.compare(password, school.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // Check if school is active
    if (!school.active) {
      return res.status(403).json({ success: false, message: "School account is deactivated" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: school.id,
        school_name: school.school_name,
        school_code: school.school_code,
        email: school.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      school: {
        id: school.id,
        school_name: school.school_name,
        school_code: school.school_code,
        email: school.email,
        account_type: school.account_type,
        education_type: school.education_type,
      },
    });
  } catch (err) {
    console.error("Error in schoolLogin:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
// Add new school
exports.addSchool = async (req, res) => {
  try {
    const {
      school_name,
      school_code,
      contact_number,
      account_type,
      education_type, // Added education_type
      email,
      password,
      active,
      active_date,
      deactive_date
    } = req.body;

    // Create full URL for uploaded logo
    const school_logo = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const [result] = await pool.query(
      `INSERT INTO schools
      (school_name, school_code, contact_number, account_type, education_type, email, password, active, active_date, deactive_date, school_logo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [school_name, school_code, contact_number, account_type, education_type || "school", email, hashedPassword, active || 1, active_date, deactive_date, school_logo]
    );

    res.status(201).json({ message: "School added successfully", school_id: result.insertId });
  } catch (err) {
    console.error("Error in addSchool:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all schools
exports.getSchools = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM schools ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error in getSchools:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get single school
exports.getSchool = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM schools WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "School not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error in getSchool:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update school
exports.updateSchool = async (req, res) => {
  const { id } = req.params;
  try {
    const {
      school_name,
      school_code,
      contact_number,
      account_type,
      education_type, // Added education_type
      email,
      password,
      active,
      active_date,
      deactive_date
    } = req.body;

    // If a new file is uploaded, create full URL, else keep existing logo
    const school_logo = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const [result] = await pool.query(
      `UPDATE schools SET 
        school_name=?, 
        school_code=?, 
        contact_number=?, 
        account_type=?, 
        education_type=?, 
        email=?, 
        password=IFNULL(?, password), 
        active=?, 
        active_date=?, 
        deactive_date=?, 
        school_logo=IFNULL(?, school_logo) 
      WHERE id=?`,
      [school_name, school_code, contact_number, account_type, education_type, email, hashedPassword, active, active_date, deactive_date, school_logo, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "School not found" });

    res.json({ message: "School updated successfully" });
  } catch (err) {
    console.error("Error in updateSchool:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete school
exports.deleteSchool = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM schools WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "School not found" });
    res.json({ message: "School deleted successfully" });
  } catch (err) {
    console.error("Error in deleteSchool:", err);
    res.status(500).json({ error: err.message });
  }
};