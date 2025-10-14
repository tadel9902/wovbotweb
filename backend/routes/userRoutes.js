const express = require("express");
const router = express.Router();
const UserData = require("../models/userData");
const {
  fetchPlayerInfo,
} = require("../controllers/userController");
const {
  checkAndUpdateUserName,
  escapeRegex,
  createRegex,
  logConciseError,
} = require("../utils/helpers");

// GET /api/user/search?username=abc  (giữ nguyên)
router.get("/search", async (req, res) => {
  const { username } = req.query;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Vui lòng nhập ít nhất 3 ký tự." });
  }
  try {
    const playerData = await fetchPlayerInfo(username);
    const userData = await checkAndUpdateUserName(playerData.id, playerData.username);
    return res.json({
      player: playerData,
      history: { oldusername: userData.oldusername || "" },
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm user:", error.message);
    return res.status(404).json({ error: `Không tìm thấy người dùng "${username}".` });
  }
});

// GET /api/user/search-old?query=abc  (mới)
router.get("/search-old", async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 3) {
    return res.status(400).json({ error: "Vui lòng nhập ít nhất 3 ký tự." });
  }

  try {
    const rxUser = createRegex(query);
    const rxOld = new RegExp(`(^|,\\s*)${escapeRegex(query)}(,|$)`);

    let userDatas = await UserData.find({
      $or: [{ username: rxUser }, { oldusername: rxOld }],
    }).lean();

    // Không có trong DB → fallback API, đồng bộ DB
    if (userDatas.length === 0) {
      try {
        const apiUser = await fetchPlayerInfo(query);
        const user = await checkAndUpdateUserName(apiUser.id, apiUser.username);
        return res.json({
          users: [{
            user_id: user.user_id,
            username: user.username,
            history: { oldusername: user.oldusername || "" },
          }],
        });
      } catch (err) {
        logConciseError("oldusername fallback", err);
        return res.status(404).json({ error: `Không tìm thấy người dùng "${query}"` });
      }
    }

    // Có trong DB → đồng bộ lại với API
    const updatedUsers = [];
    for (const u of userDatas) {
      try {
        const apiUser = await fetchPlayerInfo(u.user_id); // by ID
        const updated = await checkAndUpdateUserName(apiUser.id, apiUser.username);
        updatedUsers.push({
          user_id: updated.user_id,
          username: updated.username,
          history: { oldusername: updated.oldusername || "" },
        });
      } catch (err) {
        logConciseError("sync oldusername", err);
        updatedUsers.push({
          user_id: u.user_id,
          username: u.username,
          history: { oldusername: u.oldusername || "" },
        });
      }
    }

    return res.json({ users: updatedUsers });
  } catch (err) {
    logConciseError("search-old route", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;