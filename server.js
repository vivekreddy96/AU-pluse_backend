const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/faculty", authMiddleware, roleMiddleware("faculty"), facultyRoutes);
app.use("/api/student", authMiddleware, roleMiddleware("student"), studentRoutes);
app.use("/api/attendance", authMiddleware, roleMiddleware("faculty"), attendanceRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AUPluse Backend is running"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "AUPluse API is working"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await db`SELECT 1 AS connected`;

    res.json({
      success: true,
      message: "AUPluse is connected to Neon PostgreSQL",
      database: result
    });
  } catch (error) {
    console.error("Database test error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AUPluse Backend running on http://localhost:${PORT}`);
});
