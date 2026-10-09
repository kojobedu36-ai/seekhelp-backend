const express = require("express");
const pool = require("../db");
const router = express.Router();

// Like a post
router.post("/like", async (req, res) => {
  const { user_id, post_id } = req.body;
  try {
    const like = await pool.query(
      `INSERT INTO PostLikes (user_id, post_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, post_id) DO NOTHING 
       RETURNING *`,
      [user_id, post_id]
    );

    if (like.rows.length > 0) {
      const post = await pool.query("SELECT user_id FROM Posts WHERE post_id=$1", [post_id]);
      const postOwner = post.rows[0].user_id;

      const notif = await pool.query(
        `INSERT INTO Notifications (user_id, type, source_id, triggered_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [postOwner, "like_post", post_id, user_id]
      );

      const io = req.app.get("io");
      io.to(postOwner.toString()).emit("receiveNotification", notif.rows[0]);
      io.emit("newLike", { post_id, user_id }); // real-time feed update
    }

    res.json(like.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Comment on a post
router.post("/comment", async (req, res) => {
  const { user_id, post_id, content } = req.body;
  try {
    const comment = await pool.query(
      "INSERT INTO Comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *",
      [user_id, post_id, content]
    );

    const post = await pool.query("SELECT user_id FROM Posts WHERE post_id=$1", [post_id]);
    const postOwner = post.rows[0].user_id;

    const notif = await pool.query(
      `INSERT INTO Notifications (user_id, type, source_id, triggered_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [postOwner, "comment_post", comment.rows[0].comment_id, user_id]
    );

    const io = req.app.get("io");
    io.to(postOwner.toString()).emit("receiveNotification", notif.rows[0]);
    io.emit("newComment", { post_id, comment: comment.rows[0] }); // real-time feed update

    res.json(comment.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Like a comment
router.post("/likeComment", async (req, res) => {
  const { user_id, comment_id } = req.body;
  try {
    const like = await pool.query(
      `INSERT INTO CommentLikes (user_id, comment_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, comment_id) DO NOTHING 
       RETURNING *`,
      [user_id, comment_id]
    );

    if (like.rows.length > 0) {
      const comment = await pool.query("SELECT user_id FROM Comments WHERE comment_id=$1", [comment_id]);
      const commentOwner = comment.rows[0].user_id;

      const notif = await pool.query(
        `INSERT INTO Notifications (user_id, type, source_id, triggered_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [commentOwner, "like_comment", comment_id, user_id]
      );

      const io = req.app.get("io");
      io.to(commentOwner.toString()).emit("receiveNotification", notif.rows[0]);
      io.emit("newLikeComment", { comment_id, user_id }); // real-time feed update
    }

    res.json(like.rows[0] || { message: "Already liked" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reply to a comment
router.post("/replyComment", async (req, res) => {
  const { user_id, comment_id, content } = req.body;
  try {
    const reply = await pool.query(
      "INSERT INTO CommentReplies (user_id, comment_id, content) VALUES ($1, $2, $3) RETURNING *",
      [user_id, comment_id, content]
    );

    const comment = await pool.query("SELECT user_id FROM Comments WHERE comment_id=$1", [comment_id]);
    const commentOwner = comment.rows[0].user_id;

    const notif = await pool.query(
      `INSERT INTO Notifications (user_id, type, source_id, triggered_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [commentOwner, "reply_comment", reply.rows[0].reply_id, user_id]
    );

    const io = req.app.get("io");
    io.to(commentOwner.toString()).emit("receiveNotification", notif.rows[0]);
    io.emit("newReply", { comment_id, reply: reply.rows[0] }); // real-time feed update

    res.json(reply.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
