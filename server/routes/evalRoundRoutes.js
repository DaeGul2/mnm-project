// server/routes/evalRoundRoutes.js
const express = require("express");
const router = express.Router();

const evalRoundController = require("../controllers/evalRoundController");
const evalRoundCalcController = require("../controllers/evalRoundCalcController");
const evalRoundReportController = require("../controllers/evalRoundReportController");
const projectAuth = require("../middlewares/projectAuth");

// 전형 상세 + 행 데이터 조회
// GET /api/rounds/:id
router.get("/:id", projectAuth, evalRoundController.getRoundDetail);

// Step6 계산 결과 조회
// GET /api/rounds/:id/calc
router.get(
  "/:id/calc",
  projectAuth,
  evalRoundCalcController.getCalcForRound
);

// Step6 계산 결과 저장/업데이트
// PUT /api/rounds/:id/calc
router.put(
  "/:id/calc",
  projectAuth,
  evalRoundCalcController.saveCalcForRound
);

// Step6 계산 결과 삭제 (옵션)
// DELETE /api/rounds/:id/calc
router.delete(
  "/:id/calc",
  projectAuth,
  evalRoundCalcController.deleteCalcForRound
);

// GPT 리포트 목록 조회
// GET /api/rounds/:id/reports
router.get(
  "/:id/reports",
  projectAuth,
  evalRoundReportController.listReportsForRound
);

// GPT 리포트 생성
// POST /api/rounds/:id/reports
router.post(
  "/:id/reports",
  projectAuth,
  evalRoundReportController.createReportForRound
);

// GPT 리포트 수정
// PUT /api/rounds/:id/reports/:reportId
router.put(
  "/:id/reports/:reportId",
  projectAuth,
  evalRoundReportController.updateReportForRound
);

// GPT 리포트 삭제
// DELETE /api/rounds/:id/reports/:reportId
router.delete(
  "/:id/reports/:reportId",
  projectAuth,
  evalRoundReportController.deleteReportForRound
);

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
