const express = require("express");
const router = express.Router();
const pool = require("../db");

// Follow a user
router.post("/follow", async (req, res) => {
  const { follower_id, following_id } = req.body;
  try {
    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [follower_id, following_id]
    );
    res.json({ success: true, message: "Followed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to follow" });
  }
});

// Unfollow a user
router.post("/unfollow", async (req, res) => {
  const { follower_id, following_id } = req.body;
  try {
    await pool.query(
      "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
      [follower_id, following_id]
    );
    res.json({ success: true, message: "Unfollowed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow" });
  }
});

// Check follow status
router.get("/status/:follower_id/:following_id", async (req, res) => {
  const { follower_id, following_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2",
      [follower_id, following_id]
    );
    res.json({ isFollowing: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check status" });
  }
});

module.exports = router;
