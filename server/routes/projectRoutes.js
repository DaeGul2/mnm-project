// server/routes/projectRoutes.js
const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const projectAuth = require("../middlewares/projectAuth");
const evalRoundController = require("../controllers/evalRoundController");

// 프로젝트 생성
// POST /api/projects
router.post("/", projectController.createProject);

// 프로젝트 목록
// GET /api/projects
router.get("/", projectController.listProjects);

// 프로젝트 단건 조회
// GET /api/projects/:id
router.get("/:id", projectController.getProject);

// 프로젝트 비밀번호 검증 → 토큰 발급
// POST /api/projects/:id/unlock
router.post("/:id/unlock", projectController.unlockProject);

// 특정 프로젝트에 속한 전형 목록
// GET /api/projects/:projectId/rounds
router.get(
  "/:projectId/rounds",
  projectAuth,
  evalRoundController.listRoundsByProject
);

// 특정 프로젝트에 새 전형 생성
// POST /api/projects/:projectId/rounds
router.post(
  "/:projectId/rounds",
  projectAuth,
  evalRoundController.createRoundForProject
);

// 프로젝트 수정
// PUT /api/projects/:id
router.put("/:id", projectAuth, projectController.updateProject);

// 프로젝트 삭제
// DELETE /api/projects/:id
router.delete("/:id", projectAuth, projectController.deleteProject);

module.exports = router;
