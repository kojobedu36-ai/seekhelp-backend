const express = require("express");
const pool = require("../db");
const router = express.Router();

// ✅ Create a new post
router.post("/create", async (req, res) => {
  const { user_id, content } = req.body;
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

// ✅ Update a post
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const result = await pool.query(
      "UPDATE posts SET content=$1 WHERE post_id=$2 RETURNING *",
      [content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const io = req.app.get("io");
    io.emit("updatePost", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete a post
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM postlikes WHERE post_id=$1", [id]);
    await pool.query("DELETE FROM comments WHERE post_id=$1", [id]);
    await pool.query("DELETE FROM notifications WHERE source_id=$1 AND type IN ('like_post','comment_post')", [id]);

    const result = await pool.query("DELETE FROM posts WHERE post_id=$1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const io = req.app.get("io");
    io.emit("deletePost", { post_id: id });

    res.json({ message: "Post deleted successfully", post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Like a post
router.post("/like", async (req, res) => {
  const { user_id, post_id } = req.body;
  try {
    const like = await pool.query(
      `INSERT INTO postlikes (user_id, post_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, post_id) DO NOTHING 
       RETURNING *`,
      [user_id, post_id]
    );

    if (like.rows.length > 0) {
      const post = await pool.query("SELECT user_id FROM posts WHERE post_id=$1", [post_id]);
      const postOwner = post.rows[0].user_id;

      const notif = await pool.query(
        `INSERT INTO notifications (user_id, type, source_id, triggered_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [postOwner, "like_post", post_id, user_id]
      );

      const io = req.app.get("io");
      io.to(postOwner.toString()).emit("receiveNotification", notif.rows[0]);
      io.emit("newLike", { post_id, user_id });
    }

    res.json(like.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Comment on a post
router.post("/comment", async (req, res) => {
  const { user_id, post_id, content } = req.body;
  try {
    const comment = await pool.query(
      "INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *",
      [user_id, post_id, content]
    );

    const post = await pool.query("SELECT user_id FROM posts WHERE post_id=$1", [post_id]);
    const postOwner = post.rows[0].user_id;

    const notif = await pool.query(
      `INSERT INTO notifications (user_id, type, source_id, triggered_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [postOwner, "comment_post", comment.rows[0].comment_id, user_id]
    );

    const io = req.app.get("io");
    io.to(postOwner.toString()).emit("receiveNotification", notif.rows[0]);
    io.emit("newComment", { post_id, comment: comment.rows[0] });

    res.json(comment.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Like a comment
router.post("/likeComment", async (req, res) => {
  const { user_id, comment_id } = req.body;
  try {
    const like = await pool.query(
      `INSERT INTO commentlikes (user_id, comment_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, comment_id) DO NOTHING 
       RETURNING *`,
      [user_id, comment_id]
    );

    if (like.rows.length > 0) {
      const comment = await pool.query("SELECT user_id FROM comments WHERE comment_id=$1", [comment_id]);
      const commentOwner = comment.rows[0].user_id;

      const notif = await pool.query(
        `INSERT INTO notifications (user_id, type, source_id, triggered_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [commentOwner, "like_comment", comment_id, user_id]
      );

      const io = req.app.get("io");
      io.to(commentOwner.toString()).emit("receiveNotification", notif.rows[0]);
      io.emit("newLikeComment", { comment_id, user_id });
    }

    res.json(like.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Reply to a comment
router.post("/replyComment", async (req, res) => {
  const { user_id, comment_id, content } = req.body;
  try {
    const reply = await pool.query(
      "INSERT INTO commentreplies (user_id, comment_id, content) VALUES ($1, $2, $3) RETURNING *",
      [user_id, comment_id, content]
    );

    const comment = await pool.query("SELECT user_id FROM comments WHERE comment_id=$1", [comment_id]);
    const commentOwner = comment.rows[0].user_id;

    const notif = await pool.query(
      `INSERT INTO notifications (user_id, type, source_id, triggered_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [commentOwner, "reply_comment", reply.rows[0].reply_id, user_id]
    );

    const io = req.app.get("io");
    io.to(commentOwner.toString()).emit("receiveNotification", notif.rows[0]);
    io.emit("newReply", { comment_id, reply: reply.rows[0] });

    res.json(reply.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
