require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
connectDB();


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Backend OK"));

const userRoutesModule = require("./routes/userRoutes");
console.log("userRoutesModule type:", typeof userRoutesModule);
console.log("userRoutesModule keys:", Object.keys(userRoutesModule));

app.use("/api/user", userRoutesModule);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));