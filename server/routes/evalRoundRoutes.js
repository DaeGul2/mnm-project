// server/routes/evalRoundRoutes.js
const express = require("express");
const router = express.Router();

const evalRoundController = require("../controllers/evalRoundController");
const projectAuth = require("../middlewares/projectAuth");

// 전형 상세 + 행 데이터 조회
// GET /api/rounds/:id
router.get("/:id", projectAuth, evalRoundController.getRoundDetail);

// 전형 설정(JSON) 업데이트
// PUT /api/rounds/:id/config
router.put(
  "/:id/config",
  projectAuth,
  evalRoundController.updateRoundConfig
);

// 엑셀 데이터 통째로 갈아끼우기
// PUT /api/rounds/:id/replace-data
router.put(
  "/:id/replace-data",
  projectAuth,
  evalRoundController.replaceRoundData
);

// 전형 삭제 (해당 전형 + 관련 행 전체 삭제)
// DELETE /api/rounds/:id
router.delete("/:id", projectAuth, evalRoundController.deleteRound);

module.exports = router;
