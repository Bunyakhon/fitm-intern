# FITM Student Profile — Missing Fields and Priorities

วันที่ตรวจ 2026-10-10. READ-ONLY AUDIT; ข้อเสนอทั้งหมดรออนุมัติก่อนพัฒนา
หลักฐาน/ชนิดข้อมูลจริงและวิธี SELECT ดู [Field Mapping](FITM_STUDENT_PROFILE_FIELD_MAPPING.md); นิยามการนับดู [PDF Inventory](FITM_STUDENT_PROFILE_PDF_FIELD_INVENTORY.md)

## ผลรวม

148 จุดตามตำแหน่ง PDF: COMPLETE 24 / PARTIAL 12 / MISSING 96 / DIFFERENT WORKFLOW 16
FRONTEND ONLY / BACKEND ONLY / DATABASE ONLY / NOT VERIFIED = 0 ใน matrix นี้ โดยไม่ถือ authenticated runtime ว่าทดสอบแล้ว
52 จุดมี binding/ข้อมูลเดิมเกี่ยวข้อง; จุดที่ครบจริง 24 จุด ไม่ใช่ 52 จุด
PDF VERIFIED (4หน้า); DATABASE SCHEMA VERIFIED (public,30tables); OFFICIAL SCOPE NOT VERIFIED (ไม่พบ ทก.01); AUTHENTICATED API/BROWSER NOT TESTED

## จุดข้อมูลมีครบแล้ว — 24 จุด

| ID | หมวด | Field | แหล่งข้อมูล |
| --- | --- | --- | --- |
| P1-01 | ส่วนตัว | รูปถ่ายหน้าตรง 1 นิ้ว | students.profile_image |
| P1-02 | ส่วนตัว | ชื่อ–สกุลภาษาไทย | students.first_name + students.last_name |
| P1-04 | ส่วนตัว | รหัสประจำตัวนักศึกษา | students.student_id |
| P1-05 | ส่วนตัว | สาขาวิชา | students.major |
| P1-08 | ส่วนตัว | ชั้นปี | students.year_level |
| P1-14 | ส่วนตัว | วันเกิด | student_profiles.birth_date |
| P1-15 | ส่วนตัว | อายุ | student_profiles.birth_date (derived; ไม่มี column อายุ) |
| P1-17 | ส่วนตัว | ส่วนสูง (ซม.) | student_profiles.height_cm |
| P1-18 | ส่วนตัว | น้ำหนัก (กก.) | student_profiles.weight_kg |
| P1-19 | ส่วนตัว | ศาสนา | student_profiles.religion |
| P1-20 | ส่วนตัว | เชื้อชาติ | student_profiles.ethnicity |
| P1-21 | ส่วนตัว | สัญชาติ | student_profiles.nationality |
| P1-40 | ที่อยู่ปัจจุบัน | โทรศัพท์ปัจจุบัน | student_profiles.current_phone |
| P1-41 | ที่อยู่ปัจจุบัน | อีเมล | students.email |
| P1-42 | บิดา | ชื่อ–สกุล | student_profiles.father_name |
| P1-43 | บิดา | อายุ | student_profiles.father_age |
| P1-44 | บิดา | อาชีพ | student_profiles.father_occupation |
| P1-47 | มารดา | ชื่อ–สกุล | student_profiles.mother_name |
| P1-48 | มารดา | อายุ | student_profiles.mother_age |
| P1-49 | มารดา | อาชีพ | student_profiles.mother_occupation |
| P1-52 | ฉุกเฉิน | ชื่อ–สกุล | student_profiles.emergency_contact_name |
| P1-53 | ฉุกเฉิน | ความเกี่ยวข้อง | student_profiles.emergency_contact_relation |
| P1-56 | ฉุกเฉิน | ที่อยู่ปัจจุบัน | student_profiles.emergency_contact_address |
| P1-57 | ฉุกเฉิน | โทรศัพท์ | student_profiles.emergency_contact_phone |

## มีบางส่วน — 12 จุด

| ID | Field | Gap |
| --- | --- | --- |
| P1-10 | ส่วนตัว / เกรดเฉลี่ยสะสม | มี GPA เดียว label GPA; 0–4 / numeric(3,2); ต้องยืนยันว่า gpa หมายถึงสะสมก่อนใช้ใน PDF |
| P1-27 | ทะเบียนบ้าน / บ้านเลขที่ตามทะเบียนบ้าน | TEXT ภูมิลำเนาเป็นที่อยู่รวม; ไม่แยกบ้านเลขที่และไม่ยืนยันว่าเป็นทะเบียนบ้าน |
| P1-33 | ทะเบียนบ้าน / โทรศัพท์ตามทะเบียนบ้าน | มีโทรศัพท์ภูมิลำเนา; ต้องยืนยันความหมายทะเบียนบ้าน |
| P1-34 | ที่อยู่ปัจจุบัน / บ้านเลขที่ปัจจุบัน | TEXT ที่อยู่รวม; ไม่มีบ้านเลขที่แยก |
| P3-01 | คอมพิวเตอร์ รายการ 1 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-03 | คอมพิวเตอร์ รายการ 2 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-05 | คอมพิวเตอร์ รายการ 3 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-07 | คอมพิวเตอร์ รายการ 4 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-09 | ภาษา รายการ 1 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-11 | ภาษา รายการ 2 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-13 | ภาษา รายการ 3 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |
| P3-15 | ภาษา รายการ 4 / ชื่อทักษะ | TEXT special_abilities/related_skills รองรับข้อความอิสระ; ไม่มีรายการเฉพาะหมวดและลำดับแถว |

## อยู่ใน Workflow อื่น — 16 จุด

| ID | Field | โครงสร้างเดิม | ข้อจำกัด |
| --- | --- | --- | --- |
| P4-01 | ชื่อ–สกุลนักศึกษา | students.first_name + students.last_name | request.student.first_name + last_name; เป็นข้อมูลอ้างอิงใบสมัคร ไม่ใช่ snapshot เดิม |
| P4-03 | เบอร์โทรศัพท์นักศึกษา | student_profiles.current_phone | request.student.profile.current_phone มี include; เป็นข้อมูลสด ไม่ใช่สำเนาที่ตรึง ณ วันสมัคร |
| P4-07 | วันที่เริ่มปฏิบัติงาน | coop_requests.work_start_date | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-08 | วันที่สิ้นสุดปฏิบัติงาน | coop_requests.work_end_date | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-10 | หมายเหตุความพร้อมทางวิชาการ | coop_request_reviews.reason | มี reason รวมต่อการอนุมัติ ไม่ได้แยกหมายเหตุวิชาการ; ต้องแยกเพิ่มใน Workflow หากจำเป็น |
| P4-12 | หมายเหตุความประพฤติ | coop_request_reviews.reason | reason รวม ไม่ใช่หมายเหตุแยกความประพฤติ |
| P4-13 | สถานประกอบการที่ได้ไปปฏิบัติงาน | coop_requests.company_name | มี company_name/company_id ของคำร้อง; ใช้คำร้องที่ผ่านอนุมัติ/ตอบรับตาม Workflow ไม่เท่ากับเก็บผลจัดสรรหลายอันดับ |
| P4-14 | ชื่อผู้ติดต่อประสานงาน/ผู้รับหนังสือ | coop_requests.letter_recipient_name | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-15 | ตำแหน่งผู้ติดต่อประสานงาน | coop_requests.letter_recipient_position_department | อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-17 | ชื่อผู้ลงนามอาจารย์/เจ้าหน้าที่ใต้ลายเซ็น | coop_request_reviews.teacher_id | มี actor teacher_id/department_staff_id + association ชื่อ; ไม่ใช่ชื่อที่ยืนยันการลงนามในเอกสาร |
| P4-18 | วันที่ลงนามอาจารย์/เจ้าหน้าที่ | coop_request_reviews.created_at | มี timestamp การตัดสินเท่านั้น; model attribute createdAt → created_at; ไม่ใช่ signature date |
| P4-19 | ความเห็นหัวหน้าภาค: ไปได้/รอพิจารณา | coop_request_reviews.decision | มี approve/reject ของ department_head + to_status; ไม่มี defer โดยตรง |
| P4-20 | เหตุผลที่หัวหน้าภาครอพิจารณา | coop_request_reviews.reason | มี reason การ reject ไม่ใช่ defer; ไม่เพิ่ม stage โดยไม่มีอนุมัติ Workflow |
| P4-21 | เสนอชื่ออาจารย์นิเทศ | students.coop_advisor_teacher_id | มีอาจารย์นิเทศที่ยืนยันผ่านโครงการ/การขอที่ปรึกษา; ไม่มี nomination เฉพาะขั้นตอนหน้า 4 |
| P4-23 | ชื่อหัวหน้าภาคใต้ลายเซ็น | coop_request_reviews.teacher_id | มี teacher association ของผู้พิจารณา actor_role=department_head; ไม่ใช่ signature identity snapshot |
| P4-24 | วันที่ลงนามหัวหน้าภาค | coop_request_reviews.created_at | timestamp review ไม่ใช่การลงนามใน PDF; ไม่ใช้แทนโดยอัตโนมัติ |

## ยังไม่มี — 96 จุด (แจกแจงทุกช่อง)

| ID | หน้า/หมวด | Field | สิ่งที่ขาด |
| --- | --- | --- | --- |
| P1-03 | 1 / ส่วนตัว | ชื่อ–สกุลภาษาอังกฤษ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-06 | 1 / ส่วนตัว | ภาควิชา | Student ไม่มี department; Teacher.department ใช้กำหนดสิทธิ์ ไม่ใช่หลักฐานภาควิชาของนักศึกษา |
| P1-07 | 1 / ส่วนตัว | คณะ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-09 | 1 / ส่วนตัว | เกรดเฉลี่ยเทอมที่ผ่านมา | ไม่มี GPA แยกเทอม; ห้ามนำ Student.gpa ไปใช้สองความหมาย |
| P1-11 | 1 / ส่วนตัว | เลขบัตรประชาชน | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-12 | 1 / ส่วนตัว | วันที่ออกบัตรประชาชน | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-13 | 1 / ส่วนตัว | วันที่หมดอายุบัตรประชาชน | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-16 | 1 / ส่วนตัว | เพศ | ไม่มี gender; prefix นาย/นางสาว/นาง ไม่สามารถแทนเพศโดยอนุมาน |
| P1-22 | 1 / ใบขับขี่/ทหาร | ใบขับขี่: มี/ไม่มี | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-23 | 1 / ใบขับขี่/ทหาร | เลขใบอนุญาตขับขี่ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-24 | 1 / ใบขับขี่/ทหาร | ประเภทใบอนุญาตขับขี่ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-25 | 1 / ใบขับขี่/ทหาร | วันหมดอายุใบอนุญาตขับขี่ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-26 | 1 / ใบขับขี่/ทหาร | ภาวะทางทหาร: รับการเกณฑ์แล้ว/ยังไม่ได้รับการเกณฑ์ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-28 | 1 / ทะเบียนบ้าน | ถนน | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-29 | 1 / ทะเบียนบ้าน | แขวง/ตำบล | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-30 | 1 / ทะเบียนบ้าน | อำเภอ/เขต | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-31 | 1 / ทะเบียนบ้าน | จังหวัด | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-32 | 1 / ทะเบียนบ้าน | รหัสไปรษณีย์ | ไม่พบ field แยก; hometown_address เป็นเพียงข้อความรวม ห้ามเดา/แยกข้อมูลเดิมอัตโนมัติ |
| P1-35 | 1 / ที่อยู่ปัจจุบัน | ถนน | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-36 | 1 / ที่อยู่ปัจจุบัน | แขวง/ตำบล | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-37 | 1 / ที่อยู่ปัจจุบัน | อำเภอ/เขต | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-38 | 1 / ที่อยู่ปัจจุบัน | จังหวัด | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-39 | 1 / ที่อยู่ปัจจุบัน | รหัสไปรษณีย์ | ไม่พบ field แยก; current_address เป็นข้อความรวม |
| P1-45 | 1 / บิดา | ที่อยู่ปัจจุบัน | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-46 | 1 / บิดา | โทรศัพท์ | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-50 | 1 / มารดา | ที่อยู่ปัจจุบัน | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-51 | 1 / มารดา | โทรศัพท์ | parent_contact_address / parent_phone เป็นผู้ปกครองร่วม ไม่มี binding เฉพาะบิดาหรือมารดา; ห้ามนำมาซ้ำโดยเดา |
| P1-54 | 1 / ฉุกเฉิน | อาชีพ | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P1-55 | 1 / ฉุกเฉิน | สถานที่ทำงาน | เพิ่มฟิลด์หลังอนุมัติ; ไม่มี binding ที่รองรับในระบบปัจจุบัน |
| P2-01 | 2 / ปริญญาตรี | สถานศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-02 | 2 / ปริญญาตรี | วุฒิการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-03 | 2 / ปริญญาตรี | วิชาเอก | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-04 | 2 / ปริญญาตรี | GPA | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-05 | 2 / ปริญญาตรี | ปีที่สำเร็จการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-06 | 2 / อนุปริญญา/ปวส. | สถานศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-07 | 2 / อนุปริญญา/ปวส. | วุฒิการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-08 | 2 / อนุปริญญา/ปวส. | วิชาเอก | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-09 | 2 / อนุปริญญา/ปวส. | GPA | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-10 | 2 / อนุปริญญา/ปวส. | ปีที่สำเร็จการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-11 | 2 / มัธยมปลาย/ปวช. | สถานศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-12 | 2 / มัธยมปลาย/ปวช. | วุฒิการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-13 | 2 / มัธยมปลาย/ปวช. | วิชาเอก | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-14 | 2 / มัธยมปลาย/ปวช. | GPA | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-15 | 2 / มัธยมปลาย/ปวช. | ปีที่สำเร็จการศึกษา | เพิ่ม education record; Student.major/gpa ปัจจุบัน ไม่แทนประวัติแต่ละระดับ |
| P2-16 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | ชื่อหลักสูตร | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-17 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | สถาบัน | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-18 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | วุฒิ/ประกาศนียบัตรที่ได้รับ | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-19 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 | ระยะเวลา | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-20 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | ชื่อหลักสูตร | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-21 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | สถาบัน | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-22 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | วุฒิ/ประกาศนียบัตรที่ได้รับ | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-23 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 | ระยะเวลา | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-24 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | ชื่อหลักสูตร | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-25 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | สถาบัน | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-26 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | วุฒิ/ประกาศนียบัตรที่ได้รับ | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-27 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 | ระยะเวลา | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-28 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | ชื่อหลักสูตร | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-29 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | สถาบัน | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-30 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | วุฒิ/ประกาศนียบัตรที่ได้รับ | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-31 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 | ระยะเวลา | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-32 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | ชื่อหลักสูตร | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-33 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | สถาบัน | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-34 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | วุฒิ/ประกาศนียบัตรที่ได้รับ | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P2-35 | 2 / ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 | ระยะเวลา | เพิ่ม training record; internship_daily_logs และ prerequisite_courses ไม่ใช่ประวัติอบรม |
| P3-02 | 3 / คอมพิวเตอร์ รายการ 1 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-04 | 3 / คอมพิวเตอร์ รายการ 2 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-06 | 3 / คอมพิวเตอร์ รายการ 3 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-08 | 3 / คอมพิวเตอร์ รายการ 4 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-10 | 3 / ภาษา รายการ 1 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-12 | 3 / ภาษา รายการ 2 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-14 | 3 / ภาษา รายการ 3 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-16 | 3 / ภาษา รายการ 4 | ระดับความสามารถ | ไม่มี rating enum; เพิ่มหนึ่งค่าต่อทักษะ: ดีมาก/ดี/ปานกลาง/พอใช้; ไม่อนุมานจากเครื่องหมายในตัวอย่าง |
| P3-17 | 3 / เอกสาร | แนบ Transcript | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-18 | 3 / เอกสาร | แนบสำเนาบัตรประชาชน | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-19 | 3 / เอกสาร | แนบสำเนาบัตรนักศึกษา | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-20 | 3 / เอกสาร | แนบเอกสารอื่น | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-21 | 3 / เอกสาร | ระบุชนิดเอกสารอื่น | StudentFile.file_type มีเพียง resume/coop_project_book/coop_poster/coop_practice_log_book; CoopDocument เป็นหนังสือ Workflow คนละวัตถุประสงค์ |
| P3-22 | 3 / รับรองข้อมูล | รับรองความจริงของข้อมูลและหลักฐาน | ข้อความรับรองใน PDF ไม่ใช่ checkbox เดิม; เสนอ acknowledgement แยกประเภท/เวอร์ชันและ timestamp; ไม่เท่ากับลายเซ็น |
| P3-23 | 3 / รับรองข้อมูล | ยอมรับประกาศ/ระเบียบสหกิจศึกษา | ข้อความรับรองใน PDF ไม่ใช่ checkbox เดิม; เสนอ acknowledgement แยกประเภท/เวอร์ชันและ timestamp; ไม่เท่ากับลายเซ็น |
| P3-24 | 3 / ลงนาม | ลายมือชื่อนักศึกษา | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
| P3-25 | 3 / ลงนาม | ชื่อผู้ลงนามนักศึกษาใต้ลายเซ็น | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
| P3-26 | 3 / ลงนาม | วันที่ลงนามนักศึกษา | ไม่มี signature/consent record หรือ application snapshot; ชื่อบัญชีเป็นเพียงค่าที่นำมาเติมได้ ไม่ใช่หลักฐานการลงนาม |
| P4-02 | 4 / ใบสมัคร/ผลพิจารณา | คณะ | Student ไม่มี faculty; ต้องเก็บ master/ข้อมูลนักศึกษาก่อนนำเข้า snapshot ใบสมัคร |
| P4-04 | 4 / ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 1 | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-05 | 4 / ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 2 | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-06 | 4 / ใบสมัคร/ผลพิจารณา | สถานประกอบการที่เลือก อันดับ 3 | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-09 | 4 / ใบสมัคร/ผลพิจารณา | ความพร้อมทางวิชาการ: เหมาะสม/ไม่เหมาะสม | มี prerequisite_courses(status/grade) และการอนุมัติรวม แต่ไม่มีผลตัดสินรายเกณฑ์; ไม่ใช่ education history |
| P4-11 | 4 / ใบสมัคร/ผลพิจารณา | ความประพฤติ: เหมาะสม/ไม่เหมาะสม | ไม่มีผลพิจารณาความประพฤติเฉพาะเกณฑ์; เป็นหน้าที่ผู้พิจารณา |
| P4-16 | 4 / ใบสมัคร/ผลพิจารณา | ลายมือชื่ออาจารย์/เจ้าหน้าที่สหกิจ | reviews ไม่เก็บภาพ/หลักฐานลายเซ็น; CoopDocument.metadata.signatory_name เป็นข้อความร่าง ไม่ใช่ TGDE signature |
| P4-22 | 4 / ใบสมัคร/ผลพิจารณา | ลายมือชื่อหัวหน้าภาค/ประธานอาจารย์นิเทศ | ไม่มี signature record; review/ข้อความชื่อไม่ใช่ลายเซ็น |
| P4-25 | 4 / ใบสมัคร/ผลพิจารณา | ผลพิจารณาสถาบันสหกิจ: ไปได้/รอ/อื่นๆ | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-26 | 4 / ใบสมัคร/ผลพิจารณา | เหตุผลสถาบันที่รอพิจารณา | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-27 | 4 / ใบสมัคร/ผลพิจารณา | ข้อความอื่นๆ ของสถาบัน | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-28 | 4 / ใบสมัคร/ผลพิจารณา | ลายมือชื่อผู้พิจารณาสถาบัน | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-29 | 4 / ใบสมัคร/ผลพิจารณา | ชื่อผู้ลงนามสถาบันใต้ลายเซ็น | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-30 | 4 / ใบสมัคร/ผลพิจารณา | วันที่ลงนามสถาบัน | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |

## ไม่มีรายการในสถานะเฉพาะ Frontend/Backend/Database

ไม่พบฟิลด์ตาม PDF ที่มีเพียง label/column โดดๆแต่สามารถยืนยันเป็น mapping ตามความหมายจริงได้
Student.profileข้อมูลปัจจุบันเชื่อม source→API→column; fieldที่คล้ายกันแต่ไม่ตรงความหมาย เช่น Teacher.department, Company.address_no, Student.gpa ของประวัติแต่ละระดับ ไม่จัดเป็น BACKEND ONLY เพื่อไม่อ้างว่ารองรับผิดๆ
อายุเป็นderived COMPLETE ไม่ใช่ FRONTEND ONLY เพราะดึงวันเกิดจริงและไม่จำเป็นต้องมีagecolumn

## P1 — ความถูกต้องและช่องข้อมูลที่ TGDE ยืนยันว่าต้องมี

P1 ในรายงานนี้หมายถึงจำเป็นต่อการรองรับ TGDE ที่ตรวจแล้ว; ความเป็น P1 ตาม “ขอบเขตโครงการอนุมัติใน ทก.01” ยังสรุปไม่ได้จนได้ต้นฉบับ
ไม่ถือว่าสถานะ P1 เป็นอนุญาตให้พัฒนา/schema change

| ลำดับ | งาน | เหตุผล/หลักฐาน |
| --- | --- | --- |
| P1-01 | กัน save เมื่อ initial GET fail; ส่งเฉพาะ dirtyfields; version conflict/atomic owner upsert | FE loadStudentProfile:303 catch currentStudentProfile=null; saveStudentProfile:1476 ส่ง28fieldรวม; backend upsert:225ไม่มีversion/transaction |
| P1-02 | ตรวจวันที่จริง/format+timezone; แยก GPA เทอมและสะสม | pure validator 8กรณีถูกต้อง แต่2023-02-30ผ่าน; genericgpaมีความหมายไม่ยืนยัน |
| P1-03 | ชื่ออังกฤษ ภาควิชา คณะ เลขบัตร/วันออก/หมดอายุ เพศ ใบขับขี่/ภาวะทหาร | PDFหน้า1; ไม่มีตรงfield; prefix/Teacher.departmentแทนไม่ได้ |
| P1-04 | ที่อยู่ทะเบียนบ้าน/ปัจจุบันแยกส่วน; father/motherแยกที่อยู่และphone; emergencyoccupation/workplace | PDFหน้า1; textที่อยู่/parentช่องร่วมยังไม่ตรง |
| P1-05 | education3ระดับ/training5รายการ/skillname+rating4ระดับ | PDFหน้า2–3; ไม่มีrecordtable; TEXTskillsยังไม่ครบ |
| P1-06 | TGDEattachments3ประเภท+others; protectedfileaccess; acknowledgements+ลงนามที่ผูกใบสมัคร | PDFหน้า3; StudentFileenumเดิมไม่รองรับ; ไม่เอาresumeแทนสำเนา/ไม่เอาcheckboxแทนsignature |
| P1-07 | หารือ scopeของcompanypreferences/criterionreview/headnomination/institutereview | PDFหน้า4; companyหนึ่งแห่ง/prerequisites/approve-rejectไม่เท่ากับข้อกำหนดทุกข้อ; ห้ามแทรกstage/แก้Workflowโดยไม่อนุมัติ |
| P1-08 | ตรวจ bytesจริงของprofile/resumeและcacheheadersก่อนรองรับเอกสารอ่อนไหว | upload.middleware:36ตรวจfile.mimetypeจากheader; profilecontroller:557sendFileไม่มีprivate/no-store/nosniffแบบprojectpreview |

## P2 — ความสมบูรณ์และรักษาระบบเดิม

- รักษาคำนำหน้า/กรุ๊ปเลือด/โรคประจำตัว/แพ้/ผู้ปกครอง/อาจารย์/related_skillsที่ระบบมี ไม่ตีความว่าหายไปจากTGDEแล้วลบได้
- ยืนยันชื่อสาขาที่จะพิมพ์จากรหัสIT/INE; เลือกsourceoftruthสำหรับdepartment/faculty ห้ามอนุมานจากอาจารย์เพื่อให้scopeผ่าน
- Validation stringmaxlengthตรงvarchar255 และnumericprecision; APIส่งnullได้แต่UIstudentinfoบังคับrequired; อธิบายสองระดับ draftกับreadytosubmit
- สร้างapplication snapshotที่ใช้ค่าชุดเดียว ณ วันรับรอง; modelcreatedAtของreviewไม่ใช่วันลงนาม
- ประวัติการเปลี่ยนข้อมูลที่จำเป็น เก็บactor/changedfields/version ไม่เก็บเลขบัตรหรือเนื้อหาเอกสารในlog
- กันโหลดข้อมูลทับdraftระหว่างrequests; ตรวจข้อมูลdirtyขณะclosing/reopeningModal; imageuploadสำเร็จแต่GETรูปfailต้องแยกfeedback
- Concurrentแรกสร้างprofile1:1อาจuniqueconflict →500; สองupdateจากสองsessionlastwritewins; columnuniqueไม่แก้staleoverwrite
- หลักฐานExistingSystemด้านhealth/guardianเป็นprivacy-sensitive; จำกัดการอ่านของrolesตามหน้าที่ ไม่เติมทั้งหมดลงreviewDTOโดยอัตโนมัติ

## P3 — UX/UI Enhancement

5horizontalTabs, field-levelerrors, pertabcompletionที่คำนวณจากข้อมูลจริง, scrollintoviewจุดผิด, keyboard/focustrap, mobiletabscroll, documentprogressเฉพาะที่APIรายงาน, serverdraft/autosaveเฉพาะเมื่อมีAPIจริง
ตรวจ desktop1440/1366,tablet768,mobile390 ในimplementationรอบหน้า; รอบauditไม่อ้างว่าทดสอบแล้ว

## Risk register ที่ต้องยืนยันก่อนลงมือ

| Risk | ระดับ | หลักฐาน/ผลที่อาจเกิด | แนวทางหลังอนุมัติ |
| --- | --- | --- | --- |
| Fullpayload + failedGET + nullablecolumns | สูง | หลังGETfailcurrentStudentProfile=nullแต่เปิดModalได้; ช่องว่างส่งnullทั้ง28field; overwritedata | disableedituntilvalidload/ใช้partialdirtypayload/version |
| Staleclient/concurrentsaves | สูง | ไม่มีprofileversionหรือCAS; profile/studentinfosavingguardsแยกกัน | serveroptimisticversion+transaction; preservemid-requestchanges |
| birthdatecalendar/timezone | กลาง | วันที่ไม่มีจริงผ่านfunction; UTCเทียบlocalmidnightอาจrejecttodayบางtimezone | round-tripdateonly + calendarcomparison; meaningfulcasesbeforeimplement |
| MIMEheaderเป็นหลัก | สูงเมื่อเพิ่มIDcopies | profile/resumeตรวจheaderเป็นหลัก; projectuploadserviceตรวจmagicจริงอยู่แล้ว | reusebytevalidation,privatestorage,authorization,scan |
| privateimagecaching | กลาง | profilegetterres.sendFileไม่มีexplicitprivate/no-store/nosniff | private/no-store headersเหมือนprojectpreview; infrastructure runtimecheck |
| รอพิจารณา/สถาบันไม่มีstage | สูงด้านscope | sourceมีteacher→head→approved; Staffcancel/issuedocs ไม่ใช่สถาบันreview | ยืนยันขอบเขตกับต้นฉบับ/เจ้าของWorkflowก่อนdesignเพิ่มเติม |
| FALSEcompletion | กลาง | 24completefieldsไม่เท่ากับPDFพร้อมหรือข้อมูลในทุกrowครบ | แยกprofilecompleteness/applicationreadiness/docverified/signature |
| Privacyinlogs/report | สูง | ID/health/สำเนาบัตรเป็นข้อมูลละเอียด | mask/redact/minimizedTOs; รายงานนี้ไม่ใช้ค่าบุคคลหรือsecret |

## ข้อจำกัด

ไม่ได้แก้ข้อบกพร่องใดในรอบนี้ตามข้อกำหนด read-only
ไม่พบ ทก.01 ไม่ทราบpolicyการลงนาม/เกณฑ์เข้าร่วมฉบับทางการ ไม่ยืนยันฐานProduction ไม่อ่านบุคคลจริงจากDB
APIunauthGET2routesตอบ401; authenticatedGET/PUT/upload/preview/owner-isolationยังNOTTESTED
ไม่มีapplicationchangesจึงไม่runfrontendbuild/backendacceptanceที่อาจเขียนDB; purefunctionchecksเป็นหลักฐานauditไม่ใช่end-to-endtest

