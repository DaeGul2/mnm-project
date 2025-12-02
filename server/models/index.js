const { sequelize } = require("../db");
const ProjectModel = require("./Project");
const EvalRoundModel = require("./EvalRound");
const EvalRowModel = require("./EvalRow");

const db = {};

db.sequelize = sequelize;

// 모델 초기화
db.Project = ProjectModel(sequelize);
db.EvalRound = EvalRoundModel(sequelize);
db.EvalRow = EvalRowModel(sequelize);

// 🔹 연관관계 설정

// 프로젝트 1 : N 전형(EvalRound)
db.Project.hasMany(db.EvalRound, {
  foreignKey: "project_id",
  as: "rounds",
  onDelete: "CASCADE",   // ✅ 프로젝트 삭제 시 라운드 삭제
  hooks: true,
});

db.EvalRound.belongsTo(db.Project, {
  foreignKey: "project_id",
  as: "project",
});

// 전형 1 : N 행(EvalRow)
db.EvalRound.hasMany(db.EvalRow, {
  foreignKey: "eval_round_id",
  as: "rows",
  onDelete: "CASCADE",   // ✅ 전형 삭제 시 행 삭제
  hooks: true,
});

db.EvalRow.belongsTo(db.EvalRound, {
  foreignKey: "eval_round_id",
  as: "round",
});

module.exports = db;
