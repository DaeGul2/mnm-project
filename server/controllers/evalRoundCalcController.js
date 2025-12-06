// server/controllers/evalRoundCalcController.js
const db = require("../models");

const { EvalRound, EvalRoundCalc } = db;

/**
 * 유틸: 전형 + 권한 체크
 */
async function findRoundWithAuth(roundId, tokenProjectId) {
  const round = await EvalRound.findByPk(roundId);
  if (!round) {
    const error = new Error("NOT_FOUND");
    error.statusCode = 404;
    error.payload = { message: "전형을 찾을 수 없습니다." };
    throw error;
  }

  if (!tokenProjectId || Number(tokenProjectId) !== Number(round.project_id)) {
    const error = new Error("FORBIDDEN");
    error.statusCode = 403;
    error.payload = { message: "이 전형에 접근할 권한이 없습니다." };
    throw error;
  }

  return round;
}

/**
 * Step6 계산 결과 조회
 * GET /api/rounds/:id/calc
 *
 * - 해당 전형에 대한 EvalRoundCalc 레코드가 있으면 그대로 반환
 * - 없으면 404 반환
 *   → 클라이언트에서 이 경우 "직접 계산 후 PUT /api/rounds/:id/calc" 호출
 */
exports.getCalcForRound = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenProjectId = req.projectId;

    // 전형 존재 & 권한 체크
    await findRoundWithAuth(id, tokenProjectId);

    const calc = await EvalRoundCalc.findOne({
      where: { eval_round_id: id },
    });

    if (!calc) {
      return res.status(404).json({
        message: "저장된 Step6 계산 결과가 없습니다.",
      });
    }

    const plain = calc.toJSON();

    return res.json({
      calc: {
        id: plain.id,
        eval_round_id: plain.eval_round_id,
        name: plain.name,
        config: plain.config_json,
        stats: plain.stats_json,
        schema_version: plain.schema_version,
        calculated_at: plain.calculated_at,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("getCalcForRound error:", err);
    return res
      .status(500)
      .json({ message: "Step6 계산 결과 조회 중 오류가 발생했습니다." });
  }
};

/**
 * Step6 계산 결과 저장/업데이트
 * PUT /api/rounds/:id/calc
 *
 * body:
 * {
 *   name?: string,             // 레코드 이름 (예: "기본 분석")
 *   config: {...},             // Step6 설정 (styleConfig, includedFieldsByGroup, groupOrder 등)
 *   stats: {...}               // Step6 계산 결과 (crossGroupSummary, groups 등)
 * }
 *
 * - 해당 전형의 EvalRoundCalc 레코드가 없으면 새로 생성
 * - 있으면 덮어쓰기 (config, stats, name, calculated_at)
 */
exports.saveCalcForRound = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const tokenProjectId = req.projectId;
    const { name, config, stats } = req.body;

    // 전형 존재 & 권한 체크
    const round = await findRoundWithAuth(id, tokenProjectId);

    if (!config || typeof config !== "object") {
      await t.rollback();
      return res.status(400).json({
        message: "config 필드는 객체 형태로 필수입니다.",
      });
    }

    if (!stats || typeof stats !== "object") {
      await t.rollback();
      return res.status(400).json({
        message: "stats 필드는 객체 형태로 필수입니다.",
      });
    }

    const existing = await EvalRoundCalc.findOne({
      where: { eval_round_id: round.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const now = new Date();
    const payload = {
      eval_round_id: round.id,
      name: name && String(name).trim().length > 0 ? String(name).trim() : "기본 분석",
      config_json: config,
      stats_json: stats,
      schema_version: "v1",
      calculated_at: now,
    };

    let calc;
    let isNew = false;

    if (!existing) {
      calc = await EvalRoundCalc.create(payload, { transaction: t });
      isNew = true;
    } else {
      await existing.update(payload, { transaction: t });
      calc = existing;
    }

    await t.commit();

    const plain = calc.toJSON();

    return res.json({
      message: isNew
        ? "Step6 계산 결과가 새로 저장되었습니다."
        : "Step6 계산 결과가 업데이트되었습니다.",
      calc: {
        id: plain.id,
        eval_round_id: plain.eval_round_id,
        name: plain.name,
        config: plain.config_json,
        stats: plain.stats_json,
        schema_version: plain.schema_version,
        calculated_at: plain.calculated_at,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
      },
    });
  } catch (err) {
    await t.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("saveCalcForRound error:", err);
    return res
      .status(500)
      .json({ message: "Step6 계산 결과 저장 중 오류가 발생했습니다." });
  }
};

/**
 * Step6 계산 결과 삭제 (옵션)
 * DELETE /api/rounds/:id/calc
 *
 * - 필요 시, 캐시 초기화 용도로 사용
 */
exports.deleteCalcForRound = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const tokenProjectId = req.projectId;

    await findRoundWithAuth(id, tokenProjectId);

    const deletedCount = await EvalRoundCalc.destroy({
      where: { eval_round_id: id },
      transaction: t,
    });

    await t.commit();

    if (deletedCount === 0) {
      return res.status(404).json({
        message: "삭제할 Step6 계산 결과가 없습니다.",
      });
    }

    return res.json({
      message: "Step6 계산 결과가 삭제되었습니다.",
    });
  } catch (err) {
    await t.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("deleteCalcForRound error:", err);
    return res
      .status(500)
      .json({ message: "Step6 계산 결과 삭제 중 오류가 발생했습니다." });
  }
};
