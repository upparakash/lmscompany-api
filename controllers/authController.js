const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// POST /api/auth/register
exports.register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT * FROM company_admins WHERE email = ?",
      [email]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into DB
    await pool.query(
      "INSERT INTO company_admins (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM company_admins WHERE email = ?",
      [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/admins
exports.getAdmins = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, email FROM company_admins");
    res.json({ admins: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// PUT /api/auth/update-password
exports.updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return res.status(400).json({ message: "Email and newPassword required" });

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in DB
    const [result] = await pool.query(
      "UPDATE company_admins SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
