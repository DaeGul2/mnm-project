const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EvalRow = sequelize.define(
    "EvalRow",
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
      // 원본 엑셀에서의 행 index (0-based or 1-based, 너 마음대로)
      row_index: {
        type: DataTypes.INTEGER.UNSIGNED,   // ✅ INTEGER로 수정
        allowNull: false,
      },
      // "헤더명 -> 값" 형태 JSON
      // 예: { "수험번호": "A-001", "지원분야": "일반행정", "면접1": 85, ... }
      row_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: "eval_rows",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: "idx_eval_rows_round_id",
          fields: ["eval_round_id"],
        },
      ],
    }
  );

  return EvalRow;
};
