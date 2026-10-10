const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const createToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, role = "customer" } = req.body || {};

    if (typeof full_name !== "string" || !full_name.trim() || full_name.trim().length > 120
      || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || typeof password !== "string" || password.length < 8 || password.length > 72
      || (phone != null && (typeof phone !== "string" || phone.trim().length > 30))) {
      return res.status(400).json({ message: "Enter a name, valid email, and password of 8 to 72 characters" });
    }
    if (!["customer", "manager", "driver"].includes(role)) {
      return res.status(403).json({ message: "Public registration cannot create admin accounts" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existingUsers.length) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    // Passwords are hashed before storage so the database never stores plain text passwords.
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name.trim(), normalizedEmail, typeof phone === "string" && phone.trim() ? phone.trim() : null, hashedPassword, role, role === "customer" ? "active" : "inactive"]
    );

    const user = { id: result.insertId, full_name: full_name.trim(), email: normalizedEmail, phone: typeof phone === "string" && phone.trim() ? phone.trim() : null, role, status: role === "customer" ? "active" : "inactive" };
    if (role !== "customer") {
      return res.status(202).json({
        message: "Staff registration submitted. An administrator must activate the account before it can sign in.",
        user,
        pendingApproval: true
      });
    }
    res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    console.error("Registration failed:", error.message);
    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [String(email).trim().toLowerCase()]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "This account is not active" });
    }

    delete user.password;
    res.json({ user, token: createToken(user) });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
};

const me = (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, me };
