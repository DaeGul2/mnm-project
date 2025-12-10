const express = require("express");
const router = express.Router();

const projectRoutes = require("./projectRoutes");
const evalRoundRoutes = require("./evalRoundRoutes");
const step6Routes = require("./step6Routes");
// 헬스 체크
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 프로젝트 관련
router.use("/projects", projectRoutes);

// 전형 관련
router.use("/rounds", evalRoundRoutes);
router.use("/step6", step6Routes);
module.exports = router;
