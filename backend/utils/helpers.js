const UserData = require("../models/userData");

function isUUID(query) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(query);
}
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createRegex(input, useCaseInsensitive = false) {
  return new RegExp(`^${escapeRegex(input)}$`, useCaseInsensitive ? "i" : "");
}

function logConciseError(context, error) {
  const errMsg =
    (error.response && (error.response.data?.error || error.response.data)) ||
    error.message ||
    error.toString();
  console.error(`${context}: ${errMsg}`);
}


async function checkAndUpdateUserName(userId, newName) {
  let user = await UserData.findOne({ user_id: userId });
  if (!user) {
    user = new UserData({ user_id: userId, username: newName });
    await user.save();
  } else if (user.username !== newName) {
    let oldList = user.oldusername ? user.oldusername.trim() : "";
    oldList = oldList ? `${oldList}, ${user.username}` : user.username;
    user.username = newName;
    user.oldusername = oldList;
    await user.save();
  }
  return user;
}

module.exports = {
  isUUID,
  checkAndUpdateUserName,
  escapeRegex,
  createRegex,
  logConciseError,
};
