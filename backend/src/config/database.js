require('dotenv').config();
const { databaseEnvironment } = require('./env');
const config = databaseEnvironment();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    logging: false, // เปลี่ยนเป็น console.log ถ้าอยากเห็น SQL ที่ Sequelize รันจริง
  }
);

module.exports = sequelize;
