# FITM Student Profile Phase 2A — Field Coverage & Schema Dictionary

เอกสารเตรียมการเท่านั้น: ไม่ใช่ Schema ที่ติดตั้งแล้ว และไม่ใช่ API contract ใหม่

อ้างอิง Inventory/Mappings เดิมครบ 148 จุด; หลายแถว PDF ใช้ชนิดฟิลด์เดียวกัน ไม่ใช่ 148 คอลัมน์ใหม่
การจัดประเภทนี้เป็นแผน Phase 2A; auditStatus เดิมยังคงเดิม ไม่อ้างว่าฟิลด์ที่เตรียมพร้อมใช้งานแล้ว

| ประเภทแผน | จำนวนจุด PDF |
| --- | --- |
| Existing Column | 24 |
| New Scalar Column | 20 |
| Pending Policy | 20 |
| New Relation/Table | 63 |
| Existing File Storage | 5 |
| Existing Workflow | 16 |

| ID | Label | Audit เดิม | ประเภทแผน | แหล่งข้อมูล / ข้อจำกัด |
| --- | --- | --- | --- | --- |
| P1-01 | ส่วนตัว / รูปถ่ายหน้าตรง 1 นิ้ว | COMPLETE | Existing Column | students.profile_image (ขนาดรูปพิมพ์ 1 นิ้วเป็นงานอนาคต) |
| P1-02 | ส่วนตัว / ชื่อ–สกุลภาษาไทย | COMPLETE | Existing Column | students.first_name + last_name (read-only) |
| P1-03 | ส่วนตัว / ชื่อ–สกุลภาษาอังกฤษ | MISSING | New Scalar Column | student_profiles.english_first_name + english_last_name |
| P1-04 | ส่วนตัว / รหัสประจำตัวนักศึกษา | COMPLETE | Existing Column | students.student_id (read-only) |
| P1-05 | ส่วนตัว / สาขาวิชา | COMPLETE | Existing Column | students.major (read-only) |
| P1-06 | ส่วนตัว / ภาควิชา | MISSING | New Scalar Column | students.department (รอ master/policy) |
| P1-07 | ส่วนตัว / คณะ | MISSING | New Scalar Column | students.faculty (รอ master/policy) |
| P1-08 | ส่วนตัว / ชั้นปี | COMPLETE | Existing Column | students.year_level |
| P1-09 | ส่วนตัว / เกรดเฉลี่ยเทอมที่ผ่านมา | MISSING | New Scalar Column | students.last_semester_gpa |
| P1-10 | ส่วนตัว / เกรดเฉลี่ยสะสม | PARTIAL | Pending Policy | students.gpa: ยืนยันว่าเป็น GPA สะสม; ไม่เติมสำเนาหรือแปลความเอง |
| P1-11 | ส่วนตัว / เลขบัตรประชาชน | MISSING | New Scalar Column | student_profiles.national_id_ciphertext + national_id_key_version; รอ encryption policy |
| P1-12 | ส่วนตัว / วันที่ออกบัตรประชาชน | MISSING | New Scalar Column | student_profiles.national_id_issue_date |
| P1-13 | ส่วนตัว / วันที่หมดอายุบัตรประชาชน | MISSING | New Scalar Column | student_profiles.national_id_expiry_date |
| P1-14 | ส่วนตัว / วันเกิด | COMPLETE | Existing Column | student_profiles.birth_date |
| P1-15 | ส่วนตัว / อายุ | COMPLETE | Existing Column | คำนวณอายุจาก birth_date ณ วันอ้างอิง (ไม่เพิ่ม age column) |
| P1-16 | ส่วนตัว / เพศ | MISSING | New Scalar Column | student_profiles.gender (รอ vocabulary/policy) |
| P1-17 | ส่วนตัว / ส่วนสูง (ซม.) | COMPLETE | Existing Column | student_profiles.height_cm |
| P1-18 | ส่วนตัว / น้ำหนัก (กก.) | COMPLETE | Existing Column | student_profiles.weight_kg |
| P1-19 | ส่วนตัว / ศาสนา | COMPLETE | Existing Column | student_profiles.religion |
| P1-20 | ส่วนตัว / เชื้อชาติ | COMPLETE | Existing Column | student_profiles.ethnicity |
| P1-21 | ส่วนตัว / สัญชาติ | COMPLETE | Existing Column | student_profiles.nationality |
| P1-22 | ใบขับขี่/ทหาร / ใบขับขี่: มี/ไม่มี | MISSING | New Scalar Column | student_profiles.has_driving_license |
| P1-23 | ใบขับขี่/ทหาร / เลขใบอนุญาตขับขี่ | MISSING | New Scalar Column | student_profiles.driving_license_number |
| P1-24 | ใบขับขี่/ทหาร / ประเภทใบอนุญาตขับขี่ | MISSING | New Scalar Column | student_profiles.driving_license_type (รอรายการประเภท) |
| P1-25 | ใบขับขี่/ทหาร / วันหมดอายุใบอนุญาตขับขี่ | MISSING | New Scalar Column | student_profiles.driving_license_expiry_date |
| P1-26 | ใบขับขี่/ทหาร / ภาวะทางทหาร: รับการเกณฑ์แล้ว/ยังไม่ได้รับการเกณฑ์ | MISSING | New Scalar Column | student_profiles.military_status (served/not_yet_served; N/A รอ policy) |
| P1-27 | ทะเบียนบ้าน / บ้านเลขที่ตามทะเบียนบ้าน | PARTIAL | New Relation/Table | student_addresses[registered].house_no; เก็บ hometown_address เดิม |
| P1-28 | ทะเบียนบ้าน / ถนน | MISSING | New Relation/Table | student_addresses[registered].road; เก็บ hometown_address เดิม |
| P1-29 | ทะเบียนบ้าน / แขวง/ตำบล | MISSING | New Relation/Table | student_addresses[registered].subdistrict; เก็บ hometown_address เดิม |
| P1-30 | ทะเบียนบ้าน / อำเภอ/เขต | MISSING | New Relation/Table | student_addresses[registered].district; เก็บ hometown_address เดิม |
| P1-31 | ทะเบียนบ้าน / จังหวัด | MISSING | New Relation/Table | student_addresses[registered].province; เก็บ hometown_address เดิม |
| P1-32 | ทะเบียนบ้าน / รหัสไปรษณีย์ | MISSING | New Relation/Table | student_addresses[registered].postal_code; เก็บ hometown_address เดิม |
| P1-33 | ทะเบียนบ้าน / โทรศัพท์ตามทะเบียนบ้าน | PARTIAL | Pending Policy | student_profiles.hometown_phone: ยืนยันทะเบียนบ้านก่อน reuse |
| P1-34 | ที่อยู่ปัจจุบัน / บ้านเลขที่ปัจจุบัน | PARTIAL | New Relation/Table | student_addresses[current].house_no; เก็บ current_address เดิม |
| P1-35 | ที่อยู่ปัจจุบัน / ถนน | MISSING | New Relation/Table | student_addresses[current].road; เก็บ current_address เดิม |
| P1-36 | ที่อยู่ปัจจุบัน / แขวง/ตำบล | MISSING | New Relation/Table | student_addresses[current].subdistrict; เก็บ current_address เดิม |
| P1-37 | ที่อยู่ปัจจุบัน / อำเภอ/เขต | MISSING | New Relation/Table | student_addresses[current].district; เก็บ current_address เดิม |
| P1-38 | ที่อยู่ปัจจุบัน / จังหวัด | MISSING | New Relation/Table | student_addresses[current].province; เก็บ current_address เดิม |
| P1-39 | ที่อยู่ปัจจุบัน / รหัสไปรษณีย์ | MISSING | New Relation/Table | student_addresses[current].postal_code; เก็บ current_address เดิม |
| P1-40 | ที่อยู่ปัจจุบัน / โทรศัพท์ปัจจุบัน | COMPLETE | Existing Column | student_profiles.current_phone |
| P1-41 | ที่อยู่ปัจจุบัน / อีเมล | COMPLETE | Existing Column | students.email (read-only) |
| P1-42 | บิดา / ชื่อ–สกุล | COMPLETE | Existing Column | student_profiles.father_name |
| P1-43 | บิดา / อายุ | COMPLETE | Existing Column | student_profiles.father_age |
| P1-44 | บิดา / อาชีพ | COMPLETE | Existing Column | student_profiles.father_occupation |
| P1-45 | บิดา / ที่อยู่ปัจจุบัน | MISSING | New Scalar Column | student_profiles.father_address |
| P1-46 | บิดา / โทรศัพท์ | MISSING | New Scalar Column | student_profiles.father_phone |
| P1-47 | มารดา / ชื่อ–สกุล | COMPLETE | Existing Column | student_profiles.mother_name |
| P1-48 | มารดา / อายุ | COMPLETE | Existing Column | student_profiles.mother_age |
| P1-49 | มารดา / อาชีพ | COMPLETE | Existing Column | student_profiles.mother_occupation |
| P1-50 | มารดา / ที่อยู่ปัจจุบัน | MISSING | New Scalar Column | student_profiles.mother_address |
| P1-51 | มารดา / โทรศัพท์ | MISSING | New Scalar Column | student_profiles.mother_phone |
| P1-52 | ฉุกเฉิน / ชื่อ–สกุล | COMPLETE | Existing Column | student_profiles.emergency_contact_name |
| P1-53 | ฉุกเฉิน / ความเกี่ยวข้อง | COMPLETE | Existing Column | student_profiles.emergency_contact_relation |
| P1-54 | ฉุกเฉิน / อาชีพ | MISSING | New Scalar Column | student_profiles.emergency_contact_occupation |
| P1-55 | ฉุกเฉิน / สถานที่ทำงาน | MISSING | New Scalar Column | student_profiles.emergency_contact_workplace |
| P1-56 | ฉุกเฉิน / ที่อยู่ปัจจุบัน | COMPLETE | Existing Column | student_profiles.emergency_contact_address |
| P1-57 | ฉุกเฉิน / โทรศัพท์ | COMPLETE | Existing Column | student_profiles.emergency_contact_phone |
| P2-01 | ปริญญาตรี / สถานศึกษา | MISSING | New Relation/Table | student_education_records.institution_name (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-02 | ปริญญาตรี / วุฒิการศึกษา | MISSING | New Relation/Table | student_education_records.qualification (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-03 | ปริญญาตรี / วิชาเอก | MISSING | New Relation/Table | student_education_records.major (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-04 | ปริญญาตรี / GPA | MISSING | New Relation/Table | student_education_records.gpa (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-05 | ปริญญาตรี / ปีที่สำเร็จการศึกษา | MISSING | New Relation/Table | student_education_records.graduation_year (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-06 | อนุปริญญา/ปวส. / สถานศึกษา | MISSING | New Relation/Table | student_education_records.institution_name (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-07 | อนุปริญญา/ปวส. / วุฒิการศึกษา | MISSING | New Relation/Table | student_education_records.qualification (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-08 | อนุปริญญา/ปวส. / วิชาเอก | MISSING | New Relation/Table | student_education_records.major (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-09 | อนุปริญญา/ปวส. / GPA | MISSING | New Relation/Table | student_education_records.gpa (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-10 | อนุปริญญา/ปวส. / ปีที่สำเร็จการศึกษา | MISSING | New Relation/Table | student_education_records.graduation_year (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-11 | มัธยมปลาย/ปวช. / สถานศึกษา | MISSING | New Relation/Table | student_education_records.institution_name (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-12 | มัธยมปลาย/ปวช. / วุฒิการศึกษา | MISSING | New Relation/Table | student_education_records.qualification (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-13 | มัธยมปลาย/ปวช. / วิชาเอก | MISSING | New Relation/Table | student_education_records.major (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-14 | มัธยมปลาย/ปวช. / GPA | MISSING | New Relation/Table | student_education_records.gpa (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-15 | มัธยมปลาย/ปวช. / ปีที่สำเร็จการศึกษา | MISSING | New Relation/Table | student_education_records.graduation_year (แยก education_level; ไม่จำกัดจำนวนต่อระดับ) |
| P2-16 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 / ชื่อหลักสูตร | MISSING | New Relation/Table | student_training_records.course_name (ไม่จำกัด 5 รายการ) |
| P2-17 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 / สถาบัน | MISSING | New Relation/Table | student_training_records.institution (ไม่จำกัด 5 รายการ) |
| P2-18 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 / วุฒิ/ประกาศนียบัตรที่ได้รับ | MISSING | New Relation/Table | student_training_records.qualification (ไม่จำกัด 5 รายการ) |
| P2-19 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 1 / ระยะเวลา | MISSING | New Relation/Table | student_training_records.period_text (ไม่จำกัด 5 รายการ) |
| P2-20 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 / ชื่อหลักสูตร | MISSING | New Relation/Table | student_training_records.course_name (ไม่จำกัด 5 รายการ) |
| P2-21 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 / สถาบัน | MISSING | New Relation/Table | student_training_records.institution (ไม่จำกัด 5 รายการ) |
| P2-22 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 / วุฒิ/ประกาศนียบัตรที่ได้รับ | MISSING | New Relation/Table | student_training_records.qualification (ไม่จำกัด 5 รายการ) |
| P2-23 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 2 / ระยะเวลา | MISSING | New Relation/Table | student_training_records.period_text (ไม่จำกัด 5 รายการ) |
| P2-24 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 / ชื่อหลักสูตร | MISSING | New Relation/Table | student_training_records.course_name (ไม่จำกัด 5 รายการ) |
| P2-25 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 / สถาบัน | MISSING | New Relation/Table | student_training_records.institution (ไม่จำกัด 5 รายการ) |
| P2-26 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 / วุฒิ/ประกาศนียบัตรที่ได้รับ | MISSING | New Relation/Table | student_training_records.qualification (ไม่จำกัด 5 รายการ) |
| P2-27 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 3 / ระยะเวลา | MISSING | New Relation/Table | student_training_records.period_text (ไม่จำกัด 5 รายการ) |
| P2-28 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 / ชื่อหลักสูตร | MISSING | New Relation/Table | student_training_records.course_name (ไม่จำกัด 5 รายการ) |
| P2-29 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 / สถาบัน | MISSING | New Relation/Table | student_training_records.institution (ไม่จำกัด 5 รายการ) |
| P2-30 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 / วุฒิ/ประกาศนียบัตรที่ได้รับ | MISSING | New Relation/Table | student_training_records.qualification (ไม่จำกัด 5 รายการ) |
| P2-31 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 4 / ระยะเวลา | MISSING | New Relation/Table | student_training_records.period_text (ไม่จำกัด 5 รายการ) |
| P2-32 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 / ชื่อหลักสูตร | MISSING | New Relation/Table | student_training_records.course_name (ไม่จำกัด 5 รายการ) |
| P2-33 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 / สถาบัน | MISSING | New Relation/Table | student_training_records.institution (ไม่จำกัด 5 รายการ) |
| P2-34 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 / วุฒิ/ประกาศนียบัตรที่ได้รับ | MISSING | New Relation/Table | student_training_records.qualification (ไม่จำกัด 5 รายการ) |
| P2-35 | ฝึกอบรม/ดูงาน/ฝึกงาน รายการ 5 / ระยะเวลา | MISSING | New Relation/Table | student_training_records.period_text (ไม่จำกัด 5 รายการ) |
| P3-01 | คอมพิวเตอร์ รายการ 1 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[computer].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-02 | คอมพิวเตอร์ รายการ 1 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[computer].proficiency = very_good/good/moderate/fair |
| P3-03 | คอมพิวเตอร์ รายการ 2 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[computer].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-04 | คอมพิวเตอร์ รายการ 2 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[computer].proficiency = very_good/good/moderate/fair |
| P3-05 | คอมพิวเตอร์ รายการ 3 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[computer].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-06 | คอมพิวเตอร์ รายการ 3 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[computer].proficiency = very_good/good/moderate/fair |
| P3-07 | คอมพิวเตอร์ รายการ 4 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[computer].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-08 | คอมพิวเตอร์ รายการ 4 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[computer].proficiency = very_good/good/moderate/fair |
| P3-09 | ภาษา รายการ 1 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[language].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-10 | ภาษา รายการ 1 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[language].proficiency = very_good/good/moderate/fair |
| P3-11 | ภาษา รายการ 2 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[language].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-12 | ภาษา รายการ 2 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[language].proficiency = very_good/good/moderate/fair |
| P3-13 | ภาษา รายการ 3 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[language].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-14 | ภาษา รายการ 3 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[language].proficiency = very_good/good/moderate/fair |
| P3-15 | ภาษา รายการ 4 / ชื่อทักษะ | PARTIAL | New Relation/Table | student_skills[language].skill_name; เก็บข้อความ skills เดิมทุกค่า |
| P3-16 | ภาษา รายการ 4 / ระดับความสามารถ | MISSING | New Relation/Table | student_skills[language].proficiency = very_good/good/moderate/fair |
| P3-17 | เอกสาร / แนบ Transcript | MISSING | Existing File Storage | student_files.file_type = transcript; ใช้ file record จริง ไม่ใช้ checkbox เป็นหลักฐาน |
| P3-18 | เอกสาร / แนบสำเนาบัตรประชาชน | MISSING | Existing File Storage | student_files.file_type = national_id_copy; ใช้ file record จริง ไม่ใช้ checkbox เป็นหลักฐาน |
| P3-19 | เอกสาร / แนบสำเนาบัตรนักศึกษา | MISSING | Existing File Storage | student_files.file_type = student_id_copy; ใช้ file record จริง ไม่ใช้ checkbox เป็นหลักฐาน |
| P3-20 | เอกสาร / แนบเอกสารอื่น | MISSING | Existing File Storage | student_files.file_type = supporting_other; ใช้ file record จริง ไม่ใช้ checkbox เป็นหลักฐาน |
| P3-21 | เอกสาร / ระบุชนิดเอกสารอื่น | MISSING | Existing File Storage | student_files.document_label |
| P3-22 | รับรองข้อมูล / รับรองความจริงของข้อมูลและหลักฐาน | MISSING | Pending Policy | เสนอ acknowledgement ผูก coop_requests + revision/snapshot; ยังไม่มี migration |
| P3-23 | รับรองข้อมูล / ยอมรับประกาศ/ระเบียบสหกิจศึกษา | MISSING | Pending Policy | เสนอ acknowledgement ผูก coop_requests + revision/snapshot; ยังไม่มี migration |
| P3-24 | ลงนาม / ลายมือชื่อนักศึกษา | MISSING | Pending Policy | ลายเซ็น/ชื่อ/วันที่ลงนาม ต้องยืนยันกฎและหลักฐานก่อน; acknowledgement ไม่ใช่ลายเซ็น |
| P3-25 | ลงนาม / ชื่อผู้ลงนามนักศึกษาใต้ลายเซ็น | MISSING | Pending Policy | ลายเซ็น/ชื่อ/วันที่ลงนาม ต้องยืนยันกฎและหลักฐานก่อน; acknowledgement ไม่ใช่ลายเซ็น |
| P3-26 | ลงนาม / วันที่ลงนามนักศึกษา | MISSING | Pending Policy | ลายเซ็น/ชื่อ/วันที่ลงนาม ต้องยืนยันกฎและหลักฐานก่อน; acknowledgement ไม่ใช่ลายเซ็น |
| P4-01 | ใบสมัคร/ผลพิจารณา / ชื่อ–สกุลนักศึกษา | DIFFERENT WORKFLOW | Existing Workflow | students.first_name + students.last_name; request.student.first_name + last_name; เป็นข้อมูลอ้างอิงใบสมัคร ไม่ใช่ snapshot เดิม |
| P4-02 | ใบสมัคร/ผลพิจารณา / คณะ | MISSING | New Scalar Column | students.faculty (ข้อมูลอ้างอิง; snapshot ใบสมัครรอ policy) |
| P4-03 | ใบสมัคร/ผลพิจารณา / เบอร์โทรศัพท์นักศึกษา | DIFFERENT WORKFLOW | Existing Workflow | student_profiles.current_phone; request.student.profile.current_phone มี include; เป็นข้อมูลสด ไม่ใช่สำเนาที่ตรึง ณ วันสมัคร |
| P4-04 | ใบสมัคร/ผลพิจารณา / สถานประกอบการที่เลือก อันดับ 1 | MISSING | Pending Policy | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-05 | ใบสมัคร/ผลพิจารณา / สถานประกอบการที่เลือก อันดับ 2 | MISSING | Pending Policy | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-06 | ใบสมัคร/ผลพิจารณา / สถานประกอบการที่เลือก อันดับ 3 | MISSING | Pending Policy | คำร้องมี company_id/company_name หนึ่งแห่ง; ไม่มีลำดับ preference 1–3; company search/job matches ไม่ใช่อันดับสมัคร |
| P4-07 | ใบสมัคร/ผลพิจารณา / วันที่เริ่มปฏิบัติงาน | DIFFERENT WORKFLOW | Existing Workflow | coop_requests.work_start_date; อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-08 | ใบสมัคร/ผลพิจารณา / วันที่สิ้นสุดปฏิบัติงาน | DIFFERENT WORKFLOW | Existing Workflow | coop_requests.work_end_date; อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-09 | ใบสมัคร/ผลพิจารณา / ความพร้อมทางวิชาการ: เหมาะสม/ไม่เหมาะสม | MISSING | Pending Policy | มี prerequisite_courses(status/grade) และการอนุมัติรวม แต่ไม่มีผลตัดสินรายเกณฑ์; ไม่ใช่ education history |
| P4-10 | ใบสมัคร/ผลพิจารณา / หมายเหตุความพร้อมทางวิชาการ | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.reason; มี reason รวมต่อการอนุมัติ ไม่ได้แยกหมายเหตุวิชาการ; ต้องแยกเพิ่มใน Workflow หากจำเป็น |
| P4-11 | ใบสมัคร/ผลพิจารณา / ความประพฤติ: เหมาะสม/ไม่เหมาะสม | MISSING | Pending Policy | ไม่มีผลพิจารณาความประพฤติเฉพาะเกณฑ์; เป็นหน้าที่ผู้พิจารณา |
| P4-12 | ใบสมัคร/ผลพิจารณา / หมายเหตุความประพฤติ | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.reason; reason รวม ไม่ใช่หมายเหตุแยกความประพฤติ |
| P4-13 | ใบสมัคร/ผลพิจารณา / สถานประกอบการที่ได้ไปปฏิบัติงาน | DIFFERENT WORKFLOW | Existing Workflow | coop_requests.company_name; มี company_name/company_id ของคำร้อง; ใช้คำร้องที่ผ่านอนุมัติ/ตอบรับตาม Workflow ไม่เท่ากับเก็บผลจัดสรรหลายอันดับ |
| P4-14 | ใบสมัคร/ผลพิจารณา / ชื่อผู้ติดต่อประสานงาน/ผู้รับหนังสือ | DIFFERENT WORKFLOW | Existing Workflow | coop_requests.letter_recipient_name; อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-15 | ใบสมัคร/ผลพิจารณา / ตำแหน่งผู้ติดต่อประสานงาน | DIFFERENT WORKFLOW | Existing Workflow | coop_requests.letter_recipient_position_department; อยู่ในคำร้องเดิม; ไม่ย้ายมาแก้ใน Profile |
| P4-16 | ใบสมัคร/ผลพิจารณา / ลายมือชื่ออาจารย์/เจ้าหน้าที่สหกิจ | MISSING | Pending Policy | reviews ไม่เก็บภาพ/หลักฐานลายเซ็น; CoopDocument.metadata.signatory_name เป็นข้อความร่าง ไม่ใช่ TGDE signature |
| P4-17 | ใบสมัคร/ผลพิจารณา / ชื่อผู้ลงนามอาจารย์/เจ้าหน้าที่ใต้ลายเซ็น | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.teacher_id; มี actor teacher_id/department_staff_id + association ชื่อ; ไม่ใช่ชื่อที่ยืนยันการลงนามในเอกสาร |
| P4-18 | ใบสมัคร/ผลพิจารณา / วันที่ลงนามอาจารย์/เจ้าหน้าที่ | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.created_at; มี timestamp การตัดสินเท่านั้น; model attribute createdAt → created_at; ไม่ใช่ signature date |
| P4-19 | ใบสมัคร/ผลพิจารณา / ความเห็นหัวหน้าภาค: ไปได้/รอพิจารณา | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.decision; มี approve/reject ของ department_head + to_status; ไม่มี defer โดยตรง |
| P4-20 | ใบสมัคร/ผลพิจารณา / เหตุผลที่หัวหน้าภาครอพิจารณา | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.reason; มี reason การ reject ไม่ใช่ defer; ไม่เพิ่ม stage โดยไม่มีอนุมัติ Workflow |
| P4-21 | ใบสมัคร/ผลพิจารณา / เสนอชื่ออาจารย์นิเทศ | DIFFERENT WORKFLOW | Existing Workflow | students.coop_advisor_teacher_id; มีอาจารย์นิเทศที่ยืนยันผ่านโครงการ/การขอที่ปรึกษา; ไม่มี nomination เฉพาะขั้นตอนหน้า 4 |
| P4-22 | ใบสมัคร/ผลพิจารณา / ลายมือชื่อหัวหน้าภาค/ประธานอาจารย์นิเทศ | MISSING | Pending Policy | ไม่มี signature record; review/ข้อความชื่อไม่ใช่ลายเซ็น |
| P4-23 | ใบสมัคร/ผลพิจารณา / ชื่อหัวหน้าภาคใต้ลายเซ็น | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.teacher_id; มี teacher association ของผู้พิจารณา actor_role=department_head; ไม่ใช่ signature identity snapshot |
| P4-24 | ใบสมัคร/ผลพิจารณา / วันที่ลงนามหัวหน้าภาค | DIFFERENT WORKFLOW | Existing Workflow | coop_request_reviews.created_at; timestamp review ไม่ใช่การลงนามใน PDF; ไม่ใช้แทนโดยอัตโนมัติ |
| P4-25 | ใบสมัคร/ผลพิจารณา / ผลพิจารณาสถาบันสหกิจ: ไปได้/รอ/อื่นๆ | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-26 | ใบสมัคร/ผลพิจารณา / เหตุผลสถาบันที่รอพิจารณา | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-27 | ใบสมัคร/ผลพิจารณา / ข้อความอื่นๆ ของสถาบัน | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-28 | ใบสมัคร/ผลพิจารณา / ลายมือชื่อผู้พิจารณาสถาบัน | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-29 | ใบสมัคร/ผลพิจารณา / ชื่อผู้ลงนามสถาบันใต้ลายเซ็น | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |
| P4-30 | ใบสมัคร/ผลพิจารณา / วันที่ลงนามสถาบัน | MISSING | Pending Policy | ไม่พบ actor/stage สถาบันสหกิจใน Workflow เดิม; ต้องยืนยันขอบเขตและกระบวนการก่อนออกแบบเพิ่ม |

## Dictionary ของ Schema Source ที่เตรียม

nullable = YES หมายถึง draft/legacy อาจไม่มีข้อมูล ไม่ใช่ยืนยันว่าใบสมัครสมบูรณ์
UUID PK สร้างโดย application; ไม่มี DB UUID default. DEFAULT เป็นค่าที่ DB จัดการ ไม่รับจาก input.

### students — เพิ่มในตารางเดิม

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| department | varchar(255) | YES | ไม่มี | — |
| faculty | varchar(255) | YES | ไม่มี | — |
| last_semester_gpa | numeric(3,2) | YES | ไม่มี | — |
| profile_data_revision | bigint | NO | 0 | — |

CHECK: phase2a_last_semester_gpa: last_semester_gpa BETWEEN 0 AND 4; phase2a_profile_data_revision: profile_data_revision >= 0

### student_profiles — เพิ่มในตารางเดิม

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| english_first_name | varchar(255) | YES | ไม่มี | — |
| english_last_name | varchar(255) | YES | ไม่มี | — |
| gender | varchar(32) | YES | ไม่มี | — |
| national_id_ciphertext | bytea | YES | ไม่มี | — |
| national_id_key_version | varchar(80) | YES | ไม่มี | — |
| national_id_issue_date | date | YES | ไม่มี | — |
| national_id_expiry_date | date | YES | ไม่มี | — |
| has_driving_license | boolean | YES | ไม่มี | — |
| driving_license_number | varchar(64) | YES | ไม่มี | — |
| driving_license_type | varchar(100) | YES | ไม่มี | — |
| driving_license_expiry_date | date | YES | ไม่มี | — |
| military_status | varchar(32) | YES | ไม่มี | — |
| father_address | text | YES | ไม่มี | — |
| father_phone | varchar(32) | YES | ไม่มี | — |
| mother_address | text | YES | ไม่มี | — |
| mother_phone | varchar(32) | YES | ไม่มี | — |
| emergency_contact_occupation | varchar(255) | YES | ไม่มี | — |
| emergency_contact_workplace | varchar(255) | YES | ไม่มี | — |

CHECK: phase2a_national_id_pair: (national_id_ciphertext IS NULL) = (national_id_key_version IS NULL); phase2a_national_id_key: national_id_key_version IS NULL OR length(btrim(national_id_key_version)) > 0; phase2a_national_id_dates: national_id_expiry_date >= national_id_issue_date; phase2a_license_absent: has_driving_license IS DISTINCT FROM FALSE OR (driving_license_number IS NULL AND driving_license_type IS NULL AND driving_license_expiry_date IS NULL); phase2a_military_status: military_status IN ('served', 'not_yet_served'); phase2a_id_issue_year: extract(year FROM national_id_issue_date) BETWEEN 1 AND 9999; phase2a_id_expiry_year: extract(year FROM national_id_expiry_date) BETWEEN 1 AND 9999; phase2a_license_expiry_year: extract(year FROM driving_license_expiry_date) BETWEEN 1 AND 9999

### student_files — เพิ่มในตารางเดิม

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| document_label | varchar(255) | YES | ไม่มี | — |
| content_sha256 | char(64) | YES | ไม่มี | — |
| document_version | integer | YES | ไม่มี | — |
| supersedes_file_id | uuid | YES | ไม่มี | — |
| is_current | boolean | NO | TRUE | — |

CHECK: phase2a_file_hash: content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'; phase2a_file_version: document_version >= 1; phase2a_file_not_self: supersedes_file_id IS NULL OR supersedes_file_id <> id; phase2a_profile_file_metadata: file_type NOT IN ('transcript', 'national_id_copy', 'student_id_copy', 'supporting_other', 'external_profile_pdf') OR (content_sha256 IS NOT NULL AND document_version IS NOT NULL); phase2a_other_file_label: file_type <> 'supporting_other' OR (document_label IS NOT NULL AND length(btrim(document_label)) > 0)

### student_addresses — ตารางใหม่

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | PK |
| student_id | uuid | NO | ไม่มี | FK students.id; UPDATE RESTRICT / DELETE CASCADE |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| address_type | varchar(16) | NO | ไม่มี | — |
| house_no | varchar(100) | YES | ไม่มี | — |
| road | varchar(255) | YES | ไม่มี | — |
| subdistrict | varchar(100) | YES | ไม่มี | — |
| district | varchar(100) | YES | ไม่มี | — |
| province | varchar(100) | YES | ไม่มี | — |
| postal_code | varchar(16) | YES | ไม่มี | — |

CHECK: address_type: address_type IN ('registered', 'current')

UNIQUE: (student_id, address_type)

### student_education_records — ตารางใหม่

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | PK |
| student_id | uuid | NO | ไม่มี | FK students.id; UPDATE RESTRICT / DELETE CASCADE |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| education_level | varchar(32) | NO | ไม่มี | — |
| institution_name | varchar(255) | YES | ไม่มี | — |
| qualification | varchar(255) | YES | ไม่มี | — |
| major | varchar(255) | YES | ไม่มี | — |
| gpa | numeric(3,2) | YES | ไม่มี | — |
| graduation_year | smallint | YES | ไม่มี | — |
| display_order | integer | NO | 0 | — |

CHECK: education_level: education_level IN ('bachelor', 'high_vocational', 'high_school_vocational'); gpa: gpa BETWEEN 0 AND 4; graduation_year: graduation_year BETWEEN 1 AND 9999; display_order: display_order >= 0

INDEX: (student_id, display_order, id)

### student_training_records — ตารางใหม่

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | PK |
| student_id | uuid | NO | ไม่มี | FK students.id; UPDATE RESTRICT / DELETE CASCADE |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| course_name | varchar(255) | YES | ไม่มี | — |
| institution | varchar(255) | YES | ไม่มี | — |
| qualification | varchar(255) | YES | ไม่มี | — |
| period_text | varchar(255) | YES | ไม่มี | — |
| display_order | integer | NO | 0 | — |

CHECK: display_order: display_order >= 0

INDEX: (student_id, display_order, id)

### student_skills — ตารางใหม่

| Column | Type | Nullable | Default | Key/Delete |
| --- | --- | --- | --- | --- |
| id | uuid | NO | ไม่มี | PK |
| student_id | uuid | NO | ไม่มี | FK students.id; UPDATE RESTRICT / DELETE CASCADE |
| created_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamptz | NO | CURRENT_TIMESTAMP | — |
| category | varchar(16) | NO | ไม่มี | — |
| skill_name | varchar(255) | YES | ไม่มี | — |
| proficiency | varchar(16) | YES | ไม่มี | — |
| display_order | integer | NO | 0 | — |

CHECK: category: category IN ('computer', 'language'); proficiency: proficiency IN ('very_good', 'good', 'moderate', 'fair'); display_order: display_order >= 0

INDEX: (student_id, category, display_order, id)

student_files เพิ่ม UNIQUE(id, student_id), same-owner supersedes FK RESTRICT, current unique/index เฉพาะประเภทใหม่; คง legacy indexes เดิมทุกตัว

Ownership: ทุก child query/write ต้องใช้ JWT owner + student_id filter; student_id/id เป็น immutable/read-only จาก client. FK อย่างเดียวไม่ใช่ authorization.

DATE ตรวจปฏิทินจริงโดย PostgreSQL; API/Client ในอนาคตต้องใช้ calendar validation เดิมและแปลง พ.ศ.→ค.ศ. อย่างชัดเจน ไม่ส่ง JS rollover Date.

