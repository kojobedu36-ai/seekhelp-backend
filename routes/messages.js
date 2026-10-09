const express = require("express");
const pool = require("../db");
const router = express.Router();

// Send a message
router.post("/send", async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Messages (sender_id, receiver_id, content, status) 
       VALUES ($1, $2, $3, 'sent') RETURNING *`,
      [sender_id, receiver_id, content]
    );

    // Insert into Notifications table
    const notif = await pool.query(
      `INSERT INTO Notifications (user_id, type, source_id, triggered_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [receiver_id, "message", result.rows[0].message_id, sender_id]
    );

    const sender = await pool.query("SELECT username FROM Users WHERE user_id=$1", [sender_id]);

    const io = req.app.get("io");
    // Emit to receiver's room
    io.to(receiver_id.toString()).emit("receiveNotification", {
      ...notif.rows[0],
      actor_name: sender.rows[0].username,
    });

    // Mark as delivered once pushed
    await pool.query(
      "UPDATE Messages SET status='delivered' WHERE message_id=$1",
      [result.rows[0].message_id]
    );
    io.to(sender_id.toString()).emit("messageDelivered", { message_id: result.rows[0].message_id });

    // Broadcast for real-time chat feed
    io.emit("newMessage", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update message status (accept/decline/seen)
router.post("/updateStatus", async (req, res) => {
  const { message_id, status } = req.body;
  try {
    const result = await pool.query(
      "UPDATE Messages SET status=$1 WHERE message_id=$2 RETURNING *",
      [status, message_id]
    );

    const io = req.app.get("io");
    if (status === "seen") {
      io.to(result.rows[0].sender_id.toString()).emit("messageSeen", {
        message_id: result.rows[0].message_id,
        receiver_id: result.rows[0].receiver_id,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get conversation between two users
router.get("/conversation/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM Messages 
       WHERE (sender_id=$1 AND receiver_id=$2) 
          OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at ASC`,
      [user1, user2]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
