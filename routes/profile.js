const express = require("express");
const pool = require("../db");
const router = express.Router();

// Get user profile with posts + follower/following counts
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const userResult = await pool.query(
      "SELECT user_id, username, email, bio, avatar_url, created_at FROM Users WHERE user_id=$1",
      [userId]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const postsResult = await pool.query(
      "SELECT post_id, content, created_at FROM Posts WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );

    const followersRes = await pool.query(
      "SELECT COUNT(*) FROM Follows WHERE following_id=$1",
      [userId]
    );
    const followingRes = await pool.query(
      "SELECT COUNT(*) FROM Follows WHERE follower_id=$1",
      [userId]
    );

    const profileData = {
      ...userResult.rows[0],
      posts: postsResult.rows,
      followers_count: parseInt(followersRes.rows[0].count, 10),
      following_count: parseInt(followingRes.rows[0].count, 10),
    };

    res.json(profileData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update profile (bio + avatar)
router.post("/update", async (req, res) => {
  const { user_id, bio, avatar_url } = req.body;
  try {
    const result = await pool.query(
      "UPDATE Users SET bio=$1, avatar_url=$2 WHERE user_id=$3 RETURNING *",
      [bio, avatar_url, user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Followers list
router.get("/:userId/followers", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.avatar_url
       FROM Follows f
       JOIN Users u ON f.follower_id = u.user_id
       WHERE f.following_id=$1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Following list
router.get("/:userId/following", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.avatar_url
       FROM Follows f
       JOIN Users u ON f.following_id = u.user_id
       WHERE f.follower_id=$1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mutual followers
router.get("/mutual/:userA/:userB", async (req, res) => {
  const { userA, userB } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.avatar_url
       FROM Follows f
       JOIN Users u ON f.follower_id = u.user_id
       WHERE f.following_id=$1
       AND f.follower_id IN (
         SELECT follower_id FROM Follows WHERE following_id=$2
       )`,
      [userA, userB]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
