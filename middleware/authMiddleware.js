const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication token is missing" });
    }

    const token = authHeader.split(" ")[1];

    // JWT verification proves the request came from someone who logged in.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.query(
      "SELECT id, full_name, email, phone, role, status FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!users.length || users[0].status !== "active") {
      return res.status(401).json({ message: "User is not active or no longer exists" });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protect };
