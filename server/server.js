const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { sequelize } = require("./db");
const db = require("./models"); // 🔹 모델 불러서 associations까지 로딩

const apiRoutes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 라우트
app.use("/api", apiRoutes);

// 기본 루트
app.get("/", (req, res) => {
  res.send("Eval Wizard API server running");
});

// DB 연결 확인 후 서버 시작
sequelize
  .authenticate()
  .then(async () => {
    console.log("✅ DB 연결 성공");
    // 개발 단계에서만
    // await db.sequelize.sync({ alter: true }); // { alter: true } 옵션은 상황 봐서
    console.log("✅ DB sync 완료");
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB 연결 실패:", err);
  });