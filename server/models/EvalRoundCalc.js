// server/models/EvalRoundCalc.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EvalRoundCalc = sequelize.define(
    "EvalRoundCalc",
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
      // 이 레코드에 붙일 이름 (예: "기본 분석", "필터 적용 버전" 등)
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "기본 분석",
      },
      // Step6 화면 설정 전체 (스타일, 포함 필드, 그룹 순서 등)
      // 예: { styleConfig: {...}, includedFieldsByGroup: {...}, groupOrder: [...] }
      config_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      // Step6에서 계산한 통계/그래프용 데이터 전체
      // 예: { crossGroupSummary: [...], groups: { [groupName]: {...} } }
      stats_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      // 버전 관리 대비
      schema_version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "v1",
      },
      // 이 계산 결과를 만든 시점
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "eval_round_calcs",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          // 전형당 1개만 쓸 거면 unique로 고정
          name: "ux_eval_round_calcs_round_id",
          unique: true,
          fields: ["eval_round_id"],
        },
      ],
    }
  );

  return EvalRoundCalc;
};
