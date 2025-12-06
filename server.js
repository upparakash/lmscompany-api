const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve uploads folder publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/schools", require("./routes/schoolRoutes"));
// Routes
app.use("/api/teachers", require("./routes/TeacherRoutes"));
app.use("/api/students",require("./routes/StudentRoutes"));
app.use("/api/attendance", require("./routes/attendanceRouter"));
app.use("/api/class-teacher-assignment", require("./routes/ClassTeacherAssignmentRouter"));
app.use("/api/fee", require("./routes/feeRoutes"));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
