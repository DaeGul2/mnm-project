// server/routes/step6Routes.js
const express = require("express");
const router = express.Router();

const {
  autoInterpretation,
} = require("../controllers/step6InterpretationController");
const projectAuth = require("../middlewares/projectAuth"); // 🔹 추가

// POST /api/step6/interpretations/auto
router.post("/interpretations/auto", projectAuth, autoInterpretation); // 🔹 여기도 수정

module.exports = router;
