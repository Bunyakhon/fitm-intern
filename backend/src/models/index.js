const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// ใช้ Sequelize instance เดียวกับที่ app.js เรียกใช้ผ่าน config/database.js
// กันไม่ให้มี connection pool 2 ตัวแยกกันในระบบเดียว
const sequelize = require('../config/database');

const basename = path.basename(__filename);

const db = {};

// โหลดทุกไฟล์ *.model.js ในโฟลเดอร์นี้แบบอัตโนมัติ
// เพิ่ม model ใหม่ในอนาคต แค่วางไฟล์ .model.js ไว้ในโฟลเดอร์นี้ ไม่ต้องมาแก้ index.js
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file !== basename &&
      file.endsWith('.model.js') &&
      !file.startsWith('.')
    );
  })
  .forEach((file) => {
    const modelDefiner = require(path.join(__dirname, file));
    const model = modelDefiner(sequelize);
    db[model.name] = model;
  });

// เรียก associate() ของทุก model หลังจากโหลดครบแล้ว
// (ต้องโหลดครบก่อน เพราะ associate ต้อง reference model อื่นที่อาจยังไม่ถูก define ถ้าทำพร้อมกัน)
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;