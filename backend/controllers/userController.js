
const axios = require("axios");
const { API_URL, API_KEY } = require("../config/apiConfig");
const { isUUID, checkAndUpdateUserName } = require("../utils/helpers");

// Hàm gọi Wolvesville API để lấy thông tin player
async function fetchPlayerInfo(query) {
  const headers = {
    Authorization: API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Nếu query là UUID thì gọi API theo ID, ngược lại thì search theo username
  const url = isUUID(query)
    ? `${API_URL}players/${query}`
    : `${API_URL}players/search?username=${query}`;

  const res = await axios.get(url, { headers });

  // Nếu query là username → API trả về mảng → lấy phần tử đầu tiên
  if (!isUUID(query) && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0];
  }

  return res.data;
}

// Export ra cho routes dùng
module.exports = {
  fetchPlayerInfo,
  checkAndUpdateUserName, // lấy từ helpers
};