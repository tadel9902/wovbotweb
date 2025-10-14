const axios = require('axios');
const UserData = require('../../models/UserData');
const { API_URL, API_KEY } = require('../../config/apiConfig');
const { isUUID } = require('../../utils/helpers');
const algoliasearch = require("algoliasearch").default;
const {
  ALGOLIA_APP_ID,
  ALGOLIA_SEARCH_KEY,
  ALGOLIA_INDEX_OLD_USER,
} = require("../../config/apiConfig");

// Khởi tạo Algolia client
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const oldUserIndex = algoliaClient.initIndex(ALGOLIA_INDEX_OLD_USER);

async function fetchPlayerInfo(query) {
    const headers = {
        Authorization: API_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    
    try {
        const url = isUUID(query)
            ? `${API_URL}players/${query}`
            : `${API_URL}players/search?username=${query}`;
            
        const res = await axios.get(url, { headers });
        
        if (!isUUID(query) && Array.isArray(res.data) && res.data.length > 0) {
            return res.data[0];
        }
        return res.data;
    } catch (error) {
        console.error("Error fetching player:", error);
        throw new Error(error.response?.data?.error || "Failed to fetch player data");
    }
}

async function searchByOldUsername(oldUsername) {
    try {
        // Tìm kiếm chính xác
        const queryRegexForUsername = new RegExp(`^${oldUsername}$`);
        const queryRegexForOldUsername = new RegExp(`(^|,\\s*)${oldUsername}(,|$)`);

        const users = await UserData.find({
            $or: [
                { username: queryRegexForUsername },
                { oldusername: queryRegexForOldUsername }
            ]
        }).lean();

        // Nếu không tìm thấy, thử tìm bằng Algolia
        if (users.length === 0) {
            const { hits } = await oldUserIndex.search(oldUsername, { hitsPerPage: 5 });
            if (hits.length > 0) {
                const playerData = await fetchPlayerInfo(hits[0].user_id);
                return [{ current: playerData, history: hits[0] }];
            }
            return [];
        }

        // Nếu tìm thấy trong DB, lấy thông tin hiện tại cho mỗi user
        const results = await Promise.all(users.map(async (user) => {
            const currentData = await fetchPlayerInfo(user.user_id);
            return {
                current: currentData,
                history: user
            };
        }));

        return results;
    } catch (error) {
        console.error("Error searching old username:", error);
        throw new Error("Failed to search by old username");
    }
}

async function checkAndUpdateUsername(userId, newUsername) {
    try {
        let user = await UserData.findOne({ user_id: userId });
        
        if (!user) {
            user = new UserData({ user_id: userId, username: newUsername });
            await user.save();
        } else if (user.username !== newUsername) {
            let oldList = user.oldusername ? user.oldusername.trim() : "";
            oldList = oldList ? `${oldList}, ${user.username}` : user.username;
            user.oldusername = oldList;
            user.username = newUsername;
            await user.save();
        }
        
        return user;
    } catch (error) {
        console.error("Error updating username:", error);
        throw new Error("Failed to update username");
    }
}

module.exports = {
    fetchPlayerInfo,
    searchByOldUsername,
    checkAndUpdateUsername
};