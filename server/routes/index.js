const express = require("express");
const router = express.Router();

const projectRoutes = require("./projectRoutes");
const evalRoundRoutes = require("./evalRoundRoutes");

// 헬스 체크
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 프로젝트 관련
router.use("/projects", projectRoutes);

// 전형 관련
router.use("/rounds", evalRoundRoutes);

module.exports = router;
