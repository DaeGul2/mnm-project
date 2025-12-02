const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Project = sequelize.define(
    "Project",
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        // 프로젝트 이름 (예: 2025 상반기 일반행정 공채)
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // 프로젝트 잠금용 비밀번호 해시 (BCrypt 등으로 해싱해서 저장)
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      // 프로젝트 만든 유저 id (나중에 없으면 NULL 가능)
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      // 비활성/보관 처리용
      is_archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "projects",
      underscored: true,
      timestamps: true,
    }
  );

  return Project;
};
