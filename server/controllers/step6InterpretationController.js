// server/controllers/step6InterpretationController.js
const {
  generateStep6InterpretationHtml,
} = require("../services/step6InterpretationService");

async function autoInterpretation(req, res) {
  try {
    const {
      projectName,
      stageName,
      section,
      groupName = null,
      payload,
    } = req.body || {};

    if (!section) {
      return res.status(400).json({ error: "section 값은 필수입니다." });
    }
    if (!payload) {
      return res.status(400).json({ error: "payload가 필요합니다." });
    }

    const html = await generateStep6InterpretationHtml({
      projectName: projectName || null,
      stageName: stageName || null,
      section,
      groupName,
      payload,
    });

    return res.json({ html });
  } catch (err) {
    console.error("[STEP6 AUTO INTERPRETATION ERROR]", err);
    return res.status(500).json({
      error: "자동 해석 생성 중 오류가 발생했습니다.",
      detail: err.message,
    });
  }
}

module.exports = {
  autoInterpretation,
};
