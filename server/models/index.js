// server/models/index.js
const { sequelize } = require("../db");

const ProjectModel = require("./Project");
const EvalRoundModel = require("./EvalRound");
const EvalRowModel = require("./EvalRow");
const EvalRoundCalcModel = require("./EvalRoundCalc");
const EvalRoundReportModel = require("./EvalRoundReport");

const db = {};

db.sequelize = sequelize;

// 🔹 모델 초기화
db.Project = ProjectModel(sequelize);
db.EvalRound = EvalRoundModel(sequelize);
db.EvalRow = EvalRowModel(sequelize);
db.EvalRoundCalc = EvalRoundCalcModel(sequelize);
db.EvalRoundReport = EvalRoundReportModel(sequelize);

// 🔹 연관관계 설정

// 프로젝트 1 : N 전형(EvalRound)
db.Project.hasMany(db.EvalRound, {
  foreignKey: "project_id",
  as: "rounds",
  onDelete: "CASCADE",
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
  onDelete: "CASCADE",
  hooks: true,
});

db.EvalRow.belongsTo(db.EvalRound, {
  foreignKey: "eval_round_id",
  as: "round",
});

// 전형 1 : 1 Step6 계산(EvalRoundCalc)
db.EvalRound.hasOne(db.EvalRoundCalc, {
  foreignKey: "eval_round_id",
  as: "calc",
  onDelete: "CASCADE",
  hooks: true,
});

db.EvalRoundCalc.belongsTo(db.EvalRound, {
  foreignKey: "eval_round_id",
  as: "round",
});

// 전형 1 : N GPT 리포트(EvalRoundReport)
db.EvalRound.hasMany(db.EvalRoundReport, {
  foreignKey: "eval_round_id",
  as: "reports",
  onDelete: "CASCADE",
  hooks: true,
});

db.EvalRoundReport.belongsTo(db.EvalRound, {
  foreignKey: "eval_round_id",
  as: "round",
});

module.exports = db;
