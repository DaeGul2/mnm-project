// server/controllers/evalRoundController.js
const db = require("../models");

const { EvalRound, EvalRow } = db;

/**
 * 특정 프로젝트에 속한 전형 목록 조회
 * GET /api/projects/:projectId/rounds
 */
exports.listRoundsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(projectId)) {
      return res.status(403).json({
        message: "이 프로젝트의 전형을 조회할 권한이 없습니다.",
      });
    }

    const rounds = await EvalRound.findAll({
      where: { project_id: projectId },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "project_id",
        "name",
        "status",
        "max_step_reached",
        "created_at",
        "updated_at",
      ],
    });

    return res.json({ rounds });
  } catch (err) {
    console.error("listRoundsByProject error:", err);
    return res
      .status(500)
      .json({ message: "전형 목록 조회 중 오류가 발생했습니다." });
  }
};

/**
 * 전형 상세 + 행 데이터 조회
 * GET /api/rounds/:id
 * 응답: { round, rows }
 */
exports.getRoundDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const round = await EvalRound.findByPk(id);

    if (!round) {
      return res.status(404).json({
        message: "전형을 찾을 수 없습니다.",
      });
    }

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(round.project_id)) {
      return res.status(403).json({
        message: "이 전형을 조회할 권한이 없습니다.",
      });
    }

    const rows = await EvalRow.findAll({
      where: { eval_round_id: round.id },
      order: [["row_index", "ASC"]],
    });

    return res.json({
      round: round.toJSON(),
      rows: rows.map((r) => r.row_json),
    });
  } catch (err) {
    console.error("getRoundDetail error:", err);
    return res
      .status(500)
      .json({ message: "전형 상세 조회 중 오류가 발생했습니다." });
  }
};

/**
 * 새 전형 생성
 * POST /api/projects/:projectId/rounds
 */
exports.createRoundForProject = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { projectId } = req.params;
    const {
      name,
      headers,
      rows,
      mapping,
      supportGroups,
      resultMapping,
    } = req.body;

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(projectId)) {
      await t.rollback();
      return res.status(403).json({
        message: "이 프로젝트에 전형을 생성할 권한이 없습니다.",
      });
    }

    if (!name || !Array.isArray(headers) || !Array.isArray(rows)) {
      await t.rollback();
      return res.status(400).json({
        message: "name, headers, rows는 필수입니다.",
      });
    }

    const round = await EvalRound.create(
      {
        project_id: projectId,
        name,
        headers_json: headers,
        mapping_json: mapping || {},
        support_groups_json: supportGroups || {},
        result_mapping_json: resultMapping || {},
        max_step_reached: 2,
        status: "READY",
      },
      { transaction: t }
    );

    if (rows.length > 0) {
      const rowRecords = rows.map((row, idx) => ({
        eval_round_id: round.id,
        row_index: idx,
        row_json: row,
      }));

      await EvalRow.bulkCreate(rowRecords, { transaction: t });
    }

    await t.commit();

    return res.status(201).json({
      round: round.toJSON(),
    });
  } catch (err) {
    console.error("createRoundForProject error:", err);
    await t.rollback();
    return res
      .status(500)
      .json({ message: "전형 생성 중 오류가 발생했습니다." });
  }
};

/**
 * 전형 설정(JSON) 업데이트
 * PUT /api/rounds/:id/config
 */
// server/controllers/evalRoundController.js
exports.updateRoundConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mapping,
      supportGroups,
      resultMapping,
      maxStepReached,
      name,                 // ✅ 전형 이름
    } = req.body;

    const round = await EvalRound.findByPk(id);

    if (!round) {
      return res.status(404).json({
        message: "전형을 찾을 수 없습니다.",
      });
    }

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(round.project_id)) {
      return res.status(403).json({
        message: "이 전형을 수정할 권한이 없습니다.",
      });
    }

    if (typeof mapping !== "undefined") {
      round.mapping_json = mapping;
    }

    if (typeof supportGroups !== "undefined") {
      round.support_groups_json = supportGroups;
    }

    if (typeof resultMapping !== "undefined") {
      round.result_mapping_json = resultMapping;
    }

    if (typeof maxStepReached === "number") {
      const prev = round.max_step_reached || 0;
      round.max_step_reached = Math.max(prev, maxStepReached);
    }

    // ✅ 전형 이름 변경
    if (typeof name === "string" && name.trim()) {
      round.name = name.trim();
    }

    await round.save();

    return res.json({
      round: round.toJSON(),
    });
  } catch (err) {
    console.error("updateRoundConfig error:", err);
    return res
      .status(500)
      .json({ message: "전형 설정 업데이트 중 오류가 발생했습니다." });
  }
};


/**
 * 전형 삭제 (해당 전형 + 관련 행 전체 삭제)
 * DELETE /api/rounds/:id
 */
exports.deleteRound = async (req, res) => {
  try {
    const { id } = req.params;

    const round = await EvalRound.findByPk(id);

    if (!round) {
      return res.status(404).json({ message: "전형을 찾을 수 없습니다." });
    }

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(round.project_id)) {
      return res.status(403).json({
        message: "이 전형을 삭제할 권한이 없습니다.",
      });
    }

    await round.destroy();

    return res.json({ message: "전형 및 관련 행이 모두 삭제되었습니다." });
  } catch (err) {
    console.error("deleteRound error:", err);
    return res
      .status(500)
      .json({ message: "전형 삭제 중 오류가 발생했습니다." });
  }
};

/**
 * 엑셀 데이터 통째로 갈아끼우기
 * PUT /api/rounds/:id/replace-data
 *
 * body: { headers, rows, mapping?, supportGroups?, resultMapping?, maxStepReached? }
 */
exports.replaceRoundData = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      headers,
      rows,
      mapping,
      supportGroups,
      resultMapping,
      maxStepReached,
    } = req.body;

    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      await t.rollback();
      return res.status(400).json({
        message: "headers와 rows는 배열이어야 합니다.",
      });
    }

    const round = await EvalRound.findByPk(id, { transaction: t });

    if (!round) {
      await t.rollback();
      return res.status(404).json({
        message: "전형을 찾을 수 없습니다.",
      });
    }

    const tokenProjectId = req.projectId;
    if (!tokenProjectId || Number(tokenProjectId) !== Number(round.project_id)) {
      await t.rollback();
      return res.status(403).json({
        message: "이 전형을 수정할 권한이 없습니다.",
      });
    }

    // 1) 전형 설정 업데이트
    round.headers_json = headers;
    if (typeof mapping !== "undefined") {
      round.mapping_json = mapping;
    }
    if (typeof supportGroups !== "undefined") {
      round.support_groups_json = supportGroups;
    }
    if (typeof resultMapping !== "undefined") {
      round.result_mapping_json = resultMapping;
    }

    if (typeof maxStepReached === "number") {
      const prev = round.max_step_reached || 0;
      round.max_step_reached = Math.max(prev, maxStepReached);
    }

    await round.save({ transaction: t });

    // 2) 기존 행 전체 삭제
    await EvalRow.destroy({
      where: { eval_round_id: round.id },
      transaction: t,
    });

    // 3) 새 행 전체 bulk insert
    if (rows.length > 0) {
      const rowRecords = rows.map((row, idx) => ({
        eval_round_id: round.id,
        row_index: idx,
        row_json: row,
      }));

      await EvalRow.bulkCreate(rowRecords, { transaction: t });
    }

    await t.commit();

    return res.json({
      message: "엑셀 데이터가 성공적으로 갈아끼워졌습니다.",
    });
  } catch (err) {
    console.error("replaceRoundData error:", err);
    await t.rollback();
    return res
      .status(500)
      .json({ message: "엑셀 데이터 교체 중 오류가 발생했습니다." });
  }
};
