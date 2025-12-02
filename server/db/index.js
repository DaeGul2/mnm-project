const { Sequelize } = require("sequelize");
require("dotenv").config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,   // ✅ 여기
  DB_NAME,
  NODE_ENV,
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, { // ✅ 여기
  host: DB_HOST,
  port: DB_PORT || 3306,
  dialect: "mysql",
  logging: NODE_ENV === "development" ? console.log : false,
  timezone: "+09:00",
});

module.exports = {
  sequelize,
};
