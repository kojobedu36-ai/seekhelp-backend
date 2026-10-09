const express = require("express");
const pool = require("../db");
const router = express.Router();

// Like a post
router.post("/post", async (req, res) => {
  const { user_id, post_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO PostLikes (user_id, post_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, post_id) DO NOTHING 
       RETURNING *`,
      [user_id, post_id]
    );
    res.json(result.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unlike a post
router.post("/post/unlike", async (req, res) => {
  const { user_id, post_id } = req.body;
  try {
    await pool.query("DELETE FROM PostLikes WHERE user_id=$1 AND post_id=$2", [user_id, post_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Like a comment
router.post("/comment", async (req, res) => {
  const { user_id, comment_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO CommentLikes (user_id, comment_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, comment_id) DO NOTHING 
       RETURNING *`,
      [user_id, comment_id]
    );
    res.json(result.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unlike a comment
router.post("/comment/unlike", async (req, res) => {
  const { user_id, comment_id } = req.body;
  try {
    await pool.query("DELETE FROM CommentLikes WHERE user_id=$1 AND comment_id=$2", [user_id, comment_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get likes count for a post
router.get("/post/:postId", async (req, res) => {
  const { postId } = req.params;
  try {
    const result = await pool.query("SELECT COUNT(*) FROM PostLikes WHERE post_id=$1", [postId]);
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get likes count for a comment
router.get("/comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  try {
    const result = await pool.query("SELECT COUNT(*) FROM CommentLikes WHERE comment_id=$1", [commentId]);
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
