const mongoose = require("mongoose");


const userDataSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  oldusername: { type: String, default: "" },
});


module.exports = mongoose.model("UserData", userDataSchema);
