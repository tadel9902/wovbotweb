require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();
connectDB();

// ⚙️ CORS — chỉ cho phép domain thật của bạn (không bắt buộc, nhưng an toàn hơn)
app.use(cors({
  origin: ["https://wovbot.online", "http://localhost:5500","http://127.0.0.1:5500"], // cho dev và production
  credentials: true
}));

app.use(express.json());

// ✅ Serve frontend (sau khi build)
app.use(express.static(path.join(__dirname, "public"))); // đổi "public" thành thư mục build thật (VD: dist hoặc build)

// ✅ API routes
app.get("/api", (req, res) => res.send("Backend API OK"));
app.use("/api/user", require("./routes/userRoutes"));

// ✅ Fallback cho frontend SPA (React/Vue/HTML)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // hoặc dist/index.html
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
