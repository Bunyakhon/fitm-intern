# FITM Student Profile — Complete Field Mapping Audit

วันที่ตรวจ: 2026-10-10 (Asia/Bangkok). งานนี้เป็น READ-ONLY AUDIT และข้อเสนอเท่านั้น ไม่มีการแก้ application source, API contract, models, migrations หรือฐานข้อมูล

ตรวจ [profile.pdf](../requirements/profile.pdf) จริงทั้งข้อความและภาพครบ 4 หน้า (TGDE-COOP–02); SHA-256: `7E0279A7479FBF163BDDA40DD2DBCA1CF514BFD00153BF9D27DA7DDC6BEA11F8`
ไฟล์เป็นตัวอย่างที่มีค่ากรอกอยู่บางส่วน รายงานบันทึกเฉพาะ label/โครงสร้าง ไม่คัดลอกค่าบุคคลหรือผล checkbox จากตัวอย่าง

**SOURCE VERIFIED / DATABASE SCHEMA VERIFIED**: อ่าน PostgreSQL ที่ backend config ปัจจุบันชี้ไป ผ่าน `pg.Client` โดยไม่ import models/app/migration runner ใช้ `BEGIN READ ONLY`, `SHOW transaction_read_only` = `on`, SELECT catalog และ `ROLLBACK`; ไม่ SELECT แถวข้อมูลนักศึกษา/เอกสาร/ผู้ใช้
API จริงที่ไม่มี Token: GET `/api/student-profile/me` และ `/api/student-profile/profile-image` ได้ 401 ทั้งคู่
**AUTHENTICATED API / BROWSER FLOW NOT TESTED**: ไม่ยืนยันการบันทึกจริง อัปโหลดจริง การ reload จาก API ที่มีสิทธิ์ หรือ responsive ด้วยเบราว์เซอร์ในรอบนี้

ค้น PDF ภายใน workspace รวม hidden paths โดยยกเว้น .git/node_modules พบเฉพาะ profile.pdf ไม่พบ PDF ทก.01 ต้นฉบับ จึงเป็น **OFFICIAL SCOPE NOT VERIFIED** สำหรับข้อ 2.3.1.1 (2); ไม่ใช้รายงานเก่าแทนต้นฉบับ และไม่ตัดข้อมูล Existing System ออก

## วิธีนับและความหมาย

นับ 148 จุดข้อมูลตามตำแหน่งในแบบฟอร์ม ไม่ใช่ 148 column ที่ต้องเพิ่ม: หน้า 1 = 57, หน้า 2 = 35, หน้า 3 = 26, หน้า 4 = 30
รายการการศึกษา 3 ระดับ × 5 ช่อง = 15; การฝึกอบรม 5 แถว × 4 ช่อง = 20; ทักษะ 2 หมวด × 4 แถว × (ชื่อ + ระดับ) = 16
Checkbox ที่เป็นทางเลือกเดียว เช่น มี/ไม่มี หรือระดับ 4 ค่า นับเป็นข้อมูลหนึ่งจุด ไม่ใช่หนึ่งจุดต่อกล่อง; วันที่หนึ่งวันนับหนึ่งจุด ไม่แยก วัน/เดือน/ปี
นับชื่อพิมพ์ใต้ลายเซ็นและวันที่แยกจากลายเซ็น; ชื่อ/โทรศัพท์ที่พิมพ์ซ้ำในหน้า 4 นับตามตำแหน่งซ้ำเพื่อให้ตรวจเอกสารครบ
ข้อความรับรองหน้า 3 แยกเป็น 2 ความหมาย (ความจริงและการปฏิบัติตามระเบียบ) สำหรับ digital proposal; PDF เดิมไม่ได้มี checkbox แยก 2 กล่อง

COMPLETE หมายถึงพบ binding/read/เก็บข้อมูลครบตามชนิดข้อมูล และ column จริง (รวมอายุที่คำนวณจากวันเกิด) ไม่ใช่ยืนยัน runtime, PDF export, ขนาดรูปพิมพ์ หรือเอกสารทางการ
PARTIAL หมายถึงมีข้อมูลใกล้เคียงแต่โครงสร้าง/ความหมายยังไม่ครบ; ชื่อทักษะ 8 ช่องอ้าง TEXT เดิมชุดเดียว จึงห้ามสรุปว่าเก็บได้ 8 record
DIFFERENT WORKFLOW หมายถึงพบแหล่งข้อมูลในคำร้อง/การพิจารณา/การมอบหมายอาจารย์ ต้องอยู่ใน Workflow นั้น บางรายการยังมี semantic gap ตามคอลัมน์สิ่งที่ต้องทำ
MISSING หมายถึงไม่มี mapping ที่ตรงความหมายจริง; การมี textarea รวม/table ไฟล์ชื่อคล้ายกันไม่ทำให้ถือว่าครบ

## Field Mapping Summary

| Status | จำนวน | ความหมาย |
| --- | --- | --- |
| COMPLETE | 24 | binding และข้อมูลครบตามชนิดข้อมูล |
| FRONTEND ONLY | 0 | พบเฉพาะ UI ไม่มี backend/column |
| BACKEND ONLY | 0 | backend มี แต่ UI ไม่รองรับ |
| DATABASE ONLY | 0 | พบเฉพาะ column จริง |
| PARTIAL | 12 | ข้อมูลใกล้เคียง ยังไม่ครบโครงสร้าง/ความหมาย |
| MISSING | 96 | ไม่พบ mapping ที่ตรง |
| DIFFERENT WORKFLOW | 16 | พบข้อมูลใน Workflow อื่น ต้องรักษาขอบเขต |
| NOT VERIFIED | 0 | หลักฐานไม่พอจัดประเภท |

24 จุดครบ, 12 จุดมีบางส่วน, 16 จุดใช้ข้อมูล Workflow อื่น รวม 52/148 จุดมี binding หรือข้อมูลเดิมที่เกี่ยวข้อง; 96 จุดไม่มี mapping ตรงความหมาย ตัวเลขนี้ไม่ใช่จำนวน column/field type ที่ไม่ซ้ำ

## PDF → Frontend → API → Model → PostgreSQL: หน้า 1

| ID | หน้า PDF | หมวด | Field Label | Frontend Field | API Property | Sequelize Field | PostgreSQL Column | สถานะ | สิ่งที่ต้องทำ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-01 | 1 | ส่วนตัว | รูปถ่ายหน้าตรง 1 นิ้ว | profileAvatarImage / profileImageInput — [frontend/src/student_coop/student_coop.html:1406](../../frontend/src/student_coop/student_coop.html#L1406) | student.profile_image; POST multipart profile_image; GET /profile-image | Student.profile_image — [backend/src/models/student.model.js:272](../../backend/src/models/student.model.js#L272) | students.profile_image | COMPLETE | มี upload/preview/replace จริง; ไม่ได้ยืนยัน crop หรือขนาด 1 นิ้วบนเอกสารพิมพ์ |
| P1-02 | 1 | ส่วนตัว | ชื่อ–สกุลภาษาไทย | studentFullName / profileFullName — [frontend/src/student_coop/student_coop.html:356](../../frontend/src/student_coop/student_coop.html#L356) | student.first_name + student.last_name | Student.first_name — [backend/src/models/student.model.js:206](../../backend/src/models/student.model.js#L206) + Student.last_name — [backend/src/models/student.model.js:216](../../backend/src/models/student.model.js#L216) | students.first_name + students.last_name | COMPLETE | Student.first_name + last_name; เก็บตอนสมัคร อ่านอย่างเดียวใน Profile; ไม่มีข้อบังคับตรวจอักษรไทย |
| P1-03 | 1 | ส่วนตัว | ชื่อ–สกุลภาษาอังกฤษ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-04 | 1 | ส่วนตัว | รหัสประจำตัวนักศึกษา | studentIdInput / profileStudentId — [frontend/src/student_coop/student_coop.html:360](../../frontend/src/student_coop/student_coop.html#L360) | student.student_id | Student.student_id — [backend/src/models/student.model.js:122](../../backend/src/models/student.model.js#L122) | students.student_id | COMPLETE | อ่านจากบัญชีเดิม; การแก้ชื่อ/รหัส/อีเมลไม่มีใน Profile |
| P1-05 | 1 | ส่วนตัว | สาขาวิชา | studentMajorInput — [frontend/src/student_coop/student_coop.html:368](../../frontend/src/student_coop/student_coop.html#L368) | student.major | Student.major — [backend/src/models/student.model.js:227](../../backend/src/models/student.model.js#L227) | students.major | COMPLETE | GET student.major / PUT student-info major; ตัวเลือก IT/INE และเติมค่าเดิมได้; ไม่ใช่ประวัติการศึกษาหลายระดับ |
| P1-06 | 1 | ส่วนตัว | ภาควิชา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | Student ไม่มี department; Teacher.department ใช้กำหนดสิทธิ์ ไม่ใช่หลักฐานภาควิชาของนักศึกษา |
| P1-07 | 1 | ส่วนตัว | คณะ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-08 | 1 | ส่วนตัว | ชั้นปี | studentYearLevelInput — [frontend/src/student_coop/student_coop.html:376](../../frontend/src/student_coop/student_coop.html#L376) | student.year_level | Student.year_level — [backend/src/models/student.model.js:232](../../backend/src/models/student.model.js#L232) | students.year_level | COMPLETE | GET student.year_level / PUT student-info year_level; integer 1–4 |
| P1-09 | 1 | ส่วนตัว | เกรดเฉลี่ยเทอมที่ผ่านมา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี GPA แยกเทอม; ห้ามนำ Student.gpa ไปใช้สองความหมาย |
| P1-10 | 1 | ส่วนตัว | เกรดเฉลี่ยสะสม | studentGpaInput — [frontend/src/student_coop/student_coop.html:386](../../frontend/src/student_coop/student_coop.html#L386) | student.gpa | Student.gpa — [backend/src/models/student.model.js:250](../../backend/src/models/student.model.js#L250) | students.gpa | PARTIAL | มี GPA เดียว label GPA; 0–4 / numeric(3,2); ต้องยืนยันว่า gpa หมายถึงสะสมก่อนใช้ใน PDF |
| P1-11 | 1 | ส่วนตัว | เลขบัตรประชาชน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-12 | 1 | ส่วนตัว | วันที่ออกบัตรประชาชน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-13 | 1 | ส่วนตัว | วันที่หมดอายุบัตรประชาชน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-14 | 1 | ส่วนตัว | วันเกิด | editBirthDate / profileBirthDate — [frontend/src/student_coop/student_coop.html:1459](../../frontend/src/student_coop/student_coop.html#L1459) | student.profile.birth_date; PUT birth_date | StudentProfile.birth_date — [backend/src/models/studentProfile.model.js:43](../../backend/src/models/studentProfile.model.js#L43) | student_profiles.birth_date | COMPLETE | รักษา binding และ validation เดิม |
| P1-15 | 1 | ส่วนตัว | อายุ | profileAge / editAge — [frontend/src/student_coop/student_coop.html:1465](../../frontend/src/student_coop/student_coop.html#L1465) | คำนวณจาก student.profile.birth_date; ไม่ส่งอายุใน payload | StudentProfile.birth_date — [backend/src/models/studentProfile.model.js:43](../../backend/src/models/studentProfile.model.js#L43) (derived) | student_profiles.birth_date (derived; ไม่มี column อายุ) | COMPLETE | calculateAge — [frontend/src/pages/student_coop.js:1140](../../frontend/src/pages/student_coop.js#L1140); ใช้วันเกิด ไม่เพิ่มอายุซ้ำ |
| P1-16 | 1 | ส่วนตัว | เพศ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี gender; prefix นาย/นางสาว/นาง ไม่สามารถแทนเพศโดยอนุมาน |
| P1-17 | 1 | ส่วนตัว | ส่วนสูง (ซม.) | editHeight / profileHeight — [frontend/src/student_coop/student_coop.html:1471](../../frontend/src/student_coop/student_coop.html#L1471) | student.profile.height_cm; PUT height_cm | StudentProfile.height_cm — [backend/src/models/studentProfile.model.js:47](../../backend/src/models/studentProfile.model.js#L47) | student_profiles.height_cm | COMPLETE | รักษา binding และ validation เดิม |
| P1-18 | 1 | ส่วนตัว | น้ำหนัก (กก.) | editWeight / profileWeight — [frontend/src/student_coop/student_coop.html:1483](../../frontend/src/student_coop/student_coop.html#L1483) | student.profile.weight_kg; PUT weight_kg | StudentProfile.weight_kg — [backend/src/models/studentProfile.model.js:51](../../backend/src/models/studentProfile.model.js#L51) | student_profiles.weight_kg | COMPLETE | รักษา binding และ validation เดิม |
| P1-19 | 1 | ส่วนตัว | ศาสนา | editReligion / profileReligion — [frontend/src/student_coop/student_coop.html:1518](../../frontend/src/student_coop/student_coop.html#L1518) | student.profile.religion; PUT religion | StudentProfile.religion — [backend/src/models/studentProfile.model.js:57](../../backend/src/models/studentProfile.model.js#L57) | student_profiles.religion | COMPLETE | รักษา binding และ validation เดิม |
| P1-20 | 1 | ส่วนตัว | เชื้อชาติ | editEthnicity / profileEthnicity — [frontend/src/student_coop/student_coop.html:1507](../../frontend/src/student_coop/student_coop.html#L1507) | student.profile.ethnicity; PUT ethnicity | StudentProfile.ethnicity — [backend/src/models/studentProfile.model.js:56](../../backend/src/models/studentProfile.model.js#L56) | student_profiles.ethnicity | COMPLETE | รักษา binding และ validation เดิม |
| P1-21 | 1 | ส่วนตัว | สัญชาติ | editNationality / profileNationality — [frontend/src/student_coop/student_coop.html:1496](../../frontend/src/student_coop/student_coop.html#L1496) | student.profile.nationality; PUT nationality | StudentProfile.nationality — [backend/src/models/studentProfile.model.js:55](../../backend/src/models/studentProfile.model.js#L55) | student_profiles.nationality | COMPLETE | รักษา binding และ validation เดิม |
| P1-22 | 1 | ใบขับขี่/ทหาร | ใบขับขี่: มี/ไม่มี | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-23 | 1 | ใบขับขี่/ทหาร | เลขใบอนุญาตขับขี่ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-24 | 1 | ใบขับขี่/ทหาร | ประเภทใบอนุญาตขับขี่ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-25 | 1 | ใบขับขี่/ทหาร | วันหมดอายุใบอนุญาตขับขี่ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-26 | 1 | ใบขับขี่/ทหาร | ภาวะทางทหาร: รับการเกณฑ์แล้ว/ยังไม่ได้รับการเกณฑ์ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-27 | 1 | ทะเบียนบ้าน | บ้านเลขที่ตามทะเบียนบ้าน | editHometownAddress / profileHometownAddress — [frontend/src/student_coop/student_coop.html:1609](../../frontend/src/student_coop/student_coop.html#L1609) | student.profile.hometown_address; PUT hometown_address | StudentProfile.hometown_address — [backend/src/models/studentProfile.model.js:65](../../backend/src/models/studentProfile.model.js#L65) | student_profiles.hometown_address | PARTIAL | TEXT ภูมิลำเนาเป็นที่อยู่รวม; ไม่แยกบ้านเลขที่และไม่ยืนยันว่าเป็นทะเบียนบ้าน |
| P1-28 | 1 | ทะเบียนบ้าน | ถนน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-29 | 1 | ทะเบียนบ้าน | แขวง/ตำบล | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-30 | 1 | ทะเบียนบ้าน | อำเภอ/เขต | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-31 | 1 | ทะเบียนบ้าน | จังหวัด | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-32 | 1 | ทะเบียนบ้าน | รหัสไปรษณีย์ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-33 | 1 | ทะเบียนบ้าน | โทรศัพท์ตามทะเบียนบ้าน | editHometownPhone / profileHometownPhone — [frontend/src/student_coop/student_coop.html:1620](../../frontend/src/student_coop/student_coop.html#L1620) | student.profile.hometown_phone; PUT hometown_phone | StudentProfile.hometown_phone — [backend/src/models/studentProfile.model.js:66](../../backend/src/models/studentProfile.model.js#L66) | student_profiles.hometown_phone | PARTIAL | มีโทรศัพท์ภูมิลำเนา; ต้องยืนยันความหมายทะเบียนบ้าน |
| P1-34 | 1 | ที่อยู่ปัจจุบัน | บ้านเลขที่ปัจจุบัน | editCurrentAddress / profileCurrentAddress — [frontend/src/student_coop/student_coop.html:1631](../../frontend/src/student_coop/student_coop.html#L1631) | student.profile.current_address; PUT current_address | StudentProfile.current_address — [backend/src/models/studentProfile.model.js:67](../../backend/src/models/studentProfile.model.js#L67) | student_profiles.current_address | PARTIAL | TEXT ที่อยู่รวม; ไม่มีบ้านเลขที่แยก |
| P1-35 | 1 | ที่อยู่ปัจจุบัน | ถนน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-36 | 1 | ที่อยู่ปัจจุบัน | แขวง/ตำบล | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-37 | 1 | ที่อยู่ปัจจุบัน | อำเภอ/เขต | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-38 | 1 | ที่อยู่ปัจจุบัน | จังหวัด | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-39 | 1 | ที่อยู่ปัจจุบัน | รหัสไปรษณีย์ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-40 | 1 | ที่อยู่ปัจจุบัน | โทรศัพท์ปัจจุบัน | editCurrentPhone / profileCurrentPhone — [frontend/src/student_coop/student_coop.html:1642](../../frontend/src/student_coop/student_coop.html#L1642) | student.profile.current_phone; PUT current_phone | StudentProfile.current_phone — [backend/src/models/studentProfile.model.js:68](../../backend/src/models/studentProfile.model.js#L68) | student_profiles.current_phone | COMPLETE | รักษา binding และ validation เดิม |
| P1-41 | 1 | ที่อยู่ปัจจุบัน | อีเมล | studentEmailInput / profileEmail — [frontend/src/student_coop/student_coop.html:364](../../frontend/src/student_coop/student_coop.html#L364) | student.email | Student.email — [backend/src/models/student.model.js:137](../../backend/src/models/student.model.js#L137) | students.email | COMPLETE | อ่านอีเมลบัญชี; ระบบบังคับโดเมนมหาวิทยาลัย ไม่มีอีเมลติดต่อแยก |
| P1-42 | 1 | บิดา | ชื่อ–สกุล | editFatherName / profileFatherName — [frontend/src/student_coop/student_coop.html:1670](../../frontend/src/student_coop/student_coop.html#L1670) | student.profile.father_name; PUT father_name | StudentProfile.father_name — [backend/src/models/studentProfile.model.js:71](../../backend/src/models/studentProfile.model.js#L71) | student_profiles.father_name | COMPLETE | รักษา binding และ validation เดิม |
| P1-43 | 1 | บิดา | อายุ | editFatherAge / profileFatherAge — [frontend/src/student_coop/student_coop.html:1681](../../frontend/src/student_coop/student_coop.html#L1681) | student.profile.father_age; PUT father_age | StudentProfile.father_age — [backend/src/models/studentProfile.model.js:72](../../backend/src/models/studentProfile.model.js#L72) | student_profiles.father_age | COMPLETE | รักษา binding และ validation เดิม |
| P1-44 | 1 | บิดา | อาชีพ | editFatherOccupation / profileFatherOccupation — [frontend/src/student_coop/student_coop.html:1693](../../frontend/src/student_coop/student_coop.html#L1693) | student.profile.father_occupation; PUT father_occupation | StudentProfile.father_occupation — [backend/src/models/studentProfile.model.js:73](../../backend/src/models/studentProfile.model.js#L73) | student_profiles.father_occupation | COMPLETE | รักษา binding และ validation เดิม |
| P1-45 | 1 | บิดา | ที่อยู่ปัจจุบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-46 | 1 | บิดา | โทรศัพท์ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-47 | 1 | มารดา | ชื่อ–สกุล | editMotherName / profileMotherName — [frontend/src/student_coop/student_coop.html:1721](../../frontend/src/student_coop/student_coop.html#L1721) | student.profile.mother_name; PUT mother_name | StudentProfile.mother_name — [backend/src/models/studentProfile.model.js:74](../../backend/src/models/studentProfile.model.js#L74) | student_profiles.mother_name | COMPLETE | รักษา binding และ validation เดิม |
| P1-48 | 1 | มารดา | อายุ | editMotherAge / profileMotherAge — [frontend/src/student_coop/student_coop.html:1732](../../frontend/src/student_coop/student_coop.html#L1732) | student.profile.mother_age; PUT mother_age | StudentProfile.mother_age — [backend/src/models/studentProfile.model.js:75](../../backend/src/models/studentProfile.model.js#L75) | student_profiles.mother_age | COMPLETE | รักษา binding และ validation เดิม |
| P1-49 | 1 | มารดา | อาชีพ | editMotherOccupation / profileMotherOccupation — [frontend/src/student_coop/student_coop.html:1744](../../frontend/src/student_coop/student_coop.html#L1744) | student.profile.mother_occupation; PUT mother_occupation | StudentProfile.mother_occupation — [backend/src/models/studentProfile.model.js:76](../../backend/src/models/studentProfile.model.js#L76) | student_profiles.mother_occupation | COMPLETE | รักษา binding และ validation เดิม |
| P1-50 | 1 | มารดา | ที่อยู่ปัจจุบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-51 | 1 | มารดา | โทรศัพท์ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-52 | 1 | ฉุกเฉิน | ชื่อ–สกุล | editEmergencyName / profileEmergencyName — [frontend/src/student_coop/student_coop.html:1814](../../frontend/src/student_coop/student_coop.html#L1814) | student.profile.emergency_contact_name; PUT emergency_contact_name | StudentProfile.emergency_contact_name — [backend/src/models/studentProfile.model.js:81](../../backend/src/models/studentProfile.model.js#L81) | student_profiles.emergency_contact_name | COMPLETE | รักษา binding และ validation เดิม |
| P1-53 | 1 | ฉุกเฉิน | ความเกี่ยวข้อง | editEmergencyRelation / profileEmergencyRelation — [frontend/src/student_coop/student_coop.html:1825](../../frontend/src/student_coop/student_coop.html#L1825) | student.profile.emergency_contact_relation; PUT emergency_contact_relation | StudentProfile.emergency_contact_relation — [backend/src/models/studentProfile.model.js:82](../../backend/src/models/studentProfile.model.js#L82) | student_profiles.emergency_contact_relation | COMPLETE | รักษา binding และ validation เดิม |
| P1-54 | 1 | ฉุกเฉิน | อาชีพ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-55 | 1 | ฉุกเฉิน | สถานที่ทำงาน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-56 | 1 | ฉุกเฉิน | ที่อยู่ปัจจุบัน | editEmergencyAddress / profileEmergencyAddress — [frontend/src/student_coop/student_coop.html:1836](../../frontend/src/student_coop/student_coop.html#L1836) | student.profile.emergency_contact_address; PUT emergency_contact_address | StudentProfile.emergency_contact_address — [backend/src/models/studentProfile.model.js:83](../../backend/src/models/studentProfile.model.js#L83) | student_profiles.emergency_contact_address | COMPLETE | รักษา binding และ validation เดิม |
| P1-57 | 1 | ฉุกเฉิน | โทรศัพท์ | editEmergencyPhone / profileEmergencyPhone — [frontend/src/student_coop/student_coop.html:1847](../../frontend/src/student_coop/student_coop.html#L1847) | student.profile.emergency_contact_phone; PUT emergency_contact_phone | StudentProfile.emergency_contact_phone — [backend/src/models/studentProfile.model.js:84](../../backend/src/models/studentProfile.model.js#L84) | student_profiles.emergency_contact_phone | COMPLETE | รักษา binding และ validation เดิม |
## PDF → Frontend → API → Model → PostgreSQL: หน้า 2

| ID | หน้า PDF | หมวด | Field Label | Frontend Field | API Property | Sequelize Field | PostgreSQL Column | สถานะ | สิ่งที่ต้องทำ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2-01 | 2 | ปริญญาตรี | สถานศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-02 | 2 | ปริญญาตรี | วุฒิการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-03 | 2 | ปริญญาตรี | วิชาเอก | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-04 | 2 | ปริญญาตรี | GPA | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-05 | 2 | ปริญญาตรี | ปีที่สำเร็จการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-06 | 2 | อนุปริญญา/ปวส. | สถานศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-07 | 2 | อนุปริญญา/ปวส. | วุฒิการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-08 | 2 | อนุปริญญา/ปวส. | วิชาเอก | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-09 | 2 | อนุปริญญา/ปวส. | GPA | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-10 | 2 | อนุปริญญา/ปวส. | ปีที่สำเร็จการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-11 | 2 | มัธยมปลาย/ปวช. | สถานศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-12 | 2 | มัธยมปลาย/ปวช. | วุฒิการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-13 | 2 | มัธยมปลาย/ปวช. | วิชาเอก | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-14 | 2 | มัธยมปลาย/ปวช. | GPA | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-15 | 2 | มัธยมปลาย/ปวช. | ปีที่สำเร็จการศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-16 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | ชื่อหลักสูตร | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-17 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | สถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-18 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | วุฒิ/ประกาศนียบัตรที่ได้รับ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-19 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | ระยะเวลา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-20 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | ชื่อหลักสูตร | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-21 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | สถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-22 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | วุฒิ/ประกาศนียบัตรที่ได้รับ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-23 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | ระยะเวลา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-24 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | ชื่อหลักสูตร | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-25 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | สถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-26 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | วุฒิ/ประกาศนียบัตรที่ได้รับ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-27 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | ระยะเวลา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-28 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | ชื่อหลักสูตร | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-29 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | สถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-30 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | วุฒิ/ประกาศนียบัตรที่ได้รับ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-31 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | ระยะเวลา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-32 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | ชื่อหลักสูตร | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-33 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | สถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-34 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | วุฒิ/ประกาศนียบัตรที่ได้รับ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-35 | 2 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | ระยะเวลา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
## PDF → Frontend → API → Model → PostgreSQL: หน้า 3

| ID | หน้า PDF | หมวด | Field Label | Frontend Field | API Property | Sequelize Field | PostgreSQL Column | สถานะ | สิ่งที่ต้องทำ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P3-01 | 3 | คอมพิวเตอร์ รายการ 1 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-02 | 3 | คอมพิวเตอร์ รายการ 1 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-03 | 3 | คอมพิวเตอร์ รายการ 2 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-04 | 3 | คอมพิวเตอร์ รายการ 2 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-05 | 3 | คอมพิวเตอร์ รายการ 3 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-06 | 3 | คอมพิวเตอร์ รายการ 3 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-07 | 3 | คอมพิวเตอร์ รายการ 4 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-08 | 3 | คอมพิวเตอร์ รายการ 4 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-09 | 3 | ภาษา รายการ 1 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-10 | 3 | ภาษา รายการ 1 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-11 | 3 | ภาษา รายการ 2 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-12 | 3 | ภาษา รายการ 2 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-13 | 3 | ภาษา รายการ 3 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-14 | 3 | ภาษา รายการ 3 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-15 | 3 | ภาษา รายการ 4 | ชื่อทักษะ | editSpecialAbilities / profileSpecialAbilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | student.profile.special_abilities; PUT special_abilities | StudentProfile.special_abilities — [backend/src/models/studentProfile.model.js:61](../../backend/src/models/studentProfile.model.js#L61) | student_profiles.special_abilities | PARTIAL | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-16 | 3 | ภาษา รายการ 4 | ระดับความสามารถ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-17 | 3 | เอกสาร | แนบ Transcript | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-18 | 3 | เอกสาร | แนบสำเนาบัตรประชาชน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-19 | 3 | เอกสาร | แนบสำเนาบัตรนักศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-20 | 3 | เอกสาร | แนบเอกสารอื่น | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-21 | 3 | เอกสาร | ระบุชนิดเอกสารอื่น | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-22 | 3 | รับรองข้อมูล | รับรองความจริงของข้อมูลและหลักฐาน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ข้อความรับรองใน PDF ไม่ใช่ checkbox เดิม; เสนอ acknowledgement แยกประเภท/เวอร์ชันและ timestamp; ไม่เท่ากับลายเซ็น |
| P3-23 | 3 | รับรองข้อมูล | ยอมรับประกาศ/ระเบียบสหกิจศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ข้อความรับรองใน PDF ไม่ใช่ checkbox เดิม; เสนอ acknowledgement แยกประเภท/เวอร์ชันและ timestamp; ไม่เท่ากับลายเซ็น |
| P3-24 | 3 | ลงนาม | ลายมือชื่อนักศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
| P3-25 | 3 | ลงนาม | ชื่อผู้ลงนามนักศึกษาใต้ลายเซ็น | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
| P3-26 | 3 | ลงนาม | วันที่ลงนามนักศึกษา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
## PDF → Frontend → API → Model → PostgreSQL: หน้า 4

| ID | หน้า PDF | หมวด | Field Label | Frontend Field | API Property | Sequelize Field | PostgreSQL Column | สถานะ | สิ่งที่ต้องทำ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P4-01 | 4 | ใบสมัคร/ผลพิจารณา | ชื่อ–สกุลนักศึกษา | studentFullName — [frontend/src/student_coop/student_coop.html:356](../../frontend/src/student_coop/student_coop.html#L356) | request.student.first_name + last_name | Student.first_name — [backend/src/models/student.model.js:206](../../backend/src/models/student.model.js#L206) + Student.last_name — [backend/src/models/student.model.js:216](../../backend/src/models/student.model.js#L216) | students.first_name + students.last_name | DIFFERENT WORKFLOW | request.student.first_name + last_name; เป็นข้อมูลอ้างอิงใบสมัคร ไม่ใช่ snapshot เดิม |
| P4-02 | 4 | ใบสมัคร/ผลพิจารณา | คณะ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | Student ไม่มี faculty; ต้องเก็บ master/ข้อมูลนักศึกษาก่อนนำเข้า snapshot ใบสมัคร |
| P4-03 | 4 | ใบสมัคร/ผลพิจารณา | เบอร์โทรศัพท์นักศึกษา | editCurrentPhone / profileCurrentPhone — [frontend/src/student_coop/student_coop.html:1642](../../frontend/src/student_coop/student_coop.html#L1642) | request.student.profile.current_phone | StudentProfile.current_phone — [backend/src/models/studentProfile.model.js:68](../../backend/src/models/studentProfile.model.js#L68) | student_profiles.current_phone | DIFFERENT WORKFLOW | request.student.profile.current_phone มี include; เป็นข้อมูลสด ไม่ใช่สำเนาที่ตรึง ณ วันสมัคร |
| P4-04 | 4 | ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 1 | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-05 | 4 | ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 2 | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-06 | 4 | ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 3 | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-07 | 4 | ใบสมัคร/ผลพิจารณา | วันที่เริ่มปฏิบัติงาน | coopWorkStartDate — [frontend/src/student_coop/student_coop.html:1919](../../frontend/src/student_coop/student_coop.html#L1919) | request.work_start_date | CoopRequest.work_start_date — [backend/src/models/coopRequest.model.js:63](../../backend/src/models/coopRequest.model.js#L63) | coop_requests.work_start_date | DIFFERENT WORKFLOW | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-08 | 4 | ใบสมัคร/ผลพิจารณา | วันที่สิ้นสุดปฏิบัติงาน | coopWorkEndDate — [frontend/src/student_coop/student_coop.html:1920](../../frontend/src/student_coop/student_coop.html#L1920) | request.work_end_date | CoopRequest.work_end_date — [backend/src/models/coopRequest.model.js:67](../../backend/src/models/coopRequest.model.js#L67) | coop_requests.work_end_date | DIFFERENT WORKFLOW | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-09 | 4 | ใบสมัคร/ผลพิจารณา | ความพร้อมทางวิชาการ: เหมาะสม/ไม่เหมาะสม | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | มี prerequisite_courses(status/grade) และการอนุมัติรวม แต่ไม่มีผลตัดสินรายเกณฑ์; ไม่ใช่ education history |
| P4-10 | 4 | ใบสมัคร/ผลพิจารณา | หมายเหตุความพร้อมทางวิชาการ | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].reason | CoopRequestReview.reason — [backend/src/models/coopRequestReview.model.js:38](../../backend/src/models/coopRequestReview.model.js#L38) | coop_request_reviews.reason | DIFFERENT WORKFLOW | มี reason รวมต่อการอนุมัติ ไม่ได้แยกหมายเหตุวิชาการ; ต้องแยกเพิ่มใน Workflow หากจำเป็น |
| P4-11 | 4 | ใบสมัคร/ผลพิจารณา | ความประพฤติ: เหมาะสม/ไม่เหมาะสม | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มีผลพิจารณาความประพฤติเฉพาะเกณฑ์; เป็นหน้าที่ผู้พิจารณา |
| P4-12 | 4 | ใบสมัคร/ผลพิจารณา | หมายเหตุความประพฤติ | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].reason | CoopRequestReview.reason — [backend/src/models/coopRequestReview.model.js:38](../../backend/src/models/coopRequestReview.model.js#L38) | coop_request_reviews.reason | DIFFERENT WORKFLOW | reason รวม ไม่ใช่หมายเหตุแยกความประพฤติ |
| P4-13 | 4 | ใบสมัคร/ผลพิจารณา | สถานประกอบการที่ได้ไปปฏิบัติงาน | coopCompanyName — [frontend/src/student_coop/student_coop.html:1914](../../frontend/src/student_coop/student_coop.html#L1914) | request.company_name | CoopRequest.company_name — [backend/src/models/coopRequest.model.js:43](../../backend/src/models/coopRequest.model.js#L43) | coop_requests.company_name | DIFFERENT WORKFLOW | มี company_name/company_id ของคำร้อง; ใช้คำร้องที่ผ่านอนุมัติ/ตอบรับตาม Workflow ไม่เท่ากับเก็บผลจัดสรรหลายอันดับ |
| P4-14 | 4 | ใบสมัคร/ผลพิจารณา | ชื่อผู้ติดต่อประสานงาน/ผู้รับหนังสือ | coopLetterRecipientName — [frontend/src/student_coop/student_coop.html:1916](../../frontend/src/student_coop/student_coop.html#L1916) | request.letter_recipient_name | CoopRequest.letter_recipient_name — [backend/src/models/coopRequest.model.js:51](../../backend/src/models/coopRequest.model.js#L51) | coop_requests.letter_recipient_name | DIFFERENT WORKFLOW | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-15 | 4 | ใบสมัคร/ผลพิจารณา | ตำแหน่งผู้ติดต่อประสานงาน | coopRecipientPosition — [frontend/src/student_coop/student_coop.html:1917](../../frontend/src/student_coop/student_coop.html#L1917) | request.letter_recipient_position_department | CoopRequest.letter_recipient_position_department — [backend/src/models/coopRequest.model.js:55](../../backend/src/models/coopRequest.model.js#L55) | coop_requests.letter_recipient_position_department | DIFFERENT WORKFLOW | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-16 | 4 | ใบสมัคร/ผลพิจารณา | ลายมือชื่ออาจารย์/เจ้าหน้าที่สหกิจ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | reviews ไม่เก็บภาพ/หลักฐานลายเซ็น; CoopDocument.metadata.signatory_name เป็นข้อความร่าง ไม่ใช่ TGDE signature |
| P4-17 | 4 | ใบสมัคร/ผลพิจารณา | ชื่อผู้ลงนามอาจารย์/เจ้าหน้าที่ใต้ลายเซ็น | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].teacher_id | CoopRequestReview.teacher_id — [backend/src/models/coopRequestReview.model.js:32](../../backend/src/models/coopRequestReview.model.js#L32) | coop_request_reviews.teacher_id | DIFFERENT WORKFLOW | มี actor teacher_id/department_staff_id + association ชื่อ; ไม่ใช่ชื่อที่ยืนยันการลงนามในเอกสาร |
| P4-18 | 4 | ใบสมัคร/ผลพิจารณา | วันที่ลงนามอาจารย์/เจ้าหน้าที่ | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | Teacher/Head reviews[].createdAt; Student reviews[].created_at | CoopRequestReview.createdAt (timestamps) → created_at — [backend/src/models/coopRequestReview.model.js:45](../../backend/src/models/coopRequestReview.model.js#L45) | coop_request_reviews.created_at | DIFFERENT WORKFLOW | มี timestamp การตัดสินเท่านั้น; model attribute createdAt → created_at; ไม่ใช่ signature date |
| P4-19 | 4 | ใบสมัคร/ผลพิจารณา | ความเห็นหัวหน้าภาค: ไปได้/รอพิจารณา | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].decision | CoopRequestReview.decision — [backend/src/models/coopRequestReview.model.js:37](../../backend/src/models/coopRequestReview.model.js#L37) | coop_request_reviews.decision | DIFFERENT WORKFLOW | มี approve/reject ของ department_head + to_status; ไม่มี defer โดยตรง |
| P4-20 | 4 | ใบสมัคร/ผลพิจารณา | เหตุผลที่หัวหน้าภาครอพิจารณา | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].reason | CoopRequestReview.reason — [backend/src/models/coopRequestReview.model.js:38](../../backend/src/models/coopRequestReview.model.js#L38) | coop_request_reviews.reason | DIFFERENT WORKFLOW | มี reason การ reject ไม่ใช่ defer; ไม่เพิ่ม stage โดยไม่มีอนุมัติ Workflow |
| P4-21 | 4 | ใบสมัคร/ผลพิจารณา | เสนอชื่ออาจารย์นิเทศ | studentCoopAdvisorInput — [frontend/src/student_coop/student_coop.html:407](../../frontend/src/student_coop/student_coop.html#L407) | student.coop_advisor_teacher_id / coopAdvisorTeacher; ไม่พบ nomination API | Student.coop_advisor_teacher_id — [backend/src/models/student.model.js:319](../../backend/src/models/student.model.js#L319) | students.coop_advisor_teacher_id | DIFFERENT WORKFLOW | มีอาจารย์นิเทศที่ยืนยันผ่านโครงการ/การขอที่ปรึกษา; ไม่มี nomination เฉพาะขั้นตอนหน้า 4 |
| P4-22 | 4 | ใบสมัคร/ผลพิจารณา | ลายมือชื่อหัวหน้าภาค/ประธานอาจารย์นิเทศ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่มี signature record; review/ข้อความชื่อไม่ใช่ลายเซ็น |
| P4-23 | 4 | ใบสมัคร/ผลพิจารณา | ชื่อหัวหน้าภาคใต้ลายเซ็น | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | reviews[].teacher_id | CoopRequestReview.teacher_id — [backend/src/models/coopRequestReview.model.js:32](../../backend/src/models/coopRequestReview.model.js#L32) | coop_request_reviews.teacher_id | DIFFERENT WORKFLOW | มี teacher association ของผู้พิจารณา actor_role=department_head; ไม่ใช่ signature identity snapshot |
| P4-24 | 4 | ใบสมัคร/ผลพิจารณา | วันที่ลงนามหัวหน้าภาค | ประวัติผลพิจารณาใน panel-coop-request / หน้าผู้พิจารณา | Teacher/Head reviews[].createdAt; Student reviews[].created_at | CoopRequestReview.createdAt (timestamps) → created_at — [backend/src/models/coopRequestReview.model.js:45](../../backend/src/models/coopRequestReview.model.js#L45) | coop_request_reviews.created_at | DIFFERENT WORKFLOW | timestamp review ไม่ใช่การลงนามใน PDF; ไม่ใช้แทนโดยอัตโนมัติ |
| P4-25 | 4 | ใบสมัคร/ผลพิจารณา | ผลพิจารณาสถาบันสหกิจ: ไปได้/รอ/อื่นๆ | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-26 | 4 | ใบสมัคร/ผลพิจารณา | เหตุผลสถาบันที่รอพิจารณา | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-27 | 4 | ใบสมัคร/ผลพิจารณา | ข้อความอื่นๆ ของสถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-28 | 4 | ใบสมัคร/ผลพิจารณา | ลายมือชื่อผู้พิจารณาสถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-29 | 4 | ใบสมัคร/ผลพิจารณา | ชื่อผู้ลงนามสถาบันใต้ลายเซ็น | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-30 | 4 | ใบสมัคร/ผลพิจารณา | วันที่ลงนามสถาบัน | ไม่พบ | ไม่พบ | ไม่พบ | ไม่พบ | MISSING | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
## ฟิลด์ Frontend ปัจจุบัน — ไม่มีการนับจาก label อย่างเดียว

หน้า Profile ปัจจุบันมี 3 tabs ([frontend/src/student_coop/student_coop.html:284](../../frontend/src/student_coop/student_coop.html#L284)): ประวัตินักศึกษา, ติดต่อ/ครอบครัว/ฉุกเฉิน, บัญชีผู้ใช้; Modal มี 2 tabs ใน form เดียว ([frontend/src/student_coop/student_coop.html:1372](../../frontend/src/student_coop/student_coop.html#L1372))
Student info มี 8 controls; Modal มี 30 controls = 28 properties ที่ส่ง PUT + รูปภาพ + อายุ readonly; บัญชีแสดง 3 ค่าจาก Student และวิธีเข้าสู่ระบบแบบ static ไม่ใช่ 4 column ใหม่

### Student info และ Account

| Label / Control | Type / ID / name | สิทธิ์/Required | Read/Write API | Validation / JS |
| --- | --- | --- | --- | --- |
| ชื่อ–สกุล | text studentFullName; ไม่มี name | readonly | student.first_name + last_name; Profile ไม่ส่ง PUT | renderStudent/populateStudentInfoForm; สมัครบัญชีเป็นผู้เก็บชื่อ |
| รหัสนักศึกษา | text studentIdInput; ไม่มี name | readonly | student.student_id; Profile ไม่ส่ง PUT | getStudentCode ใช้ student_id; ไม่ใช้ UUID id |
| อีเมล | email studentEmailInput; ไม่มี name | readonly | student.email; Profile ไม่ส่ง PUT | Student model isEmail + โดเมนมหาวิทยาลัย |
| สาขา | select studentMajorInput; ไม่มี name | editable required | PUT student-info major | JS trim nonempty; backend string/null ไม่จำกัด whitelist IT/INE |
| ชั้นปี | select studentYearLevelInput; ไม่มี name | editable required | PUT student-info year_level | Number → integer 1–4; backend integer/null |
| GPA | number studentGpaInput; min0 max4 step0.01; ไม่มี name | editable required | PUT student-info gpa | JS Number finite0–4; model DECIMAL(3,2); ค่าว่าง backend null ได้แต่ UI ไม่ยอม |
| อาจารย์ประจำชั้น | select studentAdvisorInput; ไม่มี name | editable optional | PUT advisor_teacher_id เฉพาะเปลี่ยนจริงและ directory load สำเร็จ | backend UUID + Teacher active; omit preserve, null ล้าง |
| อาจารย์สหกิจ/นิเทศ | text studentCoopAdvisorInput; ไม่มี name | readonly | student.coopAdvisorTeacher / coop_advisor_teacher_id | เปลี่ยนผ่านการขอที่ปรึกษาเดิม ไม่ผ่าน student-info |
| เจ้าของบัญชี/รหัส/อีเมล | strong profileAccountName / profileAccountStudentId / profileAccountEmail | readonly | Student response เดิม | renderStudent; ไม่แสดง hash/token |
| วิธีเข้าสู่ระบบ | ข้อความ อีเมลและรหัสผ่าน | readonly | ไม่มี property authentication_method | ยืนยันจาก auth routes login/register/me + Student.password_hash; ไม่พบ student OAuth/reset/change password ใน routes นี้ |

หลักฐาน: [frontend/src/pages/student_coop.js:454](../../frontend/src/pages/student_coop.js#L454), [frontend/src/pages/student_coop.js:727](../../frontend/src/pages/student_coop.js#L727), [frontend/src/pages/student_coop.js:829](../../frontend/src/pages/student_coop.js#L829), [frontend/src/student_coop/student_coop.html:677](../../frontend/src/student_coop/student_coop.html#L677), [backend/src/models/student.model.js:119](../../backend/src/models/student.model.js#L119), [backend/src/routes/auth.routes.js:20](../../backend/src/routes/auth.routes.js#L20)

### Modal ทุกฟิลด์ และ Read-only display binding

ทุก profile property เป็น optional; StudentProfile.student_id เท่านั้นเป็น owner FK non-null ไม่ใช่ input ที่นักศึกษาแก้ได้ ค่า blank → null; ไม่ส่ง age; รูปใช้ API แยก

| Label | Type / HTML ID / name | Read-only display | Required/Edit | API payload + JS binding | Validation |
| --- | --- | --- | --- | --- | --- |
| เลือกรูปใหม่ | file profileImageInput; name=ไม่มี — [frontend/src/student_coop/student_coop.html:1406](../../frontend/src/student_coop/student_coop.html#L1406) | profileAvatarImage / modalProfileImagePreview | editable optional | POST multipart profile_image; GET blob; JPEG/PNG/WebP <=5MiB | readonly derived / upload แยก |
| คำนำหน้า | select editPrefix; name=prefix — [frontend/src/student_coop/student_coop.html:1448](../../frontend/src/student_coop/student_coop.html#L1448) | profilePrefix | editable optional | prefix — [frontend/src/pages/student_coop.js:1477](../../frontend/src/pages/student_coop.js#L1477); fillProfileEditForm(editPrefix) | select นาย/นางสาว/นาง; backend whitelist |
| วันเกิด | date editBirthDate; name=birth_date — [frontend/src/student_coop/student_coop.html:1459](../../frontend/src/student_coop/student_coop.html#L1459) | profileBirthDate | editable optional | birth_date — [frontend/src/pages/student_coop.js:1482](../../frontend/src/pages/student_coop.js#L1482); fillProfileEditForm(editBirthDate) | YYYY-MM-DD; backend ไม่อนาคต แต่ไม่ round-trip วันที่ |
| อายุ | text editAge; name=ไม่มี — [frontend/src/student_coop/student_coop.html:1465](../../frontend/src/student_coop/student_coop.html#L1465) | profileAge; calculateAge | readonly; ไม่ส่ง | student.profile.birth_date → calculateAge; ไม่ส่ง age | readonly derived / upload แยก |
| ส่วนสูง (ซม.) | number editHeight; name=height_cm — [frontend/src/student_coop/student_coop.html:1471](../../frontend/src/student_coop/student_coop.html#L1471) | profileHeight | editable optional | height_cm — [frontend/src/pages/student_coop.js:1487](../../frontend/src/pages/student_coop.js#L1487); fillProfileEditForm(editHeight) | HTML min1 (default step1); Number; backend finite >0 |
| น้ำหนัก (กก.) | number editWeight; name=weight_kg — [frontend/src/student_coop/student_coop.html:1483](../../frontend/src/student_coop/student_coop.html#L1483) | profileWeight | editable optional | weight_kg — [frontend/src/pages/student_coop.js:1492](../../frontend/src/pages/student_coop.js#L1492); fillProfileEditForm(editWeight) | HTML min1 step0.1; Number; backend finite >0 |
| สัญชาติ | text editNationality; name=nationality — [frontend/src/student_coop/student_coop.html:1496](../../frontend/src/student_coop/student_coop.html#L1496) | profileNationality | editable optional | nationality — [frontend/src/pages/student_coop.js:1497](../../frontend/src/pages/student_coop.js#L1497); fillProfileEditForm(editNationality) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| เชื้อชาติ | text editEthnicity; name=ethnicity — [frontend/src/student_coop/student_coop.html:1507](../../frontend/src/student_coop/student_coop.html#L1507) | profileEthnicity | editable optional | ethnicity — [frontend/src/pages/student_coop.js:1502](../../frontend/src/pages/student_coop.js#L1502); fillProfileEditForm(editEthnicity) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ศาสนา | text editReligion; name=religion — [frontend/src/student_coop/student_coop.html:1518](../../frontend/src/student_coop/student_coop.html#L1518) | profileReligion | editable optional | religion — [frontend/src/pages/student_coop.js:1507](../../frontend/src/pages/student_coop.js#L1507); fillProfileEditForm(editReligion) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| กรุ๊ปเลือด | select editBloodType; name=blood_type — [frontend/src/student_coop/student_coop.html:1529](../../frontend/src/student_coop/student_coop.html#L1529) | profileBloodType | editable optional | blood_type — [frontend/src/pages/student_coop.js:1512](../../frontend/src/pages/student_coop.js#L1512); fillProfileEditForm(editBloodType) | A/B/AB/O/ไม่ทราบ; backend whitelist |
| โรคประจำตัว | textarea editMedicalConditions; name=medical_conditions — [frontend/src/student_coop/student_coop.html:1543](../../frontend/src/student_coop/student_coop.html#L1543) | profileMedicalConditions | editable optional | medical_conditions — [frontend/src/pages/student_coop.js:1517](../../frontend/src/pages/student_coop.js#L1517); fillProfileEditForm(editMedicalConditions) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| อาการแพ้ | textarea editAllergies; name=allergies — [frontend/src/student_coop/student_coop.html:1554](../../frontend/src/student_coop/student_coop.html#L1554) | profileAllergies | editable optional | allergies — [frontend/src/pages/student_coop.js:1522](../../frontend/src/pages/student_coop.js#L1522); fillProfileEditForm(editAllergies) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ความสามารถพิเศษ | textarea editSpecialAbilities; name=special_abilities — [frontend/src/student_coop/student_coop.html:1565](../../frontend/src/student_coop/student_coop.html#L1565) | profileSpecialAbilities | editable optional | special_abilities — [frontend/src/pages/student_coop.js:1527](../../frontend/src/pages/student_coop.js#L1527); fillProfileEditForm(editSpecialAbilities) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ทักษะที่เกี่ยวข้องกับสหกิจศึกษา | textarea editRelatedSkills; name=related_skills — [frontend/src/student_coop/student_coop.html:1578](../../frontend/src/student_coop/student_coop.html#L1578) | profileRelatedSkills | editable optional | related_skills — [frontend/src/pages/student_coop.js:1532](../../frontend/src/pages/student_coop.js#L1532); fillProfileEditForm(editRelatedSkills) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ภูมิลำเนา | textarea editHometownAddress; name=hometown_address — [frontend/src/student_coop/student_coop.html:1609](../../frontend/src/student_coop/student_coop.html#L1609) | profileHometownAddress | editable optional | hometown_address — [frontend/src/pages/student_coop.js:1537](../../frontend/src/pages/student_coop.js#L1537); fillProfileEditForm(editHometownAddress) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| โทรศัพท์ภูมิลำเนา | tel editHometownPhone; name=hometown_phone — [frontend/src/student_coop/student_coop.html:1620](../../frontend/src/student_coop/student_coop.html#L1620) | profileHometownPhone | editable optional | hometown_phone — [frontend/src/pages/student_coop.js:1542](../../frontend/src/pages/student_coop.js#L1542); fillProfileEditForm(editHometownPhone) | trim; backend +digits spaces()-; 7–20 digits |
| ที่อยู่ปัจจุบัน | textarea editCurrentAddress; name=current_address — [frontend/src/student_coop/student_coop.html:1631](../../frontend/src/student_coop/student_coop.html#L1631) | profileCurrentAddress | editable optional | current_address — [frontend/src/pages/student_coop.js:1547](../../frontend/src/pages/student_coop.js#L1547); fillProfileEditForm(editCurrentAddress) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| โทรศัพท์ปัจจุบัน | tel editCurrentPhone; name=current_phone — [frontend/src/student_coop/student_coop.html:1642](../../frontend/src/student_coop/student_coop.html#L1642) | profileCurrentPhone | editable optional | current_phone — [frontend/src/pages/student_coop.js:1552](../../frontend/src/pages/student_coop.js#L1552); fillProfileEditForm(editCurrentPhone) | trim; backend +digits spaces()-; 7–20 digits |
| ชื่อบิดา | text editFatherName; name=father_name — [frontend/src/student_coop/student_coop.html:1670](../../frontend/src/student_coop/student_coop.html#L1670) | profileFatherName | editable optional | father_name — [frontend/src/pages/student_coop.js:1557](../../frontend/src/pages/student_coop.js#L1557); fillProfileEditForm(editFatherName) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| อายุบิดา | number editFatherAge; name=father_age — [frontend/src/student_coop/student_coop.html:1681](../../frontend/src/student_coop/student_coop.html#L1681) | profileFatherAge | editable optional | father_age — [frontend/src/pages/student_coop.js:1562](../../frontend/src/pages/student_coop.js#L1562); fillProfileEditForm(editFatherAge) | HTML min1; Number; backend positive integer |
| อาชีพบิดา | text editFatherOccupation; name=father_occupation — [frontend/src/student_coop/student_coop.html:1693](../../frontend/src/student_coop/student_coop.html#L1693) | profileFatherOccupation | editable optional | father_occupation — [frontend/src/pages/student_coop.js:1567](../../frontend/src/pages/student_coop.js#L1567); fillProfileEditForm(editFatherOccupation) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ชื่อมารดา | text editMotherName; name=mother_name — [frontend/src/student_coop/student_coop.html:1721](../../frontend/src/student_coop/student_coop.html#L1721) | profileMotherName | editable optional | mother_name — [frontend/src/pages/student_coop.js:1572](../../frontend/src/pages/student_coop.js#L1572); fillProfileEditForm(editMotherName) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| อายุมารดา | number editMotherAge; name=mother_age — [frontend/src/student_coop/student_coop.html:1732](../../frontend/src/student_coop/student_coop.html#L1732) | profileMotherAge | editable optional | mother_age — [frontend/src/pages/student_coop.js:1577](../../frontend/src/pages/student_coop.js#L1577); fillProfileEditForm(editMotherAge) | HTML min1; Number; backend positive integer |
| อาชีพมารดา | text editMotherOccupation; name=mother_occupation — [frontend/src/student_coop/student_coop.html:1744](../../frontend/src/student_coop/student_coop.html#L1744) | profileMotherOccupation | editable optional | mother_occupation — [frontend/src/pages/student_coop.js:1582](../../frontend/src/pages/student_coop.js#L1582); fillProfileEditForm(editMotherOccupation) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ที่อยู่ที่สามารถติดต่อได้ | textarea editParentAddress; name=parent_address — [frontend/src/student_coop/student_coop.html:1774](../../frontend/src/student_coop/student_coop.html#L1774) | profileParentAddress | editable optional | parent_contact_address — [frontend/src/pages/student_coop.js:1587](../../frontend/src/pages/student_coop.js#L1587); fillProfileEditForm(editParentAddress) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| โทรศัพท์ | tel editParentPhone; name=parent_phone — [frontend/src/student_coop/student_coop.html:1785](../../frontend/src/student_coop/student_coop.html#L1785) | profileParentPhone | editable optional | parent_phone — [frontend/src/pages/student_coop.js:1592](../../frontend/src/pages/student_coop.js#L1592); fillProfileEditForm(editParentPhone) | trim; backend +digits spaces()-; 7–20 digits |
| ชื่อ-นามสกุล | text editEmergencyName; name=emergency_name — [frontend/src/student_coop/student_coop.html:1814](../../frontend/src/student_coop/student_coop.html#L1814) | profileEmergencyName | editable optional | emergency_contact_name — [frontend/src/pages/student_coop.js:1597](../../frontend/src/pages/student_coop.js#L1597); fillProfileEditForm(editEmergencyName) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ความเกี่ยวข้อง | text editEmergencyRelation; name=emergency_relation — [frontend/src/student_coop/student_coop.html:1825](../../frontend/src/student_coop/student_coop.html#L1825) | profileEmergencyRelation | editable optional | emergency_contact_relation — [frontend/src/pages/student_coop.js:1602](../../frontend/src/pages/student_coop.js#L1602); fillProfileEditForm(editEmergencyRelation) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| ที่อยู่ | textarea editEmergencyAddress; name=emergency_address — [frontend/src/student_coop/student_coop.html:1836](../../frontend/src/student_coop/student_coop.html#L1836) | profileEmergencyAddress | editable optional | emergency_contact_address — [frontend/src/pages/student_coop.js:1607](../../frontend/src/pages/student_coop.js#L1607); fillProfileEditForm(editEmergencyAddress) | trim; empty/null → null; backend string; ไม่กำหนด maxlength สำหรับ STRING |
| โทรศัพท์ | tel editEmergencyPhone; name=emergency_phone — [frontend/src/student_coop/student_coop.html:1847](../../frontend/src/student_coop/student_coop.html#L1847) | profileEmergencyPhone | editable optional | emergency_contact_phone — [frontend/src/pages/student_coop.js:1612](../../frontend/src/pages/student_coop.js#L1612); fillProfileEditForm(editEmergencyPhone) | trim; backend +digits spaces()-; 7–20 digits |

HTML name ของ parent_address/emergency_name/emergency_relation/emergency_address/emergency_phone ไม่ตรง API โดยตั้งใจ: saveStudentProfile อ่านด้วย ID แล้ว map เป็น parent_contact_address/emergency_contact_* จริง ([frontend/src/pages/student_coop.js:1587](../../frontend/src/pages/student_coop.js#L1587)); ห้ามใช้ generic FormData→JSON ตาม HTML name โดยตรงโดยไม่ map

### Loading / Saving / Error / Draft

- loadStudentProfile ([frontend/src/pages/student_coop.js:303](../../frontend/src/pages/student_coop.js#L303)) GET /me, renderStudent, populateStudentInfoForm, GET รูป, renderStudentProfile; profile null แสดงข้อความยังไม่มีรายละเอียด, loading ใช้ aria-busy/CSS ที่ [frontend/src/pages/student_coop.js:369](../../frontend/src/pages/student_coop.js#L369) ไม่ disable แก้ไขทั้งหมด
- main/edit tabs ใช้ WeakMap initializer ([frontend/src/pages/student_coop.js:377](../../frontend/src/pages/student_coop.js#L377)) และ hidden; สลับ tab ไม่ reload API ไม่ unmount inputs รองรับ Arrow/Home/End ดังนั้นข้อมูลใน tab ซ่อนยังอยู่และถูกส่งด้วย
- studentInfoForm เป็น novalidate แต่ saveStudentInfo ตรวจ major/year/GPA เอง, disable เฉพาะปุ่มเมื่อกำลังส่ง และกันส่งซ้ำด้วย isStudentInfoSaving
- Modal ใช้ปุ่ม type=button และ click saveStudentProfile ([frontend/src/student_coop/student_coop.html:1869](../../frontend/src/student_coop/student_coop.html#L1869), [frontend/src/pages/student_coop.js:1701](../../frontend/src/pages/student_coop.js#L1701)); ไม่พบ checkValidity/reportValidity ดังนั้น min/step ของ HTML ไม่ใช่การรับประกัน validation ฝั่ง client; ใช้ server validation จริง
- saveStudentProfile ส่งครบ 28 properties, กันส่งซ้ำและ upload พร้อม save profile, disable ปุ่ม/แสดง loading; response PUT ไม่ใช้โดยตรง แต่ GET /me ใหม่; catch แสดงข้อความ, finally คืนปุ่ม
- captureStudentInfoDraft / restoreStudentInfoDraft ([frontend/src/pages/student_coop.js:417](../../frontend/src/pages/student_coop.js#L417)) รักษาสาขา/ชั้นปี/GPA/อาจารย์ประจำชั้นที่ยังไม่ได้บันทึกจากการ refresh หลัง PUT profile; ไม่ใช่ stale-version protection และไม่กัน user แก้ข้อมูลเพิ่มระหว่าง await แล้ว restore draft เก่า
- รูปเลือกล่วงหน้า/preview Object URL ได้; uploadSelectedProfileImage ([frontend/src/pages/student_coop.js:663](../../frontend/src/pages/student_coop.js#L663)) ส่ง FormData และ refresh รูปแยก ไม่บันทึก profile ที่เหลือ; มี reset/URL revoke และ feedback; image getter จับ error แล้ว fallback จึงอัปโหลดสำเร็จไม่ยืนยันว่าโหลดรูปกลับสำเร็จ
- loadStudentProfile catch คืน null และตั้ง currentStudentProfile=null; caller หลัง PUT ยังแสดง success แม้ GET ถัดไป fail; เปิด Modal หลัง load fail สามารถเติมช่องว่างและส่ง null ครบได้ เป็นความเสี่ยง data loss ที่ต้องจัดการก่อนขยายฟิลด์
- ปิด Modal/backdrop/Escape ไม่ยืนยัน dirty draft; เปิดใหม่เติมจาก currentStudentProfile ใหม่ จึงสูญเสียค่าที่ไม่ได้ save; tab switch เองยังรักษาค่า

## Backend API และ owner boundary

| Endpoint | Read/Write | Source / Mapping | Validation / Auth / Atomicity |
| --- | --- | --- | --- |
| GET /api/student-profile/me; legacy GET / | อ่าน Student + profile + advisorTeacher + coopAdvisorTeacher | getStudentProfile:98; whitelist Student attributes; profile include | authenticateStudentToken; req.user.id findByPk; 404/500; ไม่รับ student_id จาก query |
| PUT /api/student-profile/me; legacy PUT / | partial update ของ StudentProfile หรือ create | upsertStudentProfile:225; normalizeProfileData:48; 28 allowed properties | unsupported key400; omit preserve; explicit null/blank clear; ไม่พบ transaction/locking/version; unique ownerป้องกัน1:1 แต่ find/create race errorไม่แยก409 |
| PUT /api/student-profile/student-info | partial update Student | updateStudentInfo:348; major/year_level/gpa/advisor_teacher_id | reject unsupported; omit preserve; explicitnullclear; UUID/Teacheractive; ไม่มี transactionผูกTeachercheckกับupdate |
| POST /api/student-profile/profile-image | อัปโหลดและ replace path Student.profile_image | uploadProfileImage:474; multipart profile_image | authก่อนmulter; JPEG/PNG/WebP <=5MiB; directory perowner/random UUID; cleanup staged fail/oldfile; MIMEมาจากuploadheader ยังไม่เช็กmagic bytes |
| GET /api/student-profile/profile-image | ไฟล์ของเจ้าของบัญชี | getProfileImage:528; req.user.id + expected owner prefix; res.sendFile | ไม่มี public image URL ใน app; res.type + sendFile; ไม่ตั้ง private/no-store หรือ nosniff อย่างชัดเจน; ไม่ได้ runtimeตรวจtokenคนอื่น |
| POST /api/student-profile/resume | resumeในเมนูค้นหาสถานประกอบการ | uploadResume:570; StudentFile.file_type=resume | PDF<=10MiB; transaction metadata+rowlock; ลบเก่าหลังcommit; extraction/OCRเสริม; ไม่มีTGDE attachmentประเภทใหม่ |

หลักฐาน API client: [frontend/src/api/studentProfile.api.js:3](../../frontend/src/api/studentProfile.api.js#L3); routes: [backend/src/routes/studentProfile.routes.js:28](../../backend/src/routes/studentProfile.routes.js#L28); controller: [backend/src/controllers/studentProfile.controller.js:48](../../backend/src/controllers/studentProfile.controller.js#L48); student actor gate: [backend/src/middlewares/auth.middleware.js:102](../../backend/src/middlewares/auth.middleware.js#L102); upload: [backend/src/middlewares/upload.middleware.js:36](../../backend/src/middlewares/upload.middleware.js#L36); storage: [backend/src/config/storage.js:5](../../backend/src/config/storage.js#L5); mount routes: [backend/src/app.js:65](../../backend/src/app.js#L65)

normalizeProfileData รองรับ string/null (trim), numeric เฉพาะ JSON number; phone7–20digits; วันเกิด DATEONLY; unknown fieldsไม่ silentlyทิ้ง แต่คืน400 ค่าสูงสุด height/weight ขึ้นกับnumeric(5,2)จริง หากเกินprecisionอาจเป็น500 การส่งbody{}ยังสามารถสร้างแถวprofileเปล่าได้
GETไม่คืน Student.password_hash/password; Student.toJSONก็กรองออก ([backend/src/models/student.model.js:20](../../backend/src/models/student.model.js#L20)) และ API imageกลับเป็นblobที่ FEจัดการเอง

## PostgreSQL หลักฐานจริง

Schema public มี 29 tables; ตรวจ catalog โดยไม่อ่านค่าบุคคล สามตารางหลัก: students 16 columns, student_profiles 32 columns, student_files 13 columns

### public.students

| Column จริง | Type จริง | Nullable | DB default | Source model / หมายเหตุ |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | Model UUIDV4 default เป็น application default; DB ไม่มี default |
| student_id | varchar(255) | NO | ไม่มี |  |
| email | varchar(255) | NO | ไม่มี |  |
| password_hash | varchar(255) | NO | ไม่มี | metadata เท่านั้น; ห้ามคืนค่า hash ใน UI |
| first_name | varchar(255) | NO | ไม่มี |  |
| last_name | varchar(255) | NO | ไม่มี |  |
| major | varchar(255) | YES | ไม่มี |  |
| year_level | integer | YES | ไม่มี |  |
| gpa | numeric(3,2) | YES | ไม่มี |  |
| track | enum_students_track | NO | 'co_op'::enum_students_track |  |
| status | enum_students_status | NO | 'pending'::enum_students_status |  |
| created_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| updated_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| advisor_teacher_id | uuid | YES | ไม่มี |  |
| coop_advisor_teacher_id | uuid | YES | ไม่มี |  |
| profile_image | varchar(255) | YES | ไม่มี |  |
### public.student_profiles

| Column จริง | Type จริง | Nullable | DB default | Source model / หมายเหตุ |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | Model UUIDV4 default เป็น application default; DB ไม่มี default |
| student_id | uuid | NO | ไม่มี |  |
| birth_date | date | YES | ไม่มี |  |
| height_cm | numeric(5,2) | YES | ไม่มี |  |
| weight_kg | numeric(5,2) | YES | ไม่มี |  |
| nationality | varchar(255) | YES | ไม่มี |  |
| ethnicity | varchar(255) | YES | ไม่มี |  |
| religion | varchar(255) | YES | ไม่มี |  |
| blood_type | varchar(255) | YES | ไม่มี |  |
| medical_conditions | text | YES | ไม่มี |  |
| allergies | text | YES | ไม่มี |  |
| special_abilities | text | YES | ไม่มี |  |
| related_skills | text | YES | ไม่มี |  |
| hometown_address | text | YES | ไม่มี |  |
| hometown_phone | varchar(255) | YES | ไม่มี |  |
| current_address | text | YES | ไม่มี |  |
| current_phone | varchar(255) | YES | ไม่มี |  |
| father_name | varchar(255) | YES | ไม่มี |  |
| father_age | integer | YES | ไม่มี |  |
| father_occupation | varchar(255) | YES | ไม่มี |  |
| mother_name | varchar(255) | YES | ไม่มี |  |
| mother_age | integer | YES | ไม่มี |  |
| mother_occupation | varchar(255) | YES | ไม่มี |  |
| parent_contact_address | text | YES | ไม่มี |  |
| parent_phone | varchar(255) | YES | ไม่มี |  |
| emergency_contact_name | varchar(255) | YES | ไม่มี |  |
| emergency_contact_relation | varchar(255) | YES | ไม่มี |  |
| emergency_contact_address | text | YES | ไม่มี |  |
| emergency_contact_phone | varchar(255) | YES | ไม่มี |  |
| created_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| updated_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| prefix | varchar(255) | YES | ไม่มี |  |
### public.student_files

| Column จริง | Type จริง | Nullable | DB default | Source model / หมายเหตุ |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | Model UUIDV4 default เป็น application default; DB ไม่มี default |
| student_id | uuid | NO | ไม่มี |  |
| file_type | enum_student_files_file_type | NO | ไม่มี |  |
| original_name | varchar(255) | NO | ไม่มี |  |
| storage_path | varchar(255) | NO | ไม่มี |  |
| mime_type | varchar(255) | NO | ไม่มี |  |
| file_size | bigint | NO | ไม่มี |  |
| created_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| updated_at | timestamp with time zone | NO | ไม่มี | Model timestamps createdAt/updatedAt; ไม่ใช่ field ผู้ใช้ |
| extracted_text | text | YES | ไม่มี |  |
| extraction_method | varchar(20) | YES | ไม่มี |  |
| extraction_status | varchar(20) | YES | ไม่มี |  |
| extracted_at | timestamp with time zone | YES | ไม่มี |  |

### Constraints / Indexes จริง และ Associations

| Table | Constraint | Definition จริง |
| --- | --- | --- |
| student_files | student_files_pkey | PRIMARY KEY (id) |
| student_files | student_files_storage_path_key | UNIQUE (storage_path) |
| student_files | student_files_student_id_fkey | FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE ON DELETE CASCADE |
| student_profiles | student_profiles_pkey | PRIMARY KEY (id) |
| student_profiles | student_profiles_student_id_fkey | FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE ON DELETE CASCADE |
| student_profiles | student_profiles_student_id_key | UNIQUE (student_id) |
| students | students_advisor_teacher_id_fkey | FOREIGN KEY (advisor_teacher_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL |
| students | students_coop_advisor_teacher_id_fkey | FOREIGN KEY (coop_advisor_teacher_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL |
| students | students_email_key | UNIQUE (email) |
| students | students_pkey | PRIMARY KEY (id) |
| students | students_student_id_key | UNIQUE (student_id) |

| Table | Index เฉพาะ | ความหมาย |
| --- | --- | --- |
| student_files | student_files_current_coop_project_unique | CREATE UNIQUE INDEX student_files_current_coop_project_unique ON public.student_files USING btree (student_id, file_type) WHERE (file_type = ANY (ARRAY['coop_project_book'::enum_student_files_file_type, 'coop_poster'::enum_student_files_file_type])) |
| student_files | student_files_one_resume_per_student | CREATE UNIQUE INDEX student_files_one_resume_per_student ON public.student_files USING btree (student_id) WHERE (file_type = 'resume'::enum_student_files_file_type) |
| students | students_class_advisor_idx | CREATE INDEX students_class_advisor_idx ON public.students USING btree (advisor_teacher_id) |

Student.hasOne StudentProfile (as profile); StudentProfile.belongsTo Student FK student_id → students.id UNIQUE CASCADE = 1:1; รหัสทางการ students.student_id เป็น varchar อีก columnหนึ่ง ไม่ใช่ profile.student_id UUID
Student.hasMany StudentFile และ CoopRequest; advisorTeacher/coopAdvisorTeacher FK teachers.id SET NULL
StudentFile metadata: original_name/storage_path/mime_type/file_size + resume extraction; enumจริงมี coop_poster,coop_project_book,coop_practice_log_book,resume เท่านั้น
ไม่มี age column, education/training/skill rating/document acknowledgement tables ใน public ที่ตรวจ ไม่มี separate User/StudentAccount model/table; Student เป็นบัญชีเอง

Teacher.department ใช้ scopeHeadตาม class advisor ([backend/src/services/roleWorkflow.service.js:85](../../backend/src/services/roleWorkflow.service.js#L85)) ไม่ยืนยัน Student.department; Company.address_no/subdistrict/district/province เป็นที่อยู่บริษัท ไม่ใช่นักศึกษา
CoopRequestPrerequisiteCourse เป็นผลวิชาก่อนสหกิจ ไม่ใช่ประวัติการศึกษา ([backend/src/models/coopRequestPrerequisiteCourse.model.js:12](../../backend/src/models/coopRequestPrerequisiteCourse.model.js#L12))
CoopDocument/CoopDocumentRevision เก็บหนังสือ cooperation/placement และ snapshot/version ไม่ใช่เอกสารสำเนาส่วนบุคคล ([backend/src/models/coopDocument.model.js:15](../../backend/src/models/coopDocument.model.js#L15))

### Migration evidence

อ่าน SELECT name FROM public.sequelize_meta โดยตรง ได้ 19 รายการ (001–018 รวม007a); 017_add_company_responses.js และ018_add_internship_logs.js ติดตั้งแล้ว
พบไฟล์019_add_supervision_appointments.js /020_add_supervision_results.js /021_add_coop_activities.js ในsource แต่ไม่อยู่ในmetadata และไม่พบตารางของทั้งสามชุดในcatalog
ไม่ได้เรียก db:migrate:status เพราะ runner ใช้ SequelizeStorage; ไม่เรียก model.sync/alter
007a_create_missing_base_tables.js:75 กำหนด student_profiles; prefix มีcolumnจริงด้วย ไม่ใช่ยืนยันจาก migrationเพียงอย่างเดียว
010_cleanup_student_file_schema_drift.js และ013_add_coop_projects_and_current_files.js เป็นหลักฐาน history/index ไม่ใช่เหตุให้รัน migration ใหม่

### Query protocol ที่ใช้ (ไม่มี credentials/ข้อมูลบุคคล)

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '8s';
SHOW transaction_read_only; -- on
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,
       character_maximum_length,numeric_precision,numeric_scale
FROM information_schema.columns WHERE table_schema='public'
ORDER BY table_name,ordinal_position;
SELECT c.relname AS table_name,con.conname,con.contype,
       pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class c ON con.conrelid=c.oid
JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname='public';
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public';
SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid;
SELECT name FROM public.sequelize_meta ORDER BY name;
ROLLBACK;
```

## การตรวจ validation แบบไม่แตะ DB

เรียก normalizeProfileData ที่ extractจากsourceในisolated VM ด้วยค่าจำลอง ไม่importmodels: omit{}, explicitblank/null, numericstring, negativeweight, fractionalparentage, invalidphone และunsupportedkey เป็นไปตามที่คาด (8กรณี)
กรณีวันที่ไม่มีจริง birth_date=2023-02-30 คาด reject แต่functionยอมรับ (1ข้อบกพร่องยืนยันได้); ไม่ได้ส่งข้อมูลนี้ให้API/DB
เหตุ: ตรวจรูปแบบและ Date parse/future แต่ไม่เปรียบเทียบ date.toISOString().slice(0,10)กลับกับinput ซึ่ง normalizeDate ของ CoopRequest ทำอยู่แล้ว
ความเสี่ยงเรื่องUTCเทียบlocalmidnightเป็น source finding ต้องเพิ่มกรณีวันนี้หลายtimezoneในimplementationภายหลัง

## ข้อจำกัดและสถานะสิ่งที่ยังไม่ยืนยัน

- ทก.01ต้นฉบับไม่พบ; ไม่ยืนยันว่าทุก TGDE field อยู่ในขอบเขตโครงการที่อนุมัติ
- catalogยืนยันเฉพาะDBที่configurationปัจจุบันเชื่อมถึง ไม่ใช่Production/DBอื่น และไม่อ่านrows จึงไม่ยืนยันความครบ/คุณภาพข้อมูลนักศึกษา
- ตรวจunauthenticatedAPI401เท่านั้น; ไม่มีTokenที่อนุญาตสำหรับตรวจ authenticatedGET และไม่มีlive save/upload/permission-cross-user tests
- ไม่startserver ไม่runmigration ไม่รันbackendacceptance/seed; ไม่รันbuildเพราะไม่มีการแก้applicationในรอบaudit
- เบราว์เซอร์/ภาพresponsive/keyboardในruntimeไม่ได้ตรวจ; source bindingsและpurevalidationverifiedเท่านั้น
- COMPLETEไม่เท่ากับระบบสามารถgenerateTGDE-COOP–02ทางการครบทุกหน้า; development letter templateปัจจุบันไม่ใช่แบบฟอร์มนี้

ดู [Missing Fields](FITM_STUDENT_PROFILE_MISSING_FIELDS.md), [Database Design](FITM_STUDENT_PROFILE_DATABASE_DESIGN.md), [UX/UI Plan](FITM_STUDENT_PROFILE_UXUI_PLAN.md)

## การตรวจรายงานก่อนส่งมอบ

ตรวจ Inventory/Mapping มี ID ไม่ซ้ำ 148 จุดและตรงกันทุก ID; ผลรวมสถานะ 24 + 12 + 96 + 16 = 148 ตรวจ source links ว่าไฟล์และบรรทัดมีอยู่ ตรวจไม่พบรูปแบบอีเมล/รหัสนักศึกษาจากไฟล์ตัวอย่างในรายงาน
เปรียบเทียบ SHA-256 ของไฟล์ทั้งหมดใน frontend/src และ backend/src จำนวน 196 ไฟล์ก่อน/หลัง audit: ไม่เปลี่ยน ไม่เพิ่ม ไม่ลบ รอบนี้เพิ่มเฉพาะ Markdown รายงาน 5 ไฟล์ใน docs/audits/
สถานะ Git ที่มี Frontend modified และรายงานเดิม/requirements untracked เป็นงานที่มีอยู่ก่อนเริ่ม audit นี้ ไม่ได้ revert/commit/push
ไม่รัน Frontend build หรือ Backend database tests ในรอบ audit เพราะไม่ได้แก้ application; authenticated runtime ยัง NOT TESTED ตามขอบเขต


