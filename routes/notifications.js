const express = require("express");
const pool = require("../db");
const router = express.Router();

// Get notifications for a user (with actor name + timestamp)
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT n.notification_id, n.type, n.source_id, n.read_status, 
              n.created_at,
              u.username AS actor_name
       FROM Notifications n
       LEFT JOIN Users u ON n.triggered_by = u.user_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark a single notification as read
router.post("/markRead", async (req, res) => {
  const { notification_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE Notifications SET read_status=true WHERE notification_id=$1 RETURNING *",
      [notification_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark all notifications as read
router.post("/markAllRead", async (req, res) => {
  const { user_id } = req.body;
  try {
    await pool.query("UPDATE Notifications SET read_status=true WHERE user_id=$1", [user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
