const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "aupluse-secret-key");

    const rows = await db`
      SELECT u.id, u.username, u.email, u.role, f.faculty_code
      FROM users u
      LEFT JOIN faculty f ON f.user_id = u.id
      WHERE u.id = ${decoded.userId}
    `;

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

module.exports = authMiddleware;
