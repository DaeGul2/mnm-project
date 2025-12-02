const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EvalRound = sequelize.define(
    "EvalRound",
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      project_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      // 전형 이름 (예: "1차 서류", "2차 면접", "코딩테스트" 등)
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      // 원본 업로드 엑셀 파일 정보 (없으면 NULL)
      original_file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      original_file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      // Step1: 헤더 정보
      // ["수험번호","지원분야", ...]
      headers_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      // Step2: mapping 상태
      // { examNo, supportField, evalFields[], phaseResult, finalResult }
      mapping_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      // Step3: 지원분야 통합 그룹
      // { "행정_통합": ["일반행정", "지역행정"], ... }
      support_groups_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      // Step5: 결과 매핑
      // { phase: {...}, final: {...} }
      result_mapping_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      // 이 전형이 현재 어디까지 진행되었는지 (1~6)
      max_step_reached: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 5, // step5까지 끝나고 저장하는 게 기본
      },

      // 상태값 (필요하면)
      status: {
        type: DataTypes.ENUM("DRAFT", "READY", "ANALYZED"),
        allowNull: false,
        defaultValue: "READY",
      },

      // 버전 관리 대비
      schema_version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "v1",
      },
    },
    {
      tableName: "eval_rounds",
      underscored: true,
      timestamps: true,
    }
  );

  return EvalRound;
};
