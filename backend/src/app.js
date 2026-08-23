require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('./models'); // โหลด models ทั้งหมด (Student, StudentProfile, ...) พร้อม associate()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// route ทดสอบง่ายๆ
app.get('/', (req, res) => {
  res.json({ message: 'fitm-intern API is running' });
});

// route ทดสอบว่าต่อ database ได้จริง
app.get('/health/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', message: 'Database connection is healthy' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// เชื่อมต่อ DB + sync schema ก่อน listen
// ใช้ alter: true เฉพาะตอน dev เท่านั้น — schema ยังเปลี่ยนบ่อย
// พอ schema นิ่งแล้ว/ขึ้น production ค่อยเปลี่ยนไปใช้ sequelize-cli migration แทน
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected.');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Models synced.');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });