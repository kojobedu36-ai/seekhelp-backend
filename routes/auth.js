const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await pool.query(
      "INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [username, email, hash]
    );

    res.json(user.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM Users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
