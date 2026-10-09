const express = require("express");
const pool = require("../db");
const router = express.Router();

// Get last seen for a user
router.get("/lastSeen/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT last_seen FROM Users WHERE user_id=$1",
      [id]
    );
    res.json({ last_seen: result.rows[0]?.last_seen });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
