const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const pool = require("./config/db"); // ✅ Import the MySQL pool

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

// ✅ Serve uploads folder publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/schools", require("./routes/schoolRoutes"));
app.use("/api/teachers", require("./routes/TeacherRoutes"));
app.use("/api/students", require("./routes/StudentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRouter"));

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
