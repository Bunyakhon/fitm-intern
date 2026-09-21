const {
  sequelize,
  Teacher,
} = require("../models");

// ==============================
// รายชื่ออาจารย์จริง
// ==============================

const teachers = [
  {
    academic_title: "ผศ.ดร.",
    first_name: "ขนิษฐา",
    last_name: "นามี",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: "หัวหน้าภาควิชา",
    status: "active",
  },

  {
    academic_title: "ผศ.",
    first_name: "พีระศักดิ์",
    last_name: "เสรีกุล",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "รศ.ดร.",
    first_name: "อนิราช",
    last_name: "มิ่งขวัญ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.",
    first_name: "สมชัย",
    last_name: "เชียงพงศ์พันธุ์",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ดร.",
    first_name: "ประดิษฐ์",
    last_name: "พิทักษ์เสถียรกุล",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "สุปีติ",
    last_name: "กุลจันทร์",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "วันทนี",
    last_name: "ประจวบศุภกิจ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "รศ.ดร.",
    first_name: "ยุพิน",
    last_name: "สรรพคุณ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "พาฝัน",
    last_name: "ดวงไพศาล",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ดร.",
    first_name: "วัชรชัย",
    last_name: "คงศิริวัฒนา",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.",
    first_name: "นิมิต",
    last_name: "ศรีคำทา",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.",
    first_name: "นพดล",
    last_name: "บูรณ์กุศล",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "อรบุษป์",
    last_name: "วุฒิกมลชัย",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "สิวาลัย",
    last_name: "จินเจือ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "บีสุดา",
    last_name: "ดาวเรือง",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "นิติการ",
    last_name: "นาคเจือทอง",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "สุพาภรณ์",
    last_name: "ซิ้มเจริญ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.",
    first_name: "นพเก้า",
    last_name: "ทองใบ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "นัฎฐพันธ์",
    last_name: "นาคพงษ์",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "ผศ.ดร.",
    first_name: "ศรายุทธ",
    last_name: "ธเนศสกุลวัฒนา",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "อ.ดร.",
    first_name: "ศิรินทรา",
    last_name: "แว่วศรี",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "อ.ดร.",
    first_name: "กาญจน์",
    last_name: "ณ ศรีธะ",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },

  {
    academic_title: "อ.ดร.",
    first_name: "พิทย์พิมล",
    last_name: "ชูรอด",
    department: "เทคโนโลยีสารสนเทศ",
    major: null,
    position: null,
    status: "active",
  },
];

// ==============================
// Seed Teachers
// ==============================

async function seedTeachers() {
  try {
    await sequelize.authenticate();

    console.log(
      "Database connected.",
    );

    let createdCount = 0;
    let updatedCount = 0;

    for (const teacherData of teachers) {
      const existingTeacher =
        await Teacher.findOne({
          where: {
            academic_title:
              teacherData.academic_title,

            first_name:
              teacherData.first_name,

            last_name:
              teacherData.last_name,
          },
        });

      // ==============================
      // ถ้ามีอาจารย์อยู่แล้ว
      // ให้อัปเดตข้อมูลแทน
      // ไม่สร้างข้อมูลซ้ำ
      // ==============================

      if (existingTeacher) {
        await existingTeacher.update({
          department:
            teacherData.department,

          major:
            teacherData.major,

          position:
            teacherData.position,

          status:
            teacherData.status,
        });

        updatedCount++;

        console.log(
          `UPDATED: ${teacherData.academic_title}${teacherData.first_name} ${teacherData.last_name}`,
        );

        continue;
      }

      // ==============================
      // ถ้ายังไม่มี
      // ให้สร้างข้อมูลใหม่
      // ==============================

      await Teacher.create({
        academic_title:
          teacherData.academic_title,

        first_name:
          teacherData.first_name,

        last_name:
          teacherData.last_name,

        department:
          teacherData.department,

        major:
          teacherData.major,

        position:
          teacherData.position,

        status:
          teacherData.status,

        email: null,

        password_hash: null,
      });

      createdCount++;

      console.log(
        `CREATED: ${teacherData.academic_title}${teacherData.first_name} ${teacherData.last_name}`,
      );
    }

    console.log(
      "==============================",
    );

    console.log(
      `สร้างใหม่: ${createdCount} คน`,
    );

    console.log(
      `อัปเดต: ${updatedCount} คน`,
    );

    console.log(
      `รวมทั้งหมด: ${teachers.length} คน`,
    );

    console.log(
      "Seed teachers completed.",
    );
  } catch (error) {
    console.error(
      "SEED TEACHERS ERROR:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seedTeachers();