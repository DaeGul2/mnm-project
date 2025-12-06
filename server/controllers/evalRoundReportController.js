// server/controllers/evalRoundReportController.js
const db = require("../models");

const { EvalRound, EvalRoundReport } = db;

/**
 * 유틸: 전형 + 권한 체크 (중복 피하려고 여기서도 한 번 정의)
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
 * 특정 전형의 GPT 리포트 목록 조회
 * GET /api/rounds/:id/reports
 */
exports.listReportsForRound = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenProjectId = req.projectId;

    await findRoundWithAuth(id, tokenProjectId);

    const reports = await EvalRoundReport.findAll({
      where: { eval_round_id: id },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      reports: reports.map((r) => {
        const plain = r.toJSON();
        return {
          id: plain.id,
          eval_round_id: plain.eval_round_id,
          name: plain.name,
          report: plain.report_json,
          schema_version: plain.schema_version,
          generated_at: plain.generated_at,
          created_at: plain.createdAt,
          updated_at: plain.updatedAt,
        };
      }),
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("listReportsForRound error:", err);
    return res
      .status(500)
      .json({ message: "GPT 리포트 목록 조회 중 오류가 발생했습니다." });
  }
};

/**
 * 특정 전형에 GPT 리포트 새로 생성
 * POST /api/rounds/:id/reports
 *
 * body:
 * {
 *   name?: string,          // 리포트 이름 (예: "임원용 요약", "전체 상세 리포트")
 *   report: {...},          // GPT가 만든 보고서 JSON
 *   schema_version?: string // 기본값 "v1"
 * }
 */
exports.createReportForRound = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const tokenProjectId = req.projectId;
    const { name, report, schema_version } = req.body;

    const round = await findRoundWithAuth(id, tokenProjectId);

    if (!report || typeof report !== "object") {
      await t.rollback();
      return res.status(400).json({
        message: "report 필드는 객체 형태로 필수입니다.",
      });
    }

    const payload = {
      eval_round_id: round.id,
      name:
        name && String(name).trim().length > 0
          ? String(name).trim()
          : "기본 리포트",
      report_json: report,
      schema_version: schema_version || "v1",
      generated_at: new Date(),
    };

    const created = await EvalRoundReport.create(payload, {
      transaction: t,
    });

    await t.commit();

    const plain = created.toJSON();

    return res.status(201).json({
      message: "GPT 리포트가 생성되었습니다.",
      report: {
        id: plain.id,
        eval_round_id: plain.eval_round_id,
        name: plain.name,
        report: plain.report_json,
        schema_version: plain.schema_version,
        generated_at: plain.generated_at,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
      },
    });
  } catch (err) {
    await t.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("createReportForRound error:", err);
    return res
      .status(500)
      .json({ message: "GPT 리포트 생성 중 오류가 발생했습니다." });
  }
};

/**
 * 특정 전형의 특정 GPT 리포트 수정
 * PUT /api/rounds/:id/reports/:reportId
 */
exports.updateReportForRound = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id, reportId } = req.params;
    const tokenProjectId = req.projectId;
    const { name, report, schema_version } = req.body;

    const round = await findRoundWithAuth(id, tokenProjectId);

    const existing = await EvalRoundReport.findOne({
      where: {
        id: reportId,
        eval_round_id: round.id,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!existing) {
      await t.rollback();
      return res.status(404).json({
        message: "수정할 GPT 리포트를 찾을 수 없습니다.",
      });
    }

    const updatePayload = {};

    if (name !== undefined) {
      updatePayload.name =
        String(name).trim().length > 0 ? String(name).trim() : existing.name;
    }

    if (report !== undefined) {
      if (!report || typeof report !== "object") {
        await t.rollback();
        return res.status(400).json({
          message: "report 필드는 객체 형태여야 합니다.",
        });
      }
      updatePayload.report_json = report;
      updatePayload.generated_at = new Date();
    }

    if (schema_version !== undefined) {
      updatePayload.schema_version = schema_version || existing.schema_version;
    }

    await existing.update(updatePayload, { transaction: t });
    await t.commit();

    const plain = existing.toJSON();

    return res.json({
      message: "GPT 리포트가 업데이트되었습니다.",
      report: {
        id: plain.id,
        eval_round_id: plain.eval_round_id,
        name: plain.name,
        report: plain.report_json,
        schema_version: plain.schema_version,
        generated_at: plain.generated_at,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
      },
    });
  } catch (err) {
    await t.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("updateReportForRound error:", err);
    return res
      .status(500)
      .json({ message: "GPT 리포트 수정 중 오류가 발생했습니다." });
  }
};

/**
 * 특정 전형의 특정 GPT 리포트 삭제
 * DELETE /api/rounds/:id/reports/:reportId
 */
exports.deleteReportForRound = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id, reportId } = req.params;
    const tokenProjectId = req.projectId;

    const round = await findRoundWithAuth(id, tokenProjectId);

    const deletedCount = await EvalRoundReport.destroy({
      where: {
        id: reportId,
        eval_round_id: round.id,
      },
      transaction: t,
    });

    await t.commit();

    if (deletedCount === 0) {
      return res.status(404).json({
        message: "삭제할 GPT 리포트를 찾을 수 없습니다.",
      });
    }

    return res.json({
      message: "GPT 리포트가 삭제되었습니다.",
    });
  } catch (err) {
    await t.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error("deleteReportForRound error:", err);
    return res
      .status(500)
      .json({ message: "GPT 리포트 삭제 중 오류가 발생했습니다." });
  }
};
