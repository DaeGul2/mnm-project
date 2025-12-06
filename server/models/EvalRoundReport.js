// server/models/EvalRoundReport.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EvalRoundReport = sequelize.define(
    "EvalRoundReport",
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      eval_round_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      // GPT로 만든 보고서 버전 이름 (예: "임원용 요약", "전체 상세 리포트")
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "기본 리포트",
      },
      // GPT 결과 전체 JSON
      // 예: { overview: {...}, groups: [...] }
      report_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      schema_version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "v1",
      },
      // 이 리포트를 생성한 시점
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "eval_round_reports",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: "idx_eval_round_reports_round_id",
          fields: ["eval_round_id"],
        },
      ],
    }
  );

  return EvalRoundReport;
};
