const express = require("express");
const pool = require("../db");
const router = express.Router();
const authenticate = require("../middleware/auth"); // ✅ import JWT middleware

// ✅ Create a new post (protected)
router.post("/create", authenticate, async (req, res) => {
  const { content } = req.body;
  const user_id = req.user.user_id; // comes from JWT
  try {
    const result = await pool.query(
      "INSERT INTO posts (user_id, content, created_at) VALUES ($1, $2, NOW()) RETURNING *",
      [user_id, content]
    );

    const io = req.app.get("io");
    io.emit("newPost", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get all posts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update a post (protected)
router.put("/update/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      "UPDATE posts SET content=$1 WHERE post_id=$2 AND user_id=$3 RETURNING *",
      [content, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found or not owned by you" });
    }

    const io = req.app.get("io");
    io.emit("updatePost", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete a post (protected)
router.delete("/delete/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.user_id;

  try {
    await pool.query("DELETE FROM postlikes WHERE post_id=$1", [id]);
    await pool.query("DELETE FROM comments WHERE post_id=$1", [id]);
    await pool.query("DELETE FROM notifications WHERE source_id=$1 AND type IN ('like_post','comment_post')", [id]);

    const result = await pool.query(
      "DELETE FROM posts WHERE post_id=$1 AND user_id=$2 RETURNING *",
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found or not owned by you" });
    }

    const io = req.app.get("io");
    io.emit("deletePost", { post_id: id });

    res.json({ message: "Post deleted successfully", post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Export router so server.js can use it
module.exports = router;
