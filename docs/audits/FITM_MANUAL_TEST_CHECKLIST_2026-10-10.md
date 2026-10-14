# FITM — Checklist ทดสอบด้วยมือครบ feature inventory

วันที่รายงาน: **10 ตุลาคม 2026 (Asia/Bangkok)** · branch `main` · HEAD `0ab9765`

งานนี้เป็น **READ-ONLY SOURCE AUDIT + MANUAL TEST PLANNING** อ่าน working tree, source, test definitions และหลักฐานเก่าเท่านั้น ไม่รัน automated tests, browser automation, app startup, migration, seed, API mutations หรือ Docker/DB commands และไม่แก้ source/config/ข้อมูลจริง สร้างเฉพาะรายงาน Markdown ใหม่ห้าไฟล์ใน `docs/audits/` Git status ก่อนเริ่มไม่มี uncommitted changes

**OFFICIAL SCOPE NOT VERIFIED**: ค้นไฟล์ PDF ใน workspace แล้วไม่พบ ทก.01 ต้นฉบับ จึงยังยืนยันเลขข้อ ถ้อยคำ จำนวนข้อ และความครบถ้วนทางการไม่ได้ เลข 2.3.* ในรายงานนี้เป็น provisional IDs จาก baseline เดิม/README เท่านั้น 56 แถวคือ baseline audit ไม่ใช่จำนวน requirement ทางการ

**ผลทดสอบมือทั้งหมด: NOT TESTED / ช่องผลยังว่าง** ไม่เปิด browser, PostgreSQL หรือ Docker ในงานนี้ เป็นข้อจำกัดของขอบเขตที่ผู้ใช้กำหนด ไม่ใช่หลักฐานว่า environment เสียหรือเข้าถึงไม่ได้ ผล PASS ที่อ้างต่อไปนี้เป็นหลักฐานเก่าที่อ่านเท่านั้น

## วิธีใช้และข้อมูลที่ต้องเตรียม

Checklist นี้มี **90 กรณีหลัก** สำหรับ baseline 56 + extra/shared 34 และ **8 กรณี security เสริม** รวม **98 Test IDs** หนึ่งกรณีอาจมีหลาย substeps/negative paths ไม่ใช่ 98 requirement ทางการ ผู้ใช้เปิดเว็บไซต์และคลิกเองเท่านั้น ไม่ใช้ scripts/runners/automation

URL ด้านล่างเป็น path ที่พบใน source; เติม frontend origin ที่ environment ของผู้ใช้เปิดไว้ (Vite default :5173 เป็น config fallback ไม่ใช่ server ที่ตรวจแล้ว) Student panel เป็น data-target ที่เปลี่ยนผ่านปุ่ม sidebar ไม่ใช่ route/hash ที่ยืนยันว่าเปิดตรงได้ Staff/Teacher/Head ใช้ anchor ที่ HTML มีจริง Mentor token link และ company email link ต้องมาจากระบบ/inbox ทดสอบ ห้ามคัดลอก raw token ไปในรายงาน

ให้ผู้ดูแลเตรียมบัญชี/record ทดสอบที่ได้รับอนุญาตไว้ก่อน: Student A/B, Class Advisor A, Project Advisor B, Head ภาคเดียว/ต่างภาค, Staff active, Company inbox, Mentor original/substitute; ห้ามผู้ตรวจสร้าง seed/reset/migration เพื่อเตรียมเอง หาก schema/provider/ข้อมูลก่อนทดสอบไม่พร้อม ให้กรอก NOT TESTED พร้อมเหตุผล ไม่แปลว่า feature ไม่มี source

ผลทุกช่องเว้นไว้ให้ผู้ใช้เลือก PASS/FAIL/NOT TESTED และเขียน actual ผลการสำรวจว่าไม่มี implementation ไม่ใช่ PASS ของ requirement; ใช้ Bug ID และแยก gap ออกจาก test ที่ยังทำไม่ได้ ภาพทุกภาพปิด email/name/student number/tokens และ address bar ที่มี capability; เก็บ screenshot ตามนโยบายทีม ไม่ได้สร้างไฟล์ภาพใน audit นี้

สำหรับ case มี write: ผู้ใช้ต้องเลือกเฉพาะ test records/environment ที่ได้รับอนุญาต Checklist เป็นแผนในอนาคต audit นี้ไม่ได้ทำ mutation ใด ๆ การตรวจ pgAdmin ให้เป็น SELECT/read-only และไม่เปิดข้อมูลลับ การ Refresh ตรวจเฉพาะข้อมูลที่กดบันทึกสำเร็จ; อย่าสมมติ draft ที่ไม่บันทึกต้อง persist หาก code ไม่รองรับ

บัญชีนักศึกษาทดสอบสำหรับกรณีสมัครต้องใช้อีเมลมหาวิทยาลัยโดเมน `@email.kmutnb.ac.th` ที่ได้รับอนุญาต และรหัสผ่านใหม่ยาว 8–100 ตัวอักษรตาม model โดยไม่จดรหัสผ่านลงรายงาน หากไม่มีบัญชี/อีเมลทดสอบที่อนุญาต ให้เว้นขั้นสมัครเป็น NOT TESTED และใช้บัญชีที่ผู้ดูแลเตรียมสำหรับกรณี Login ต่อไป หลักฐาน: `frontend/src/pages/register.js` และ `backend/src/models/student.model.js`

## Checklist สรุป (90 กรณีหลัก)

| Test ID | Requirement ID | บทบาท | ฟังก์ชัน | เมนู/หน้า | สิ่งทดสอบ | Expected Result | PASS | FAIL | NOT TESTED | Bug ID |
|---|---|---|---|---|---|---|---|---|---|---|
| MAN-STU-001 | 2.3.1.1 (1) | Student | สมัครสมาชิก / เข้าสู่ระบบนักศึกษา / Google OAuth | login/register | สมัครด้วยข้อมูลทดสอบตามโดเมนที่อนุญาต; ออกจากระบบ; Login; ลองรหัสผ่านผิดหนึ่งครั้ง; กด Google | ใช้บัญชีโดเมนที่ model อนุญาต; email/password login สำเร็จ; duplicate 409; wrong login 401; Google ยังแจ้ง placeholder จึงไม่ผ่าน OAuth acceptance | ☐ | ☐ | ☐ |  |
| MAN-STU-002 | 2.3.1.1 (2) | Student | ประวัติส่วนตัว การศึกษา ครอบครัว ฉุกเฉินและทักษะ | panel-profile | เปิดแก้ไขประวัติ; แก้แต่ละกลุ่มข้อมูลที่อนุญาต; เลือกอาจารย์ประจำชั้น; บันทึก | ค่าทุกกลุ่มบันทึกตรงเดิมหลังเปิดใหม่; Class advisor ถูกเก็บใน advisor_teacher_id; ห้ามแก้ field สิทธิ์จากฟอร์ม | ☐ | ☐ | ☐ |  |
| MAN-STU-003 | 2.3.1.1 (3) | Student | อัปโหลดและแทนที่ Resume | panel-profile | เลือก PDF ข้อความไทย/อังกฤษ ≤10MB; อัปโหลด; ดู extraction status; แทนที่ PDF ฉบับใหม่ | ไฟล์ใหม่แทนไฟล์เดิมเพียง Resume ปัจจุบัน; invalid type/size ถูกปฏิเสธ; extraction ready/failed แสดงตามจริง | ☐ | ☐ | ☐ |  |
| MAN-STU-004 | 2.3.1.1 (4) | Student | แนะนำงานจากทักษะและ Resume | panel-job-matching | บันทึกทักษะ; กดค้นหาจากทักษะ; อัปโหลด Resume ที่ ready; กดค้นหาจาก Resume | ผลสูงสุด 5 อันดับเรียงคะแนน/ID; ไม่มีข้อความเพียงพอให้ 422; NLP unavailable 503/504/502; expired published jobs เป็น gap | ☐ | ☐ | ☐ |  |
| MAN-STU-005 | 2.3.1.1 (5) | Student | ยื่นและยกเลิกคำร้องสหกิจศึกษา | panel-request | สร้างคำร้องพร้อมสถานประกอบการ ช่วงวัน วิธีส่ง และ prerequisite; ส่ง; เปิดรายละเอียด; ใช้คำร้องอีกชุดทดสอบยกเลิก | ส่งแล้ว advisor_review; prerequisite/delivery/company snapshot อยู่; คำร้องซ้ำถูกปฏิเสธ; ยกเลิกได้ตาม state โดยเพิ่ม review | ☐ | ☐ | ☐ |  |
| MAN-STU-006 | 2.3.1.1 (6) | Student | ติดตามคำร้องและสถานะเอกสาร | panel-request | เปิดคำร้องหลัง Class/Head ตัดสิน; ดูเหตุผลและผลตอบบริษัท; สำรวจการเปิดหนังสือจริง | สถานะและเหตุผลตรง Class/Head/Staff/บริษัท; เอกสารจริงยังไม่มี Student route จึงบันทึก gap แยก | ☐ | ☐ | ☐ |  |
| MAN-STU-007 | 2.3.1.1 (7) | Student | เลือกหรือเปลี่ยนอาจารย์ที่ปรึกษาโครงการ | panel-coop | เลือกอาจารย์ A; เปลี่ยนเป็น B ขณะ pending; ให้ B accept; กลับ Student | pending ไม่เท่ากับ confirmed; superseded request ไม่ตัดสินได้; confirmed เปลี่ยนไม่ได้; advisor_teacher_id ไม่เปลี่ยน | ☐ | ☐ | ☐ |  |
| MAN-STU-008 | 2.3.1.1 (8) | Student | นักศึกษายืนยันรับทราบอาจารย์โครงการ | panel-coop | หลัง Teacher accept เปิดโครงการ; ดูชื่อ confirmed; สำรวจปุ่มรับทราบของ Student | ชื่อ confirmed แสดงได้; ไม่พบ Student acknowledgement persistence จึงยังไม่ผ่าน requirement ส่วนยืนยัน | ☐ | ☐ | ☐ |  |
| MAN-STU-009 | 2.3.1.1 (9) | Student | บันทึกหัวข้อโครงการ / หัวข้อสอบ | panel-coop | กรอกหัวข้อภาษาไทย; กดบันทึก; ลองค่าว่างและยาวกว่า 500 อักษร | หัวข้อ 1–500 อักษรคงอยู่; ค่าว่าง/ยาวเกินถูกปฏิเสธ; confirmed advisor ไม่ถูกแก้ตามหัวข้อ | ☐ | ☐ | ☐ |  |
| MAN-STU-010 | 2.3.1.1 (10) | Student | เพิ่ม แก้ไข ลบข้อมูลพี่เลี้ยง | panel-mentor | เพิ่มพี่เลี้ยงทดสอบ; แก้ตำแหน่ง; ส่งลิงก์ใหม่; ใช้ชุดไร้ประวัติลองลบและชุดมี weekly history ตรวจ 409 | ข้อมูลและสถานะเปลี่ยนจริง; pending resend ใช้ PUT me; token เก่าถูกยกเลิก; ลบที่มี weekly evidence ได้ 409 และ history คงอยู่ | ☐ | ☐ | ☐ |  |
| MAN-STU-011 | 2.3.1.1 (11) | Student | บันทึกรายวันและจัดทำเล่มบันทึก | panel-daily | เลือกสัปดาห์ในช่วงฝึกงานที่ผ่านมา; บันทึกทุกวันทำงาน/วันหยุด; ส่งทั้งสัปดาห์; ตรวจล็อก; สำรวจ export เล่มรวม | หนึ่ง record/Student/date; ข้อมูลครบ; submitted/reviewed ล็อก; revision_requested แก้ได้; ไม่มี export เล่มรวม | ☐ | ☐ | ☐ |  |
| MAN-STU-012 | 2.3.1.1 (12) | Student | นักศึกษาประเมินสถานประกอบการ | panel-evaluate | เลือกคะแนน 1–10 ให้ครบห้าข้อ; ใส่ข้อเสนอแนะ; บันทึก; แก้หนึ่งข้อและบันทึกอีกครั้ง | คะแนนจำนวนเต็ม 1–10 ห้าข้อ; total=sum และ average=sum/5; แก้แล้ว upsert ของตน; ไม่ใช้เป็น academic score | ☐ | ☐ | ☐ |  |
| MAN-STU-013 | 2.3.1.1 (13) | Student | อัปโหลดเล่มโครงการ | panel-report-upload | เลือก PDF เล่มโครงการ ≤10MB; อัปโหลด; เปิดดูไฟล์; แทนที่ด้วย PDF ฉบับใหม่ | รับ PDF ที่ signature/extension ถูกต้อง ≤10MB; preview ของตน; replacement มีไฟล์ปัจจุบันหนึ่งรายการต่อประเภท | ☐ | ☐ | ☐ |  |
| MAN-STU-014 | 2.3.1.1 (14) | Student | อัปโหลดโปสเตอร์ | panel-report-upload | เลือกโปสเตอร์ PDF/PNG/JPEG ≤10MB; อัปโหลด; เปิดดูไฟล์; แทนที่ | รับ PDF/PNG/JPEG signature ถูกต้อง ≤10MB; preview ตาม MIME; replacement ไม่กระทบเล่มโครงการ | ☐ | ☐ | ☐ |  |
| MAN-STU-015 | 2.3.1.1 (15) | Student | Chatbot ขั้นตอนและเอกสารสำหรับนักศึกษา | index-chat | เปิด chatbot หน้าแรก; ถามขั้นตอนเอกสาร; เปรียบเทียบคำถามอีกเรื่อง; ดูว่ามีคำตอบจริงหรือข้อความพัฒนา | ปัจจุบัน reply จำลอง ไม่อ้างเป็นคำตอบ NLP/สถานะเอกสาร; บันทึก integration gap | ☐ | ☐ | ☐ |  |
| MAN-STU-016 | 2.3.1.1 (16) | Student | ค้นหาและเลือกสถานประกอบการ | panel-request | เปิดสร้างคำร้อง; พิมพ์ชื่อบริษัท; เลือกผล; ดูข้อมูลเติม; ลองบริษัทไม่พบและตรวจชื่อซ้ำ | picker เติมข้อมูลบริษัทจริง; manual company ได้ snapshot; missing public search ต้องรายงาน | ☐ | ☐ | ☐ |  |
| MAN-STA-001 | 2.3.2 (1) | Staff | ติดตามคำร้องและเอกสารของ Staff | documents | Login Staff; ค้นด้วยชื่อ/รหัสทดสอบ; กรองทุกสถานะ; เปิดรายละเอียดและประวัติ | กรอง/ค้น/เปลี่ยนหน้าถูก scope; history อ่านได้; สถานะเอกสารตัวอย่างแยกจากเอกสารทางการ | ☐ | ☐ | ☐ |  |
| MAN-STA-002 | 2.3.2 (2) | Staff | ยกเลิกคำร้องพร้อมเหตุผลและ Student readback | documents | เลือกคำร้อง advisor_review; กดยกเลิก; ลองเหตุผลว่าง; ใส่เหตุผลทดสอบและยืนยัน; Student เปิดอ่าน | ยกเลิกได้เฉพาะ submitted/staff_review/advisor_review/department_head_review; reason บังคับ; cancelled/review เพิ่มครั้งเดียว; Student เห็นเหตุผล | ☐ | ☐ | ☐ |  |
| MAN-STA-003 | 2.3.2 (3) | Staff | จัดการหนังสือขอความอนุเคราะห์ / ส่งตัว | documents | เลือก approved request; สร้าง draft cooperation; แก้ metadata; generate; preview/download/print; สำรวจ PDF และลบ | draft→generated เป็น HTML; version/history/hash คงอยู่; ส่งตัวต้อง accepted response; official PDF/DELETE ไม่พบ | ☐ | ☐ | ☐ |  |
| MAN-STA-004 | 2.3.2 (4) | Staff | Chatbot ตรวจสถานะเอกสารของ Staff | ไม่พบเมนู | Login Staff; สำรวจเมนูและหน้าเอกสารว่ามี chatbot; บันทึก gap หากไม่มี | บันทึก Missing Feature จากหน้าและ source; ไม่สร้างผล chatbot สมมติ | ☐ | ☐ | ☐ |  |
| MAN-STA-005 | 2.3.2 (5) | Staff | Staff จัดการสถานประกอบการและประกาศงาน | ไม่พบเมนู | Login Staff; สำรวจเมนูบริษัท/งาน; บันทึกว่าไม่พบ UI; ให้ผู้ดูแลอ่าน route inventory แยกจากผล browser | API jobs มีจริงแต่หน้า Staff ไม่มี CRUD บริษัท/คิวงาน; browser acceptance ส่วนนี้ยังทำไม่ได้ | ☐ | ☐ | ☐ |  |
| MAN-STA-006 | 2.3.2 (6) | Staff | จัดการปฏิทินกิจกรรมสหกิจ | activities | เปิดปฏิทิน Staff; สร้าง draft; แก้พร้อมเหตุผล; publish; ค้น/กรอง; ยกเลิกอีกกิจกรรม; Student เปิดอ่าน | draft/published/cancelled พร้อม version/history; Student ไม่เห็น draft/Staff private fields; cancelled มี public state | ☐ | ☐ | ☐ |  |
| MAN-STA-007 | 2.3.2 (7) | Staff | Staff จัดการข้อมูลอาจารย์ | ไม่พบเมนู | Login Staff; สำรวจเมนูอาจารย์; บันทึกว่าไม่มีหน้าจัดการของ Staff | ไม่พบ Staff admin UI/API; Head PATCH เป็นคนละ role | ☐ | ☐ | ☐ |  |
| MAN-TEA-001 | 2.3.3.1 (1) | Teacher | อาจารย์เลือกนักศึกษาที่ดูแล | advisorRequests | Login Teacher; เปิดคำขอที่ปรึกษาและนัดนิเทศ; สำรวจการเลือกนักศึกษานอกความสัมพันธ์ที่ยืนยันแล้ว | เลือกได้จากความสัมพันธ์โครงการที่ยืนยันแล้ว; independent selection ไม่มี implementation | ☐ | ☐ | ☐ |  |
| MAN-TEA-002 | 2.3.3.1 (2) | Teacher | อาจารย์รับ / ปฏิเสธเป็นที่ปรึกษาโครงการ | advisorRequests | Student ส่งคำขอ; Teacher ที่ถูกเลือกกดยอมรับ; ใช้นักศึกษาอีกชุดทดสอบปฏิเสธพร้อมเหตุผล; Student เปิดอ่าน | Teacher ที่ถูกขอเท่านั้นตัดสิน; confirmed เขียน coop_advisor_teacher_id; rejected มีเหตุผล; Student เห็นหลัง Refresh | ☐ | ☐ | ☐ |  |
| MAN-TEA-003 | 2.3.3.1 (3) | Teacher | อาจารย์ค้นหานักศึกษาและสถานประกอบการ | coopApprovals / supervisionScheduling | Teacher เปิดคิวและรายชื่อที่ดูแล; เปลี่ยนสถานะ/หน้า; สำรวจ search นักศึกษาและ directory บริษัท | คิว/รายชื่อที่ดูแลทำงาน; public company directory และค้นหาเต็มยังขาด | ☐ | ☐ | ☐ |  |
| MAN-TEA-004 | 2.3.3.1 (4) | Teacher | นัด / เลื่อนนัดนิเทศครั้งที่ 1–2 | supervisionScheduling | เลือกนักศึกษาที่เป็น project advisee; ตรวจข้อมูลพี่เลี้ยง; สร้างครั้ง 1/2; เลื่อนครั้ง 1 พร้อมเหตุผล; ส่งลิงก์ใหม่ | เวลาบางกอกในอนาคต; visit 1/2 แยก; pending_confirmation→confirmed; เลื่อนนัดเพิ่ม version/reset confirmation; result แล้วห้ามเลื่อน | ☐ | ☐ | ☐ |  |
| MAN-TEA-005 | 2.3.3.1 (5) | Teacher | อาจารย์ตรวจข้อมูลพี่เลี้ยงก่อนนัดนิเทศ | supervisionScheduling | เปิดรายละเอียดนักศึกษาและพี่เลี้ยง; ทำเครื่องหมายตรวจแล้ว; ทดสอบ mentor pending ในอีกชุดข้อมูล | pending/unverified mentor นัดไม่ได้; verified_at ต้องตรงข้อมูลปัจจุบัน; ข้อมูลผิดต้องแก้และยืนยันใหม่ | ☐ | ☐ | ☐ |  |
| MAN-TEA-006 | 2.3.3.1 (6) | Teacher | กำหนดผู้แทนพี่เลี้ยงเฉพาะนัดนิเทศ | supervisionScheduling | เลือกนัดครั้ง 2; เปิดผู้แทน; กรอกข้อมูลและเหตุผล; บันทึก; ผู้แทนเปิดลิงก์และยืนยัน | ผู้แทนมีเหตุผลและข้อมูลครบ; snapshot/recipient เป็นผู้แทน; mentors หลักไม่เปลี่ยน | ☐ | ☐ | ☐ |  |
| MAN-TEA-007 | 2.3.3.1 (7) | Teacher | ผลนิเทศครั้งที่ 1 พร้อมภาพสองภาพ | supervisionScheduling | เปิดผลครั้ง 1 หลังนัดยืนยัน; บันทึก draft วันที่/สรุป/ข้อเสนอแนะและสองภาพ; กดเสร็จสมบูรณ์; Student เปิดอ่าน | ต้องนัด confirmed; draft เก็บได้; completed ต้องวันที่/summary/สองภาพ PNG/JPEG ≤5MB ต่อภาพ; complete แล้วแก้ไม่ได้; Student อ่าน completed | ☐ | ☐ | ☐ |  |
| MAN-TEA-008 | 2.3.3.1 (8) | Teacher | PDF นิเทศครั้งที่ 1 | ไม่พบเมนู PDF | เปิดผลครั้ง 1; สำรวจปุ่ม PDF ทางการ; บันทึกว่าไม่พบและหยุดขั้นสร้าง PDF | ไม่มี official PDF endpoint/UI; บันทึก dependency template และไม่ทำ browser print แทนการรับรอง PDF | ☐ | ☐ | ☐ |  |
| MAN-TEA-009 | 2.3.3.1 (9) | Teacher | ผลนิเทศครั้งที่ 2 พร้อมภาพสองภาพ | supervisionScheduling | เปิดผลครั้ง 2 ของอีก appointment; บันทึก draft และสองภาพ; complete; เทียบครั้ง 1 | ผล visit=2 แยกจาก visit=1; complete ต้องสองภาพ; การแก้ครั้ง 2 ไม่เปลี่ยนครั้ง 1 | ☐ | ☐ | ☐ |  |
| MAN-TEA-010 | 2.3.3.1 (10) | Teacher | PDF นิเทศครั้งที่ 2 | ไม่พบเมนู PDF | เปิดผลครั้ง 2; สำรวจ PDF ทางการ; บันทึกว่าไม่พบ | ไม่มี official PDF ครั้ง 2; หยุดก่อนขั้นที่ไม่มี implementation | ☐ | ☐ | ☐ |  |
| MAN-TEA-011 | 2.3.3.1 (11) | Teacher | อาจารย์ประเมินนักศึกษาเป็นคะแนน | ไม่พบเมนูคะแนน | Login Teacher; สำรวจหน้าคะแนนนักศึกษา; บันทึกว่าไม่มี; ไม่แทนคะแนนด้วยคำบรรยาย | ไม่มีการบันทึกคะแนนวิชาการ; รอเกณฑ์/คะแนนเต็มและ UI/API/model | ☐ | ☐ | ☐ |  |
| MAN-TEA-012 | 2.3.3.1 (12) | Teacher | อาจารย์ประเมินสถานประกอบการ | ไม่พบเมนู | Login Teacher; สำรวจฟอร์มประเมินบริษัท; บันทึกว่าไม่มี; แยกจาก Student feedback | ไม่มี Teacher company evaluation; คะแนน Student ใช้แทนไม่ได้ | ☐ | ☐ | ☐ |  |
| MAN-TEA-013 | 2.3.3.1 (13) | Teacher | ประเมินนักศึกษาครั้งนิเทศที่ 2 เป็นคะแนน | ไม่พบเมนูคะแนน | เปิดผลครั้ง 2; สำรวจคะแนน/rubric; บันทึกว่าเป็นผลเชิงข้อความ | ผลข้อความครั้ง 2 อ่านได้; numeric evaluation ยังไม่มี | ☐ | ☐ | ☐ |  |
| MAN-TEA-014 | 2.3.3.1 (14) | Teacher | ประเมินเล่มบันทึก เล่มโครงการ ชิ้นงาน โปสเตอร์และสอบ | ไม่พบเมนูคะแนน | สำรวจเล่ม/โปสเตอร์/คณะกรรมการ/คะแนนสอบ; บันทึกจุดที่ไม่มี UI และ dependency | ไม่มี final grading/กรรมการ/รวมคะแนน; รอ rubric/maxima และ aggregation policy | ☐ | ☐ | ☐ |  |
| MAN-TEA-015 | 2.3.3.1 (15) | Teacher | อาจารย์จัดการบัญชีส่วนตัว | แสดงชื่อผู้ใช้ / ออกจากระบบ | Login Teacher; ดูชื่อผู้ใช้; สำรวจแก้ข้อมูลตนเอง/เปลี่ยนรหัสผ่าน; Logout | อ่าน profile/Logout ได้; ไม่มี self-edit/change password จึงบันทึก gap | ☐ | ☐ | ☐ |  |
| MAN-TEA-016 | 2.3.3.1 (16) | Teacher | อาจารย์ประจำชั้นอนุมัติ / ปฏิเสธคำร้อง | coopApprovals | Class Advisor A เปิด advisor_review ของตน; approve; ใช้คำร้องอีกชุด reject พร้อมเหตุผล; ให้ Project Advisor B ตรวจขอบเขต | Class A เท่านั้น approve advisor_review→department_head_review; reject มีเหตุผล→rejected; Project B ไม่ได้ Class authority | ☐ | ☐ | ☐ |  |
| MAN-HEAD-001 | 2.3.3.2 (1) | Head | หัวหน้าภาคค้นหาอาจารย์ | ไม่พบเมนู | Login Head; สำรวจค้นหาอาจารย์; หน้าไม่มี UI; ผู้ดูแลเทียบ GET teachers inventory | Head API จำกัดภาคมีจริง; ไม่มีหน้า search อาจารย์ จึงไม่อ้าง UI PASS | ☐ | ☐ | ☐ |  |
| MAN-HEAD-002 | 2.3.3.2 (2) | Head | หัวหน้าภาคค้นหานักศึกษาสหกิจ | coopApprovals | Head เปิดคิวคำร้องภาค; กรองสถานะ/เปลี่ยนหน้า; สำรวจ directory นักศึกษาแยก | คิวคำร้องจำกัดภาคได้; ไม่มี Student directory UI แยก | ☐ | ☐ | ☐ |  |
| MAN-HEAD-003 | 2.3.3.2 (3) | Head | หัวหน้าภาคกำหนดอาจารย์โครงการ | ไม่พบเมนูกำหนดอาจารย์ | Login Head; สำรวจเมนูกำหนดอาจารย์; บันทึกไม่มี UI และ service 409; ไม่พยายาม bypass | direct assign route 409 ตาม policy; ไม่มี assignment UI; ห้ามใช้ bypass acceptance | ☐ | ☐ | ☐ |  |
| MAN-HEAD-004 | 2.3.3.2 (4) | Head | หัวหน้าภาคแก้ไขข้อมูลอาจารย์ | ไม่พบเมนูแก้ไขอาจารย์ | Login Head; สำรวจฟอร์มแก้ไขอาจารย์; บันทึกไม่มี UI แม้มี PATCH endpoint | backend PATCH scope ภาคมี; ไม่มี editing UI จึงไม่มีการบันทึกจาก browser | ☐ | ☐ | ☐ |  |
| MAN-HEAD-005 | 2.3.3.2 (5) | Head | หัวหน้าภาคแก้ไขข้อมูลส่วนตัว | ไม่พบเมนูแก้ไข profile | Login Head; สำรวจฟอร์ม profile; บันทึกไม่มี UI แม้มี GET/PATCH me | GET/PATCH me มี; ไม่มี self-edit form จึงยังไม่ครบ workflow | ☐ | ☐ | ☐ |  |
| MAN-HEAD-006 | 2.3.3.2 (6) | Head | หัวหน้าภาคอนุมัติ / ปฏิเสธคำร้อง | coopApprovals | Head ของภาคเปิด department_head_review; approve; ใช้คำร้องอีกชุด reject พร้อมเหตุผล; Student เปิดอ่าน | Head flag active + ภาคตรง Class advisor; department_head_review→approved/rejected; reason/readback/audit ตรง | ☐ | ☐ | ☐ |  |
| MAN-COM-001 | 2.3.4 (1) | Company | สถานประกอบการลงประกาศงานพร้อม CAPTCHA | ฟอร์มรับสมัคร | เปิดฟอร์มรับสมัคร; กรอกข้อมูลบริษัท/ตำแหน่งครบ; CAPTCHA; submit หนึ่งครั้ง; ตรวจข้อความและ inbox ทดสอบ | ส่งผ่าน CAPTCHA แล้ว pending_email_verification; verification→pending_review; ยังไม่ published จน Staff approve; provider error แสดงตามจริง | ☐ | ☐ | ☐ |  |
| MAN-COM-002 | 2.3.4 (2) | Company | สถานประกอบการแก้ไขข้อมูลตนเอง / ประกาศ | ไม่พบ portal | เปิด recruitment; สำรวจ portal แก้บริษัท/ประกาศเดิม; บันทึกว่าไม่พบและหยุด | ไม่พบ company owner CRUD/posting edit portal; ไม่มีขั้นบันทึกที่ควรอ้าง | ☐ | ☐ | ☐ |  |
| MAN-COM-003 | 2.3.4 (3) | Company | ยืนยันอีเมลและข้อมูลสถานประกอบการ | หน้ายืนยันอีเมล | เปิดลิงก์ verification จาก inbox ทดสอบ; ยืนยัน; เปิดลิงก์เดิมอีกครั้ง; ตรวจ pending_review และ resend ตาม UI | ลิงก์ purpose/submission scoped ใช้ครั้งเดียว; expired/revoked/used ถูกปฏิเสธ; email_verified ไม่รับรองรายละเอียดบริษัท | ☐ | ☐ | ☐ |  |
| MAN-MEN-001 | 2.3.5.1 (1) | Mentor | พี่เลี้ยงตรวจบันทึกรายวันเป็นชุดรายสัปดาห์ | โหมดตรวจสัปดาห์ | เปิดลิงก์ review ของพี่เลี้ยง; เปิดทั้งสัปดาห์; ขอแก้พร้อม feedback; Student แก้/ส่งใหม่; Mentor reviewed | review ทั้งสัปดาห์พร้อม feedback/ผู้ตรวจ/เวลา; revision_requested กลับ Student; reviewed ล็อก; ไม่มีคะแนนรายสัปดาห์ | ☐ | ☐ | ☐ |  |
| MAN-MEN-002 | 2.3.5.1 (2) | Mentor | พี่เลี้ยงยืนยัน / แก้ไขข้อมูลส่วนตัว | โหมดยืนยันข้อมูล | เปิดลิงก์พี่เลี้ยง; แก้ชื่อ/ตำแหน่งที่อนุญาต; กดบันทึก; ยืนยันครั้งเดียว; เปิดลิงก์เดิมอีกครั้ง | บันทึก/confirm ของลิงก์พี่เลี้ยงนี้เท่านั้น; status=verified และ verified_at; used/expired กลับมาใช้ไม่ได้ | ☐ | ☐ | ☐ |  |
| MAN-MEN-003 | 2.3.5.1 (3) | Mentor | พี่เลี้ยงยืนยันข้อมูลก่อนวันนิเทศ | โหมดยืนยันนัด | เปิดลิงก์นัด; ตรวจข้อมูล; ลองยืนยันโดยไม่ checkbox; เลือก checkbox; ยืนยัน | ต้อง checkbox; token version/purpose/current mentor ผูกนัด; consumed ใช้ซ้ำไม่ได้; Teacher เห็น confirmed | ☐ | ☐ | ☐ |  |
| MAN-MEN-004 | 2.3.5.1 (4) | Mentor | ผู้แทนพี่เลี้ยงยืนยันข้อมูลสำหรับนัด | โหมดยืนยันนัดผู้แทน | ผู้แทนเปิดลิงก์ของตน; ตรวจชื่อ snapshot; checkbox; ยืนยัน; Teacher ดู readback | เฉพาะผู้แทน snapshot ของนัดยืนยันได้; Mentor หลักไม่เปลี่ยน; ไม่รับรอง attendance | ☐ | ☐ | ☐ |  |
| MAN-MEN-005 | 2.3.5.1 (5) | Mentor | พี่เลี้ยงบันทึกพฤติกรรม ขาด ลา มาสาย | ไม่พบเมนูพฤติกรรม | Mentor เปิด weekly review; สำรวจฟอร์มขาด/ลา/มาสาย; เทียบ Student non_working reason | ไม่พบ Mentor attendance/late rubric; Student non_working reason เป็นคนละหน้าที่ | ☐ | ☐ | ☐ |  |
| MAN-MEN-006 | 2.3.5.1 (6) | Mentor | พี่เลี้ยงประเมินนักศึกษา เล่ม ชิ้นงานและโปสเตอร์ | ไม่พบเมนูคะแนน | Mentor เปิดหน้ายืนยัน/weekly; สำรวจ final numeric rubric และเล่ม/โปสเตอร์ grading; บันทึกไม่มี | ไม่มี final assessment numeric persistence; weekly feedback ใช้แทนไม่ได้ | ☐ | ☐ | ☐ |  |
| MAN-ACA-001 | 2.3.6.1 | Academic | คำนวณคะแนนวิชาการรวมและคณะกรรมการสอบ | ไม่พบเมนูคะแนนรวม | สำรวจคะแนนรวม/คณะกรรมการ; บันทึกไม่มี UI/API; ขอ rubric ก่อนกำหนด expected totals | ไม่พบ score engine; สัดส่วนจาก README คือ 20+30+10+5+25+10=100 แต่ยังไม่มีเกณฑ์/aggregation ที่ยืนยันทางการ | ☐ | ☐ | ☐ |  |
| MAN-STU-017 | USER-S-ACCOUNT | Student | นักศึกษาจัดการบัญชีผู้ใช้ | panel-profile / ออกจากระบบ | Student ดู/แก้ข้อมูลบัญชีที่มี; Logout; สำรวจเปลี่ยน/กู้รหัสผ่านและยืนยันอีเมลบัญชี | แก้ข้อมูลที่ฟอร์มมี/Logout ได้; recovery/change password และ policy account ยังขาด | ☐ | ☐ | ☐ |  |
| MAN-EXT-001 | X01 | Staff | เข้าสู่ระบบและออกจากระบบ Staff |  /src/department_staff/department_staff.html | Login บัญชี active; ลองรหัสผิดครั้งเดียว; Logout; เปิดหน้าเดิม | สิทธิ์ Staff ตรวจ active จาก DB; หลัง logout ไม่อ่านข้อมูลส่วนตัวได้ | ☐ | ☐ | ☐ |  |
| MAN-EXT-002 | X02 | Teacher/Head | เข้าสู่ระบบอาจารย์และหัวหน้าภาค | ดู Navigation | Login Teacher และ Head ด้วย session แยก; ให้ Teacher ธรรมดาเปิดหน้า Head; Logout | Head ต้องมี flag สดและภาควิชา; token namespace เดียวต้องแสดง role ถูกต้อง | ☐ | ☐ | ☐ |  |
| MAN-EXT-003 | X03 | Student | Dashboard และเปลี่ยน panel นักศึกษา |  panel-overview | Login; เปิดภาพรวม; เลือกเมนูทุก panel; กลับภาพรวม | แสดงข้อมูลของตนและ panel ถูกต้อง; ส่วนที่เป็น mock ต้องไม่เข้าใจว่าบันทึกแล้ว | ☐ | ☐ | ☐ |  |
| MAN-EXT-004 | X04 | Staff | Dashboard เจ้าหน้าที่และการนำทางเอกสาร/ปฏิทิน | ดู Navigation | Login; เลือกจัดการเอกสาร; เปิดกิจกรรม; กลับเอกสาร | session คงอยู่และแต่ละ section โหลดข้อมูลจริง | ☐ | ☐ | ☐ |  |
| MAN-EXT-005 | X05 | Teacher/Head | Dashboard อาจารย์/หัวหน้าภาคและงานที่ต่างกัน | ดู Navigation | เปิดสามเมนู Teacher; เปิด Head queue และลิงก์งานอาจารย์ | Class approvals แยกจาก project advisees; Head queue ใช้ภาค | ☐ | ☐ | ☐ |  |
| MAN-EXT-006 | X06 | Student | อัปโหลดและครอปรูปประวัติ |  panel-profile → รูปประวัติ | กดรูป; เลือกรูป JPG/PNG/WebP ≤5MB; ครอป/บันทึก; โหลดใหม่ | รูปของเจ้าของแสดงใหม่; ข้อมูล file_type=profile_image ตรงกัน | ☐ | ☐ | ☐ |  |
| MAN-EXT-007 | X07 | Student/NLP | สกัดข้อความ PDF และ OCR Resume |  panel-profile → Resume | อัปโหลด PDF แบบข้อความและแบบสแกนสองชุด; ตรวจ extraction status | pdf_text หรือ ocr พร้อม ready; OCR ล้มเหลวเก็บไฟล์ได้แต่ failed; ไม่อ้างว่าจับคู่จาก Resume ได้ | ☐ | ☐ | ☐ |  |
| MAN-EXT-008 | X08 | Student | ตรวจชื่อสถานประกอบการซ้ำและข้อมูลประกาศงาน |  panel-request | กรอกชื่อบริษัทที่มีแล้ว; เลือกจากผลซ้ำ; เปิดงานจากผล matching | เติม company/job snapshot; แยกชื่อ manual กับ existing ID | ☐ | ☐ | ☐ |  |
| MAN-EXT-009 | X09 | Student | อ่านผลตอบรับ/ปฏิเสธบริษัทและประวัติ |  panel-request → รายละเอียด | หลัง Staff บันทึกผลตอบบริษัทเปิดรายละเอียดคำร้องของตน | อ่านผลตอบและ correction history ได้ตาม scope | ☐ | ☐ | ☐ |  |
| MAN-EXT-010 | X10 | Student | ส่งบันทึกทั้งสัปดาห์ / ขอแก้ / ส่งใหม่ |  panel-daily | บันทึกครบวันภายในสัปดาห์ที่ผ่านมา; ส่ง; Mentor ขอแก้; แก้และส่งอีกครั้ง | submitted→revision_requested→submitted; snapshot เดิมไม่หาย; reviewed ล็อก | ☐ | ☐ | ☐ |  |
| MAN-EXT-011 | X11 | Student/Mentor | ส่งลิงก์ตรวจสัปดาห์ใหม่และดู feedback |  panel-daily | กดส่งลิงก์อีกครั้ง; Mentor เปิดลิงก์ใหม่; ลิงก์เก่าถูกยกเลิก; Student อ่าน feedback | แสดง email_sent ตามจริง; feedback/ผู้ตรวจ/เวลาคงอยู่ | ☐ | ☐ | ☐ |  |
| MAN-EXT-012 | X12 | Student | อ่านนัดนิเทศและผล completed พร้อมรูป |  panel-overview / ข้อมูลนิเทศ | Teacher complete ผลทั้งสองครั้ง; Student เปิดอ่านวันนัด/ผล/รูป | ดูเฉพาะของตน; draft ไม่ปรากฏ; ไม่มี controls แก้ไข | ☐ | ☐ | ☐ |  |
| MAN-EXT-013 | X13 | Student | เปิด preview เล่ม/โปสเตอร์ด้วย blob ที่มีสิทธิ์ |  panel-report-upload | อัปโหลดไฟล์; กดดูไฟล์; เปิดด้วย Student B ใน session อื่นโดยใช้ ID ทดสอบที่อนุญาต | B ถูกปฏิเสธ; ไม่มี storage path ใน response; blob ถูก revoke หลังปิด | ☐ | ☐ | ☐ |  |
| MAN-EXT-014 | X14 | Staff | บันทึกและแก้ผลตอบบริษัทพร้อมเหตุผล |  รายละเอียด | หลัง generate cooperation เลือก accepted; บันทึก; แก้เป็น rejected พร้อมเหตุผลก่อนมี placement | version/history เพิ่ม; หลังมี placement ห้ามแก้; Student readback ตรง | ☐ | ☐ | ☐ |  |
| MAN-EXT-015 | X15 | Staff | ตรวจสิทธิ์สร้างหนังสือส่งตัว |  หนังสือส่งตัว | เปรียบเทียบคำร้องไม่มี cooperation, rejected response และ accepted response | สร้างได้เฉพาะ approved + cooperation generated + accepted response | ☐ | ☐ | ☐ |  |
| MAN-EXT-016 | X16 | Staff | อ่าน revision เอกสารเก่า / download / print HTML |  ประวัติฉบับ | generate; แก้ draft; generate ใหม่; เปิด revision เก่า; ดาวน์โหลด; Print dialog แล้วปิด | HTML hash/snapshot แยกฉบับ; format text/html; ไม่มีการลบประวัติ | ☐ | ☐ | ☐ |  |
| MAN-EXT-017 | X17 | Staff | ตรวจ/เผยแพร่/ปฏิเสธประกาศงานผ่าน API | ดู Navigation | สำรวจหน้า Staff ว่ามีคิวงานหรือไม่; เทียบ read-only route inventory | API มี pending_review→published/rejected; ไม่รายงาน browser PASS เพราะไม่มีหน้าจอ | ☐ | ☐ | ☐ |  |
| MAN-EXT-018 | X18 | Student | ปฏิทินกิจกรรมแบบอ่านอย่างเดียว |  panel-activities | Staff สร้าง draft/published/cancelled; Student เปลี่ยนเดือน/รายการและค้นหา | draft และ Staff notes/reasons ไม่เปิดเผย; ไม่มี mutation controls | ☐ | ☐ | ☐ |  |
| MAN-EXT-019 | X19 | Student | ฟอร์มขอย้ายสถานประกอบการ |  panel-transfer | เปิดขอย้าย; กรอกข้อมูลทดสอบ; กดส่ง; Refresh | ปัจจุบันแจ้งยังไม่เชื่อม Backend ด้วย success style; ไม่มีคำร้องถูกเก็บ | ☐ | ☐ | ☐ |  |
| MAN-EXT-020 | X20 | Public | การ์ดงาน / carousel / ค้นหาและกรองหน้าแรก | ดู Navigation | เปิดหน้าแรก; เลื่อน carousel; ค้น/กรอง; กดค้นหาสถานประกอบการ | carousel มี UI; search/filter console-only และ search_company.html ไม่มี | ☐ | ☐ | ☐ |  |
| MAN-EXT-021 | X21 | Company | ส่งอีเมลยืนยันบริษัทใหม่และ recovery cookie |  หลังส่งประกาศ | ส่งประกาศใน inbox ทดสอบ; ใช้ปุ่มส่งยืนยันใหม่ตามที่ UI เปิดให้; เปิดลิงก์เก่า/ใหม่ | origin/cooldown/recovery ตรวจสอบ; token เก่าถูก revoke; ไม่ส่ง secret ลงภาพ | ☐ | ☐ | ☐ |  |
| MAN-EXT-022 | X22 | Student/Shared | รายชื่ออาจารย์สำหรับเลือกประจำชั้น/โครงการ |  panel-profile / panel-coop | เปิด dropdown ทั้งสองแบบ; เปรียบเทียบรายชื่อและเลือกคนละคน | Class ID แยก Project ID; endpoint directory ใช้ JWT เท่านั้น แต่ไม่ใช่ approval API | ☐ | ☐ | ☐ |  |
| MAN-EXT-023 | X23 | Shared | JWT / RBAC / ownership / session logout | ดู Navigation | เปิดหน้า Staff ด้วย Student; เปิด Head ด้วย Teacher; A/B อ่านข้อมูลของตน; Logout และ Back | 401/403/404 ตาม route; ไม่อ่าน/แก้ของคนอื่น; token ไม่บันทึกในรายงาน | ☐ | ☐ | ☐ |  |
| MAN-EXT-024 | X24 | Shared | ประวัติ audit ของคำร้อง เอกสาร งาน บันทึกและนิเทศ |  ประวัติ | ทำการเปลี่ยนที่อนุญาตจากกรณีหลัก; อ่าน history เก่าและใหม่ | actor/from/to/reason/version คงอยู่; ไม่พบ global audit viewer หรือ auth/security event audit | ☐ | ☐ | ☐ |  |
| MAN-EXT-025 | X25 | Shared | File Storage และการควบคุมสิทธิ์อ่านไฟล์ | ดู Navigation | อ่านไฟล์ทดสอบของตน; ตรวจไฟล์ผ่าน Network; ลองบัญชี B แบบไม่แก้ข้อมูล | ไม่มี public static storage route; path containment/ownership มี; credentials ไม่ปรากฏ | ☐ | ☐ | ☐ |  |
| MAN-EXT-026 | X26 | Shared | Toast / reason modal / loading / focus | ดู Navigation | ใช้ Tab/Shift+Tab/Escape; ยกเลิก modal; ยืนยันหนึ่งครั้ง; ดู loading/toast | confirm จำกัด Tab และคืน focus; action alert ยังไม่มี Tab trap แบบเดียวกัน | ☐ | ☐ | ☐ |  |
| MAN-EXT-027 | X27 | Shared | Error Handling และการกู้หน้าหลัง offline | ดู Navigation | DevTools Network offline; กดอ่าน/refresh; กลับ online; retry | แจ้ง error ไม่แสดง success; ไม่เอาข้อมูลเก่ามาแสดงเป็นล่าสุด; parser คืน safe message | ☐ | ☐ | ☐ |  |
| MAN-EXT-028 | X28 | Shared | Rate limiting login/recruitment/supervision | ดู Navigation | Login ผิดหนึ่งครั้งและดู feedback; ตรวจการป้องกันจาก source โดยไม่ยิงซ้ำ | ห้าม brute force; ทดสอบ 429 เฉพาะเมื่อผู้ดูแลเตรียมสถานะไว้; UI บอก retry ได้ | ☐ | ☐ | ☐ |  |
| MAN-EXT-029 | X29 | Shared | Email notification และผลส่งจริง | ดู Navigation | ใช้ inbox ทดสอบที่ได้รับอนุญาต; กดส่งจากกรณีหลัก; ตรวจผู้รับ/หัวข้อแบบปิดข้อมูลลับ | email_sent ต้องตรงจริง; saved mutation คงอยู่แม้อีเมลล้มเหลวตาม module | ☐ | ☐ | ☐ |  |
| MAN-EXT-030 | X30 | Shared | Logging และ transaction / optimistic concurrency | ดู Navigation | สองแท็บเปิด record ทดสอบเดียวกัน; แท็บแรกบันทึก; แท็บสองบันทึกค่าค้าง | 409 ไม่เขียนทับ; current row และ history เปลี่ยนสอดคล้อง; ไม่ log secret ในรายงาน | ☐ | ☐ | ☐ |  |
| MAN-EXT-031 | X31 | Shared | Responsive / keyboard / accessibility | ดู Navigation | เปิด 1440/1366/768/390px; Tab ทุก control; ตรวจ overflow/labels/Thai/contrast | อ่านและคลิกได้; เห็น focus; modal ไม่ทิ้ง focus; ไม่มีผลมือที่กรอกไว้ | ☐ | ☐ | ☐ |  |
| MAN-EXT-032 | X32 | NLP | Resume matching API แบบเดิมแยกจาก job-matches | ดู Navigation | ตรวจเอกสาร endpoint และตัวอย่างโดยอ่านอย่างเดียว; หากไม่มี UI ให้บันทึก NOT TESTED | TF-IDF/cosine ranking implementation มี; ไม่ถือว่าเป็น UI integration | ☐ | ☐ | ☐ |  |
| MAN-EXT-033 | X33 | Shared/NLP | Health และ topology Docker / PostgreSQL | ดู Navigation | ผู้ดูแลใช้หน้า health อ่านอย่างเดียวใน environment ที่ได้รับอนุญาต; บันทึก status แบบปิด diagnostics | app startup authenticate เท่านั้น; ไม่ auto-migrate; health status ไม่ยืนยัน feature acceptance | ☐ | ☐ | ☐ |  |
| MAN-EXT-034 | X34 | Company/Shared | CAPTCHA และ email capability security | ดู Navigation | ทดสอบขาด CAPTCHA ในฟอร์มที่อนุญาต; ตรวจ expired/revoked link ที่เตรียมไว้; เปิด token เดิมอีกครั้ง | ไม่เกิด submission เมื่อ verification ไม่ผ่าน; token ผูก purpose/submission และใช้ซ้ำไม่ได้ | ☐ | ☐ | ☐ |  |

## ขั้นตอนละเอียดสำหรับทุกกรณีหลัก

### MAN-STU-001 — สมัครสมาชิก / เข้าสู่ระบบนักศึกษา / Google OAuth

**Requirement ID:** 2.3.1.1 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /login.html และ /register.html → login/register  
**Frontend/handler:** [frontend/src/pages/login.js:10](../../frontend/src/pages/login.js#L10); loginForm submit / googleLoginBtn click  
**API/Service:** POST /api/auth/register; POST /api/auth/login; GET /api/auth/me; OAuth ไม่พบ; [backend/src/controllers/auth.controller.js:8](../../backend/src/controllers/auth.controller.js#L8)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /login.html และ /register.html; เปิด login/register | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิด /register.html โดยยังไม่ Login; สมัครด้วยข้อมูลทดสอบตามโดเมนที่อนุญาต | ข้อมูลครบและรหัสผ่านยืนยันตรงกัน; POST register คืน 201; email หรือรหัสนักศึกษาซ้ำคืน 409; domain ไม่ถูก/รหัสสั้นถูกปฏิเสธ; ไม่มีรหัสผ่านใน response |  | ☐ |
| 4 | ออกจากระบบ | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 5 | Login | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 6 | ออกจากระบบก่อน แล้วลองรหัสผ่านผิดหนึ่งครั้งบน /login.html | คืน 401 และแจ้งอีเมลหรือรหัสผ่านไม่ถูกต้อง; ไม่สร้าง session ใหม่และไม่เปิด Dashboard; ห้ามยิงซ้ำเพื่อทดสอบ brute force |  | ☐ |
| 7 | กด Google บน /login.html | แสดงข้อความ «Google Login จะเชื่อมต่อ Google OAuth ภายหลัง»; ปัจจุบันไม่มี provider callback/login จริง; บันทึก gap ไม่กรอก PASS ของ OAuth |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ใช้บัญชีโดเมนที่ model อนุญาต; email/password login สำเร็จ; duplicate 409; wrong login 401; Google ยังแจ้ง placeholder จึงไม่ผ่าน OAuth acceptance

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** OAuth เป็น placeholder; การสมัครผ่าน browser ยังไม่มีหลักฐานครบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-002 — ประวัติส่วนตัว การศึกษา ครอบครัว ฉุกเฉินและทักษะ

**Requirement ID:** 2.3.1.1 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); saveStudentProfile  
**API/Service:** GET/PUT /api/student-profile/me; PUT /api/student-profile/student-info; [backend/src/controllers/studentProfile.controller.js:616](../../backend/src/controllers/studentProfile.controller.js#L616)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-profile | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดแก้ไขประวัติ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | แก้แต่ละกลุ่มข้อมูลที่อนุญาต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เลือกอาจารย์ประจำชั้น | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | บันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ค่าทุกกลุ่มบันทึกตรงเดิมหลังเปิดใหม่; Class advisor ถูกเก็บใน advisor_teacher_id; ห้ามแก้ field สิทธิ์จากฟอร์ม

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีอ่าน/แก้ไขจริง; ต้องตรวจทุกกลุ่มฟิลด์และ Refresh ด้วยมือ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-003 — อัปโหลดและแทนที่ Resume

**Requirement ID:** 2.3.1.1 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); uploadResumeBtn click  
**API/Service:** POST /api/student-profile/resume; [backend/src/middlewares/upload.middleware.js:1](../../backend/src/middlewares/upload.middleware.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-profile | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือก PDF ข้อความไทย/อังกฤษ ≤10MB | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | อัปโหลด | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ดู extraction status | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | แทนที่ PDF ฉบับใหม่ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไฟล์ใหม่แทนไฟล์เดิมเพียง Resume ปัจจุบัน; invalid type/size ถูกปฏิเสธ; extraction ready/failed แสดงตามจริง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** จัดเก็บและ extraction มีจริง; ต้องตรวจแทนที่ไฟล์และ OCR บนบริการจริง · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-004 — แนะนำงานจากทักษะและ Resume

**Requirement ID:** 2.3.1.1 (4) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-job-matching  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); loadJobMatches  
**API/Service:** POST /api/job-matches/me?source=skills หรือ resume; [backend/src/controllers/jobMatching.controller.js:18](../../backend/src/controllers/jobMatching.controller.js#L18)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-job-matching | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | บันทึกทักษะ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | กดค้นหาจากทักษะ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | อัปโหลด Resume ที่ ready | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | กดค้นหาจาก Resume | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_work_modes, students, student_files, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ผลสูงสุด 5 อันดับเรียงคะแนน/ID; ไม่มีข้อความเพียงพอให้ 422; NLP unavailable 503/504/502; expired published jobs เป็น gap

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_work_modes, students, student_files, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มีเงื่อนไข expires_at ในการเลือก published jobs; ยังไม่มี E2E NLP ใหม่ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-005 — ยื่นและยกเลิกคำร้องสหกิจศึกษา

**Requirement ID:** 2.3.1.1 (5) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-request  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); submitCoopRequestForm / confirmCancelCoopRequest  
**API/Service:** POST /api/coop-requests; PATCH /api/coop-requests/:id/cancel; [backend/src/controllers/coopRequest.controller.js:85](../../backend/src/controllers/coopRequest.controller.js#L85)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-request | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | สร้างคำร้องพร้อมสถานประกอบการ ช่วงวัน วิธีส่ง และ prerequisite | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ส่ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดรายละเอียด | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | ใช้คำร้องอีกชุดทดสอบยกเลิก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_delivery_methods, coop_request_prerequisite_courses, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ส่งแล้ว advisor_review; prerequisite/delivery/company snapshot อยู่; คำร้องซ้ำถูกปฏิเสธ; ยกเลิกได้ตาม state โดยเพิ่ม review

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_delivery_methods, coop_request_prerequisite_courses, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี create/cancel และ prerequisite snapshot; ยังไม่ได้ตรวจรับฟอร์มเต็มด้วยมือ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-006 — ติดตามคำร้องและสถานะเอกสาร

**Requirement ID:** 2.3.1.1 (6) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-request  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); openCoopRequestDetail  
**API/Service:** GET /api/coop-requests/me; GET /api/coop-requests/:id; GET /:id/company-response; [backend/src/controllers/coopRequest.controller.js:85](../../backend/src/controllers/coopRequest.controller.js#L85)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-request | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดคำร้องหลัง Class/Head ตัดสิน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ดูเหตุผลและผลตอบบริษัท | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจการเปิดหนังสือจริง | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; อ่านคำร้อง/ผลตอบบริษัทได้; ไม่พบ Student API ดูหนังสือ HTML/PDF และสถานะครบ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** สถานะและเหตุผลตรง Class/Head/Staff/บริษัท; เอกสารจริงยังไม่มี Student route จึงบันทึก gap แยก

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** อ่านคำร้อง/ผลตอบบริษัทได้; ไม่พบ Student API ดูหนังสือ HTML/PDF และสถานะครบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-007 — เลือกหรือเปลี่ยนอาจารย์ที่ปรึกษาโครงการ

**Requirement ID:** 2.3.1.1 (7) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-coop  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); requestProjectAdvisor  
**API/Service:** GET/POST /api/student-coop/project-advisor-request; [backend/src/services/coopProjectAdvisor.service.js:6](../../backend/src/services/coopProjectAdvisor.service.js#L6)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-coop | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกอาจารย์ A | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | เปลี่ยนเป็น B ขณะ pending | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ให้ B accept | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | กลับ Student | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** pending ไม่เท่ากับ confirmed; superseded request ไม่ตัดสินได้; confirmed เปลี่ยนไม่ได้; advisor_teacher_id ไม่เปลี่ยน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-007-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** รับคำขอและ Teacher ยืนยันได้; หลัง confirmed ห้ามเปลี่ยนด้วย 409; policy การเปลี่ยนยังขาด · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-008 — นักศึกษายืนยันรับทราบอาจารย์โครงการ

**Requirement ID:** 2.3.1.1 (8) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-coop  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); renderProjectAdvisor  
**API/Service:** GET /api/student-coop/project-advisor-request; Student acknowledge mutation ไม่พบ; [backend/src/services/coopProjectAdvisor.service.js:6](../../backend/src/services/coopProjectAdvisor.service.js#L6)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-coop | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | หลัง Teacher accept เปิดโครงการ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ดูชื่อ confirmed | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจปุ่มรับทราบของ Student | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มีแสดง confirmed_advisor; ไม่พบฟิลด์และปุ่มยืนยันรับทราบโดยนักศึกษา |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ชื่อ confirmed แสดงได้; ไม่พบ Student acknowledgement persistence จึงยังไม่ผ่าน requirement ส่วนยืนยัน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-008-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีแสดง confirmed_advisor; ไม่พบฟิลด์และปุ่มยืนยันรับทราบโดยนักศึกษา · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-009 — บันทึกหัวข้อโครงการ / หัวข้อสอบ

**Requirement ID:** 2.3.1.1 (9) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-coop  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); saveCoopProjectTopic  
**API/Service:** GET/PUT /api/student-coop/project; [backend/src/services/studentCoopProject.service.js:12](../../backend/src/services/studentCoopProject.service.js#L12)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-coop | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | กรอกหัวข้อภาษาไทย | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กดบันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ลองค่าว่างและยาวกว่า 500 อักษร | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_projects; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** หัวข้อ 1–500 อักษรคงอยู่; ค่าว่าง/ยาวเกินถูกปฏิเสธ; confirmed advisor ไม่ถูกแก้ตามหัวข้อ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_projects; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-009-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หัวข้อเก็บใน coop_projects; ไม่ต้องรอที่ปรึกษายืนยัน; ยังขาด manual acceptance · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-010 — เพิ่ม แก้ไข ลบข้อมูลพี่เลี้ยง

**Requirement ID:** 2.3.1.1 (10) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-mentor  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); submitMentorForm / removeMentor / resendMentorVerification  
**API/Service:** POST /api/mentors; GET/PUT/DELETE /api/mentors/me; ส่งยืนยันใหม่ใช้ PUT /me ด้วยข้อมูลเดิม; [backend/src/controllers/mentor.controller.js:44](../../backend/src/controllers/mentor.controller.js#L44)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-mentor | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เพิ่มพี่เลี้ยงทดสอบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | แก้ตำแหน่ง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ส่งลิงก์ใหม่ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | ใช้ชุดไร้ประวัติลองลบและชุดมี weekly history ตรวจ 409 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, mentor_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ข้อมูลและสถานะเปลี่ยนจริง; pending resend ใช้ PUT me; token เก่าถูกยกเลิก; ลบที่มี weekly evidence ได้ 409 และ history คงอยู่

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, mentor_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-010-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** CRUD และส่งลิงก์มีจริง; SMTP ผู้รับจริงและเงื่อนไขลบหลังมีประวัติต้องตรวจ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-011 — บันทึกรายวันและจัดทำเล่มบันทึก

**Requirement ID:** 2.3.1.1 (11) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-daily  
**Frontend/handler:** [frontend/src/pages/studentInternshipLog.js:4](../../frontend/src/pages/studentInternshipLog.js#L4); initStudentInternshipLog  
**API/Service:** GET /api/internship-logs/overview; GET/POST/PUT /days/:date; POST /weeks/:date/submit; [backend/src/services/internshipLog.service.js:6](../../backend/src/services/internshipLog.service.js#L6)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-daily | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกสัปดาห์ในช่วงฝึกงานที่ผ่านมา | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | บันทึกทุกวันทำงาน/วันหยุด | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ส่งทั้งสัปดาห์ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | ตรวจล็อก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | สำรวจ export เล่มรวม | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; รายวัน/weekly persistence มีหลักฐานเดิม; ไม่พบเล่มบันทึกรวม/export และคะแนนรายสัปดาห์ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs, internship_review_tokens, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** หนึ่ง record/Student/date; ข้อมูลครบ; submitted/reviewed ล็อก; revision_requested แก้ได้; ไม่มี export เล่มรวม

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs, internship_review_tokens, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-011-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** รายวัน/weekly persistence มีหลักฐานเดิม; ไม่พบเล่มบันทึกรวม/export และคะแนนรายสัปดาห์ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-012 — นักศึกษาประเมินสถานประกอบการ

**Requirement ID:** 2.3.1.1 (12) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-evaluate  
**Frontend/handler:** [frontend/src/pages/studentCompanyEvaluation.js:3](../../frontend/src/pages/studentCompanyEvaluation.js#L3); initCompanyEvaluation  
**API/Service:** GET/PUT /api/student-coop/company-evaluation; [backend/src/services/companyEvaluation.service.js:6](../../backend/src/services/companyEvaluation.service.js#L6)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; คะแนนตัวอย่าง 3,4,5,6,7 → total 25 / average 5; อีกรอบเปลี่ยนหนึ่งข้อ; comment ไทยสมมติ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-evaluate | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกคะแนน 1–10 ให้ครบห้าข้อ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ใส่ข้อเสนอแนะ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | บันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | แก้หนึ่งข้อและบันทึกอีกครั้ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_evaluations, mentors, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** คะแนนจำนวนเต็ม 1–10 ห้าข้อ; total=sum และ average=sum/5; แก้แล้ว upsert ของตน; ไม่ใช้เป็น academic score

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_evaluations, mentors, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-012-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** คะแนนห้าข้อ 1–10 และค่าเฉลี่ยมีจริง; เป็น feedback บริษัท; ขาด manual save/edit · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-013 — อัปโหลดเล่มโครงการ

**Requirement ID:** 2.3.1.1 (13) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-report-upload  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); uploadCoopProjectFiles  
**API/Service:** POST /api/student-coop/project-book; GET /api/student-coop/project-files/:id/preview; [backend/src/services/studentCoopProject.service.js:12](../../backend/src/services/studentCoopProject.service.js#L12)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-report-upload | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือก PDF เล่มโครงการ ≤10MB | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | อัปโหลด | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดดูไฟล์ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | แทนที่ด้วย PDF ฉบับใหม่ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** รับ PDF ที่ signature/extension ถูกต้อง ≤10MB; preview ของตน; replacement มีไฟล์ปัจจุบันหนึ่งรายการต่อประเภท

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-013-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** PDF ≤10MB และ preview ของเจ้าของ; ยังไม่ได้ตรวจด้วยมือ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-014 — อัปโหลดโปสเตอร์

**Requirement ID:** 2.3.1.1 (14) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-report-upload  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); uploadCoopProjectFiles  
**API/Service:** POST /api/student-coop/poster; GET /api/student-coop/project-files/:id/preview; [backend/src/services/studentCoopProject.service.js:12](../../backend/src/services/studentCoopProject.service.js#L12)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-report-upload | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกโปสเตอร์ PDF/PNG/JPEG ≤10MB | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | อัปโหลด | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดดูไฟล์ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | แทนที่ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** รับ PDF/PNG/JPEG signature ถูกต้อง ≤10MB; preview ตาม MIME; replacement ไม่กระทบเล่มโครงการ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-014-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** PDF/PNG/JPEG ≤10MB และ preview; ยังไม่ได้ตรวจด้วยมือ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-015 — Chatbot ขั้นตอนและเอกสารสำหรับนักศึกษา

**Requirement ID:** 2.3.1.1 (15) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /index.html → index-chat  
**Frontend/handler:** [frontend/src/pages/index.js:11](../../frontend/src/pages/index.js#L11); sendMessage  
**API/Service:** POST /api/v1/chat (NLP เท่านั้น); Express bridge ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /index.html; เปิด index-chat | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิด chatbot หน้าแรก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ถามขั้นตอนเอกสาร | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เปรียบเทียบคำถามอีกเรื่อง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | ดูว่ามีคำตอบจริงหรือข้อความพัฒนา | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: faq_seed.json; TF-IDF + LogisticRegression in memory; no student document DB query; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ปัจจุบัน reply จำลอง ไม่อ้างเป็นคำตอบ NLP/สถานะเอกสาร; บันทึก integration gap

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: faq_seed.json; TF-IDF + LogisticRegression in memory; no student document DB query; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-015-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หน้าแรกตอบข้อความจำลอง; NLP /chat มีจริง แต่ไม่มี Express/UI bridge และสถานะจาก DB · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-016 — ค้นหาและเลือกสถานประกอบการ

**Requirement ID:** 2.3.1.1 (16) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-request  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); coopCompanySearch input / applyCoopCompany  
**API/Service:** GET /api/coop-requests/companies/search; GET /companies/duplicate-check; GET /job-postings/:id; [backend/src/controllers/coopRequest.controller.js:85](../../backend/src/controllers/coopRequest.controller.js#L85)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-request | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดสร้างคำร้อง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | พิมพ์ชื่อบริษัท | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เลือกผล | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | ดูข้อมูลเติม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | ลองบริษัทไม่พบและตรวจชื่อซ้ำ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี company picker ในคำร้อง; public search_company.html ไม่พบ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** picker เติมข้อมูลบริษัทจริง; manual company ได้ snapshot; missing public search ต้องรายงาน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-016-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี company picker ในคำร้อง; public search_company.html ไม่พบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-001 — ติดตามคำร้องและเอกสารของ Staff

**Requirement ID:** 2.3.2 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html → documents  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12); mountStaffDocuments / mountStaffCoopRequests  
**API/Service:** GET /api/staff/coop-requests; GET /api/staff/document-requests และ /:id; [backend/src/services/staffDocuments.service.js:10](../../backend/src/services/staffDocuments.service.js#L10)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด documents | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login Staff | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | ค้นด้วยชื่อ/รหัสทดสอบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | กรองทุกสถานะ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | เปิดรายละเอียดและประวัติ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** กรอง/ค้น/เปลี่ยนหน้าถูก scope; history อ่านได้; สถานะเอกสารตัวอย่างแยกจากเอกสารทางการ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีคิว/ค้นหา/กรอง/ประวัติ; เอกสารทางการและสถานะ Student ยังไม่ครบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-002 — ยกเลิกคำร้องพร้อมเหตุผลและ Student readback

**Requirement ID:** 2.3.2 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html → documents  
**Frontend/handler:** [frontend/src/pages/staffCoopRequests.js:10](../../frontend/src/pages/staffCoopRequests.js#L10); askCancel  
**API/Service:** POST /api/staff/coop-requests/:id/cancel; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด documents | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกคำร้อง advisor_review | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | กดยกเลิก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ลองเหตุผลว่าง | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | ใส่เหตุผลทดสอบและยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Student เปิดอ่าน | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ยกเลิกได้เฉพาะ submitted/staff_review/advisor_review/department_head_review; reason บังคับ; cancelled/review เพิ่มครั้งเดียว; Student เห็นเหตุผล

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐานเดิม final cancellation 28/0; VERIFIED เฉพาะสถานะที่อนุญาต ไม่รวม rollout · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-003 — จัดการหนังสือขอความอนุเคราะห์ / ส่งตัว

**Requirement ID:** 2.3.2 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html → documents  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12); mountStaffDocuments / preview  
**API/Service:** GET /api/staff/document-requests/:id; POST/PUT /:id/documents/:type; POST /:id/documents/:type/generate; GET /:id/documents/:type/preview และ /download; [backend/src/services/staffDocuments.service.js:10](../../backend/src/services/staffDocuments.service.js#L10)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด documents | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือก approved request | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | สร้าง draft cooperation | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | แก้ metadata | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | generate | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | preview/download/print | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 8 | สำรวจ PDF และลบ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; บันทึก draft/generate/revision และ HTML; ไม่พบ official PDF, DELETE และ policy ออกใหม่ |  | ☐ |
| 9 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 10 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history, coop_documents, coop_document_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** draft→generated เป็น HTML; version/history/hash คงอยู่; ส่งตัวต้อง accepted response; official PDF/DELETE ไม่พบ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history, coop_documents, coop_document_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** บันทึก draft/generate/revision และ HTML; ไม่พบ official PDF, DELETE และ policy ออกใหม่ · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-004 — Chatbot ตรวจสถานะเอกสารของ Staff

**Requirement ID:** 2.3.2 (4) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** NOT STARTED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/department_staff/department_staff.html → ไม่พบเมนู  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด ไม่พบเมนู | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Staff | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจเมนูและหน้าเอกสารว่ามี chatbot | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ UI, API หรือ query chatbot สำหรับ Staff |  | ☐ |
| 5 | บันทึก gap หากไม่มี | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ UI, API หรือ query chatbot สำหรับ Staff |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: No chatbot document-status query; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** บันทึก Missing Feature จากหน้าและ source; ไม่สร้างผล chatbot สมมติ

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: No chatbot document-status query; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ UI, API หรือ query chatbot สำหรับ Staff · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-005 — Staff จัดการสถานประกอบการและประกาศงาน

**Requirement ID:** 2.3.2 (5) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html → ไม่พบเมนู  
**Frontend/handler:** ไม่พบ; ไม่พบ consumer  
**API/Service:** GET /api/staff/job-postings และ /:id; POST /:id/publish หรือ /reject; Company CRUD ไม่พบ; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด ไม่พบเมนู | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Staff | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจเมนูบริษัท/งาน | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี Staff publish/reject jobs API; ไม่พบ dashboard บริษัท CRUD หรือหน้าจัดการงาน |  | ☐ |
| 5 | บันทึกว่าไม่พบ UI | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี Staff publish/reject jobs API; ไม่พบ dashboard บริษัท CRUD หรือหน้าจัดการงาน |  | ☐ |
| 6 | ให้ผู้ดูแลอ่าน route inventory แยกจากผล browser | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** API jobs มีจริงแต่หน้า Staff ไม่มี CRUD บริษัท/คิวงาน; browser acceptance ส่วนนี้ยังทำไม่ได้

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี Staff publish/reject jobs API; ไม่พบ dashboard บริษัท CRUD หรือหน้าจัดการงาน · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-006 — จัดการปฏิทินกิจกรรมสหกิจ

**Requirement ID:** 2.3.2 (6) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html → activities  
**Frontend/handler:** [frontend/src/pages/coopActivities.js:5](../../frontend/src/pages/coopActivities.js#L5); mountCoopActivities  
**API/Service:** GET/POST /api/coop-activities/staff; GET/PUT /staff/:id; POST /staff/:id/cancel; [backend/src/services/coopActivity.service.js:8](../../backend/src/services/coopActivity.service.js#L8)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; ชื่อกิจกรรมสมมติ วันเริ่ม/จบอนาคต เวลา Asia/Bangkok; แยก public description และ Staff-only notes

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด activities | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดปฏิทิน Staff | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สร้าง draft | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | แก้พร้อมเหตุผล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | publish | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | ค้น/กรอง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 8 | ยกเลิกอีกกิจกรรม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 9 | Student เปิดอ่าน | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 10 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 11 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activities, coop_activity_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** draft/published/cancelled พร้อม version/history; Student ไม่เห็น draft/Staff private fields; cancelled มี public state

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activities, coop_activity_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐาน activity complete 13/0; สถานะ draft/published/cancelled; ยังไม่รับรอง rollout · ความต่างระหว่าง source/expected/actual: ______

### MAN-STA-007 — Staff จัดการข้อมูลอาจารย์

**Requirement ID:** 2.3.2 (7) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Staff · **สถานะ source:** NOT STARTED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/department_staff/department_staff.html → ไม่พบเมนู  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ Staff route; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html; เปิด ไม่พบเมนู | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Staff | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจเมนูอาจารย์ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; พบ Head administration API แต่ไม่พบ Staff administration API/UI |  | ☐ |
| 5 | บันทึกว่าไม่มีหน้าจัดการของ Staff | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; พบ Head administration API แต่ไม่พบ Staff administration API/UI |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่พบ Staff admin UI/API; Head PATCH เป็นคนละ role

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STA-007-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** พบ Head administration API แต่ไม่พบ Staff administration API/UI · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-001 — อาจารย์เลือกนักศึกษาที่ดูแล

**Requirement ID:** 2.3.3.1 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → advisorRequests  
**Frontend/handler:** [frontend/src/pages/teacherCoop.js:7](../../frontend/src/pages/teacherCoop.js#L7); mountTeacherCoop / mountTeacherSupervision  
**API/Service:** GET /api/teachers/project-advisor-requests; GET /api/supervision/teacher/students; independent selection ไม่พบ; [backend/src/services/coopProjectAdvisor.service.js:6](../../backend/src/services/coopProjectAdvisor.service.js#L6)  
**Preconditions:** บัญชี Teacher active; แยก Class A (advisor_teacher_id) และ Project B (coop_advisor_teacher_id); เตรียมคำร้องหรือ advisor request ที่ role นี้มีสิทธิ์  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด advisorRequests | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login Teacher | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | เปิดคำขอที่ปรึกษาและนัดนิเทศ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจการเลือกนักศึกษานอกความสัมพันธ์ที่ยืนยันแล้ว | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; เห็นนักศึกษาจากคำขอ/ความสัมพันธ์โครงการ; ไม่พบเลือกนักศึกษาโดยอาจารย์อย่างอิสระ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** เลือกได้จากความสัมพันธ์โครงการที่ยืนยันแล้ว; independent selection ไม่มี implementation

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** เห็นนักศึกษาจากคำขอ/ความสัมพันธ์โครงการ; ไม่พบเลือกนักศึกษาโดยอาจารย์อย่างอิสระ · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-002 — อาจารย์รับ / ปฏิเสธเป็นที่ปรึกษาโครงการ

**Requirement ID:** 2.3.3.1 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → advisorRequests  
**Frontend/handler:** [frontend/src/pages/teacherCoop.js:7](../../frontend/src/pages/teacherCoop.js#L7); openDecision  
**API/Service:** GET /api/teachers/project-advisor-requests; POST /:id/accept หรือ /reject; [backend/src/services/coopProjectAdvisor.service.js:6](../../backend/src/services/coopProjectAdvisor.service.js#L6)  
**Preconditions:** บัญชี Teacher active; แยก Class A (advisor_teacher_id) และ Project B (coop_advisor_teacher_id); เตรียมคำร้องหรือ advisor request ที่ role นี้มีสิทธิ์  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด advisorRequests | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Student ส่งคำขอ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | Teacher ที่ถูกเลือกกดยอมรับ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ใช้นักศึกษาอีกชุดทดสอบปฏิเสธพร้อมเหตุผล | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | Student เปิดอ่าน | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Teacher ที่ถูกขอเท่านั้นตัดสิน; confirmed เขียน coop_advisor_teacher_id; rejected มีเหตุผล; Student เห็นหลัง Refresh

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี scoped accept/reject; ยังไม่มีหลักฐาน native Chrome ครบ Student→Teacher→Student · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-003 — อาจารย์ค้นหานักศึกษาและสถานประกอบการ

**Requirement ID:** 2.3.3.1 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → coopApprovals / supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/teacherCoopRequests.js:13](../../frontend/src/pages/teacherCoopRequests.js#L13); mountTeacherCoopRequests / mountTeacherSupervision  
**API/Service:** GET /api/teachers/coop-requests; GET /api/supervision/teacher/students; Company directory ไม่พบ; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชี Teacher active; แยก Class A (advisor_teacher_id) และ Project B (coop_advisor_teacher_id); เตรียมคำร้องหรือ advisor request ที่ role นี้มีสิทธิ์  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด coopApprovals / supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Teacher เปิดคิวและรายชื่อที่ดูแล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เปลี่ยนสถานะ/หน้า | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจ search นักศึกษาและ directory บริษัท | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มีรายชื่อที่ดูแลและคิวคำร้อง; ไม่มี directory บริษัทสำหรับอาจารย์ / search ครบ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, coop_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** คิว/รายชื่อที่ดูแลทำงาน; public company directory และค้นหาเต็มยังขาด

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, coop_requests, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีรายชื่อที่ดูแลและคิวคำร้อง; ไม่มี directory บริษัทสำหรับอาจารย์ / search ครบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-004 — นัด / เลื่อนนัดนิเทศครั้งที่ 1–2

**Requirement ID:** 2.3.3.1 (4) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/teacherSupervision.js:5](../../frontend/src/pages/teacherSupervision.js#L5); mountTeacherSupervision  
**API/Service:** GET /api/supervision/teacher/students/:id; POST/PUT /:id/visits/:visit; POST /:id/appointments/:appointment/link; [backend/src/services/supervision.service.js:8](../../backend/src/services/supervision.service.js#L8)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกนักศึกษาที่เป็น project advisee | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ตรวจข้อมูลพี่เลี้ยง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สร้างครั้ง 1/2 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | เลื่อนครั้ง 1 พร้อมเหตุผล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | ส่งลิงก์ใหม่ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_events, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** เวลาบางกอกในอนาคต; visit 1/2 แยก; pending_confirmation→confirmed; เลื่อนนัดเพิ่ม version/reset confirmation; result แล้วห้ามเลื่อน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_events, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐาน supervision 13/0; สองครั้งและเลื่อนนัด; SMTP/rollout ยังไม่รับรอง · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-005 — อาจารย์ตรวจข้อมูลพี่เลี้ยงก่อนนัดนิเทศ

**Requirement ID:** 2.3.3.1 (5) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/teacherSupervision.js:5](../../frontend/src/pages/teacherSupervision.js#L5); mountTeacherSupervision  
**API/Service:** GET /api/supervision/teacher/students/:id; ตรวจ mentor_verified_at ตอน save; [backend/src/services/supervision.service.js:8](../../backend/src/services/supervision.service.js#L8)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดรายละเอียดนักศึกษาและพี่เลี้ยง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ทำเครื่องหมายตรวจแล้ว | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ทดสอบ mentor pending ในอีกชุดข้อมูล | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, supervision_appointments, supervision_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** pending/unverified mentor นัดไม่ได้; verified_at ต้องตรงข้อมูลปัจจุบัน; ข้อมูลผิดต้องแก้และยืนยันใหม่

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, supervision_appointments, supervision_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ตรวจ verified_at ของพี่เลี้ยงใน context; ไม่ใช่การรับรองตัวตนนอกระบบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-006 — กำหนดผู้แทนพี่เลี้ยงเฉพาะนัดนิเทศ

**Requirement ID:** 2.3.3.1 (6) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/teacherSupervision.js:5](../../frontend/src/pages/teacherSupervision.js#L5); mountTeacherSupervision  
**API/Service:** POST/PUT /api/supervision/teacher/students/:id/visits/:visit พร้อม substitute; [backend/src/services/supervision.service.js:8](../../backend/src/services/supervision.service.js#L8)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เลือกนัดครั้ง 2 | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | เปิดผู้แทน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | กรอกข้อมูลและเหตุผล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | บันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | ผู้แทนเปิดลิงก์และยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, supervision_appointments, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ผู้แทนมีเหตุผลและข้อมูลครบ; snapshot/recipient เป็นผู้แทน; mentors หลักไม่เปลี่ยน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, supervision_appointments, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** เก็บ substitute ใน snapshot ของนัด; ไม่ได้เปลี่ยน mentors หลัก; SMTP ยังไม่รับรอง · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-007 — ผลนิเทศครั้งที่ 1 พร้อมภาพสองภาพ

**Requirement ID:** 2.3.3.1 (7) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/supervisionResult.js:4](../../frontend/src/pages/supervisionResult.js#L4); mountSupervisionResult  
**API/Service:** GET/PUT /api/supervision/teacher/students/:id/appointments/:appointment/visits/1/result; POST /result/complete; GET /result/images/:image; [backend/src/services/supervisionResult.service.js:10](../../backend/src/services/supervisionResult.service.js#L10)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดผลครั้ง 1 หลังนัดยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | บันทึก draft วันที่/สรุป/ข้อเสนอแนะและสองภาพ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | กดเสร็จสมบูรณ์ | completed ต้องเงื่อนไขครบ; ล็อกแก้; Student อ่านเฉพาะ completed |  | ☐ |
| 6 | Student เปิดอ่าน | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_images, supervision_results, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ต้องนัด confirmed; draft เก็บได้; completed ต้องวันที่/summary/สองภาพ PNG/JPEG ≤5MB ต่อภาพ; complete แล้วแก้ไม่ได้; Student อ่าน completed

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_images, supervision_results, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-007-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐาน results 24/0; draft→completed และสองภาพ; ไม่รวม PDF/คะแนน · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-008 — PDF นิเทศครั้งที่ 1

**Requirement ID:** 2.3.3.1 (8) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนู PDF  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ PDF endpoint; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนู PDF | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | เปิดผลครั้ง 1 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สำรวจปุ่ม PDF ทางการ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ PDF renderer/route; ต้องมีแบบฟอร์มทางการและนโยบายลงชื่อ (Dependency blocker) |  | ☐ |
| 5 | บันทึกว่าไม่พบและหยุดขั้นสร้าง PDF | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ PDF renderer/route; ต้องมีแบบฟอร์มทางการและนโยบายลงชื่อ (Dependency blocker) |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: Results/photos available; no PDF issuance record; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี official PDF endpoint/UI; บันทึก dependency template และไม่ทำ browser print แทนการรับรอง PDF

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: Results/photos available; no PDF issuance record; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-008-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ PDF renderer/route; ต้องมีแบบฟอร์มทางการและนโยบายลงชื่อ (Dependency blocker) · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-009 — ผลนิเทศครั้งที่ 2 พร้อมภาพสองภาพ

**Requirement ID:** 2.3.3.1 (9) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → supervisionScheduling  
**Frontend/handler:** [frontend/src/pages/supervisionResult.js:4](../../frontend/src/pages/supervisionResult.js#L4); mountSupervisionResult  
**API/Service:** GET/PUT /api/supervision/teacher/students/:id/appointments/:appointment/visits/2/result; POST /result/complete; GET /result/images/:image; [backend/src/services/supervisionResult.service.js:10](../../backend/src/services/supervisionResult.service.js#L10)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด supervisionScheduling | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดผลครั้ง 2 ของอีก appointment | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | บันทึก draft และสองภาพ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | complete | completed ต้องเงื่อนไขครบ; ล็อกแก้; Student อ่านเฉพาะ completed |  | ☐ |
| 6 | เทียบครั้ง 1 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_images, supervision_results, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ผล visit=2 แยกจาก visit=1; complete ต้องสองภาพ; การแก้ครั้ง 2 ไม่เปลี่ยนครั้ง 1

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_images, supervision_results, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-009-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ผลของ visit=2 แยกนัด/ข้อมูลจากครั้งแรก; ไม่รวมคะแนนและ PDF · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-010 — PDF นิเทศครั้งที่ 2

**Requirement ID:** 2.3.3.1 (10) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนู PDF  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ PDF endpoint; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนู PDF | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | เปิดผลครั้ง 2 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สำรวจ PDF ทางการ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ PDF renderer/route ครั้งที่ 2; ขาด template/signature policy |  | ☐ |
| 5 | บันทึกว่าไม่พบ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ PDF renderer/route ครั้งที่ 2; ขาด template/signature policy |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: Results/photos available; no PDF issuance record; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี official PDF ครั้ง 2; หยุดก่อนขั้นที่ไม่มี implementation

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: Results/photos available; no PDF issuance record; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-010-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ PDF renderer/route ครั้งที่ 2; ขาด template/signature policy · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-011 — อาจารย์ประเมินนักศึกษาเป็นคะแนน

**Requirement ID:** 2.3.3.1 (11) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนูคะแนน  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนูคะแนน | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Teacher | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจหน้าคะแนนนักศึกษา | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ numeric academic assessment UI/API/model; ขาด rubric/maxima (Dependency blocker) |  | ☐ |
| 5 | บันทึกว่าไม่มี | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ numeric academic assessment UI/API/model; ขาด rubric/maxima (Dependency blocker) |  | ☐ |
| 6 | ไม่แทนคะแนนด้วยคำบรรยาย | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มีการบันทึกคะแนนวิชาการ; รอเกณฑ์/คะแนนเต็มและ UI/API/model

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-011-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ numeric academic assessment UI/API/model; ขาด rubric/maxima (Dependency blocker) · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-012 — อาจารย์ประเมินสถานประกอบการ

**Requirement ID:** 2.3.3.1 (12) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** NOT STARTED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนู  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ Teacher endpoint; [backend/src/services/companyEvaluation.service.js:6](../../backend/src/services/companyEvaluation.service.js#L6)  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนู | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Teacher | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจฟอร์มประเมินบริษัท | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ Teacher workplace evaluation; Student feedback ใช้แทนไม่ได้ |  | ☐ |
| 5 | บันทึกว่าไม่มี | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ Teacher workplace evaluation; Student feedback ใช้แทนไม่ได้ |  | ☐ |
| 6 | แยกจาก Student feedback | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี Teacher company evaluation; คะแนน Student ใช้แทนไม่ได้

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-012-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ Teacher workplace evaluation; Student feedback ใช้แทนไม่ได้ · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-013 — ประเมินนักศึกษาครั้งนิเทศที่ 2 เป็นคะแนน

**Requirement ID:** 2.3.3.1 (13) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนูคะแนน  
**Frontend/handler:** [frontend/src/pages/supervisionResult.js:4](../../frontend/src/pages/supervisionResult.js#L4); ไม่พบคะแนน; mountSupervisionResult เป็นข้อความ  
**API/Service:** ไม่พบ numeric assessment endpoint; [backend/src/services/supervisionResult.service.js:10](../../backend/src/services/supervisionResult.service.js#L10)  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนูคะแนน | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดผลครั้ง 2 | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สำรวจคะแนน/rubric | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มีคำบรรยายผลครั้งที่ 2; ไม่พบคะแนนและ rubric |  | ☐ |
| 5 | บันทึกว่าเป็นผลเชิงข้อความ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มีคำบรรยายผลครั้งที่ 2; ไม่พบคะแนนและ rubric |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_results; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ผลข้อความครั้ง 2 อ่านได้; numeric evaluation ยังไม่มี

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_results; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-013-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีคำบรรยายผลครั้งที่ 2; ไม่พบคะแนนและ rubric · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-014 — ประเมินเล่มบันทึก เล่มโครงการ ชิ้นงาน โปสเตอร์และสอบ

**Requirement ID:** 2.3.3.1 (14) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → ไม่พบเมนูคะแนน  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด ไม่พบเมนูคะแนน | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | สำรวจเล่ม/โปสเตอร์/คณะกรรมการ/คะแนนสอบ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ final artifact grading / committee; ขาดเกณฑ์ คะแนนเต็ม และการรวมกรรมการ |  | ☐ |
| 4 | บันทึกจุดที่ไม่มี UI และ dependency | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ final artifact grading / committee; ขาดเกณฑ์ คะแนนเต็ม และการรวมกรรมการ |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี final grading/กรรมการ/รวมคะแนน; รอ rubric/maxima และ aggregation policy

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-014-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ final artifact grading / committee; ขาดเกณฑ์ คะแนนเต็ม และการรวมกรรมการ · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-015 — อาจารย์จัดการบัญชีส่วนตัว

**Requirement ID:** 2.3.3.1 (15) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → แสดงชื่อผู้ใช้ / ออกจากระบบ  
**Frontend/handler:** [frontend/src/pages/teacherCoop.js:7](../../frontend/src/pages/teacherCoop.js#L7); teacherLogout click  
**API/Service:** GET /api/teachers/me; self-edit ไม่พบ; ไม่พบ  
**Preconditions:** บัญชี Teacher active; แยก Class A (advisor_teacher_id) และ Project B (coop_advisor_teacher_id); เตรียมคำร้องหรือ advisor request ที่ role นี้มีสิทธิ์  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด แสดงชื่อผู้ใช้ / ออกจากระบบ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login Teacher | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | ดูชื่อผู้ใช้ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจแก้ข้อมูลตนเอง/เปลี่ยนรหัสผ่าน | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี login/profile display; ไม่พบ Teacher self-edit API/UI หรือเปลี่ยนรหัสผ่าน |  | ☐ |
| 6 | Logout | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** อ่าน profile/Logout ได้; ไม่มี self-edit/change password จึงบันทึก gap

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-015-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี login/profile display; ไม่พบ Teacher self-edit API/UI หรือเปลี่ยนรหัสผ่าน · ความต่างระหว่าง source/expected/actual: ______

### MAN-TEA-016 — อาจารย์ประจำชั้นอนุมัติ / ปฏิเสธคำร้อง

**Requirement ID:** 2.3.3.1 (16) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Teacher · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html → coopApprovals  
**Frontend/handler:** [frontend/src/pages/teacherCoopRequests.js:13](../../frontend/src/pages/teacherCoopRequests.js#L13); mountTeacherCoopRequests  
**API/Service:** GET /api/teachers/coop-requests และ /:id; POST /:id/approve หรือ /reject; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชี Teacher active; แยก Class A (advisor_teacher_id) และ Project B (coop_advisor_teacher_id); เตรียมคำร้องหรือ advisor request ที่ role นี้มีสิทธิ์  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; เปิด coopApprovals | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Class Advisor A เปิด advisor_review ของตน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | approve | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ใช้คำร้องอีกชุด reject พร้อมเหตุผล | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | ให้ Project Advisor B ตรวจขอบเขต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Class A เท่านั้น approve advisor_review→department_head_review; reject มีเหตุผล→rejected; Project B ไม่ได้ Class authority

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-TEA-016-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี Class authority และขั้นอนุมัติจริง; หลักฐาน SQL/DOM เดิม ไม่ครบ native UI · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-001 — หัวหน้าภาคค้นหาอาจารย์

**Requirement ID:** 2.3.3.2 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_head/department_head.html → ไม่พบเมนู  
**Frontend/handler:** ไม่พบ; ไม่พบ UI  
**API/Service:** GET /api/department-head/teachers; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด ไม่พบเมนู | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Head | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจค้นหาอาจารย์ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี GET teachers API แบบ department scoped; หน้า Head ไม่มี directory/search |  | ☐ |
| 5 | หน้าไม่มี UI | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี GET teachers API แบบ department scoped; หน้า Head ไม่มี directory/search |  | ☐ |
| 6 | ผู้ดูแลเทียบ GET teachers inventory | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Head API จำกัดภาคมีจริง; ไม่มีหน้า search อาจารย์ จึงไม่อ้าง UI PASS

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี GET teachers API แบบ department scoped; หน้า Head ไม่มี directory/search · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-002 — หัวหน้าภาคค้นหานักศึกษาสหกิจ

**Requirement ID:** 2.3.3.2 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_head/department_head.html → coopApprovals  
**Frontend/handler:** [frontend/src/pages/departmentHead.js:5](../../frontend/src/pages/departmentHead.js#L5); mountDepartmentHead  
**API/Service:** GET /api/department-head/coop-requests และ /:id; ไม่พบ  
**Preconditions:** บัญชี Head active มี is_department_head และ department ที่ตรง Class advisor; มีคำร้องทดสอบ department_head_review และบัญชีภาคอื่นสำหรับตรวจ scope  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด coopApprovals | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Head เปิดคิวคำร้องภาค | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กรองสถานะ/เปลี่ยนหน้า | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | สำรวจ directory นักศึกษาแยก | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มีคิวคำร้องในภาค; ไม่พบ directory นักศึกษาแยก |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** คิวคำร้องจำกัดภาคได้; ไม่มี Student directory UI แยก

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มีคิวคำร้องในภาค; ไม่พบ directory นักศึกษาแยก · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-003 — หัวหน้าภาคกำหนดอาจารย์โครงการ

**Requirement ID:** 2.3.3.2 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/department_head/department_head.html → ไม่พบเมนูกำหนดอาจารย์  
**Frontend/handler:** ไม่พบ; ไม่พบ UI  
**API/Service:** PATCH /api/department-head/students/:id/coop-advisor (409 ทุกคำขอ); ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด ไม่พบเมนูกำหนดอาจารย์ | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Head | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจเมนูกำหนดอาจารย์ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; service คืน 409 เสมอเพื่อป้องกัน bypass Student request→Teacher accept; Code/policy blocker |  | ☐ |
| 5 | บันทึกไม่มี UI และ service 409 | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; service คืน 409 เสมอเพื่อป้องกัน bypass Student request→Teacher accept; Code/policy blocker |  | ☐ |
| 6 | ไม่พยายาม bypass | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** direct assign route 409 ตาม policy; ไม่มี assignment UI; ห้ามใช้ bypass acceptance

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** service คืน 409 เสมอเพื่อป้องกัน bypass Student request→Teacher accept; Code/policy blocker · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-004 — หัวหน้าภาคแก้ไขข้อมูลอาจารย์

**Requirement ID:** 2.3.3.2 (4) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_head/department_head.html → ไม่พบเมนูแก้ไขอาจารย์  
**Frontend/handler:** ไม่พบ; ไม่พบ UI  
**API/Service:** PATCH /api/department-head/teachers/:id; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด ไม่พบเมนูแก้ไขอาจารย์ | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Head | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจฟอร์มแก้ไขอาจารย์ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี PATCH teachers API; ไม่มี Head management form / manual acceptance |  | ☐ |
| 5 | บันทึกไม่มี UI แม้มี PATCH endpoint | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี PATCH teachers API; ไม่มี Head management form / manual acceptance |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** backend PATCH scope ภาคมี; ไม่มี editing UI จึงไม่มีการบันทึกจาก browser

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี PATCH teachers API; ไม่มี Head management form / manual acceptance · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-005 — หัวหน้าภาคแก้ไขข้อมูลส่วนตัว

**Requirement ID:** 2.3.3.2 (5) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_head/department_head.html → ไม่พบเมนูแก้ไข profile  
**Frontend/handler:** ไม่พบ; ไม่พบ UI  
**API/Service:** GET/PATCH /api/department-head/me; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด ไม่พบเมนูแก้ไข profile | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Login Head | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | สำรวจฟอร์ม profile | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี GET/PATCH me; ไม่มีฟอร์มแก้ไขส่วนตัวใน Head dashboard |  | ☐ |
| 5 | บันทึกไม่มี UI แม้มี GET/PATCH me | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; มี GET/PATCH me; ไม่มีฟอร์มแก้ไขส่วนตัวใน Head dashboard |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** GET/PATCH me มี; ไม่มี self-edit form จึงยังไม่ครบ workflow

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี GET/PATCH me; ไม่มีฟอร์มแก้ไขส่วนตัวใน Head dashboard · ความต่างระหว่าง source/expected/actual: ______

### MAN-HEAD-006 — หัวหน้าภาคอนุมัติ / ปฏิเสธคำร้อง

**Requirement ID:** 2.3.3.2 (6) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Head · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_head/department_head.html → coopApprovals  
**Frontend/handler:** [frontend/src/pages/departmentHead.js:5](../../frontend/src/pages/departmentHead.js#L5); mountDepartmentHead  
**API/Service:** GET /api/department-head/coop-requests และ /:id; POST /:id/approve หรือ /reject; ไม่พบ  
**Preconditions:** บัญชี Head active มี is_department_head และ department ที่ตรง Class advisor; มีคำร้องทดสอบ department_head_review และบัญชีภาคอื่นสำหรับตรวจ scope  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_head/department_head.html; เปิด coopApprovals | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Head ของภาคเปิด department_head_review | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | approve | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ใช้คำร้องอีกชุด reject พร้อมเหตุผล | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | Student เปิดอ่าน | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Head flag active + ภาคตรง Class advisor; department_head_review→approved/rejected; reason/readback/audit ตรง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, coop_request_reviews, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-HEAD-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** มี live Head flag/department scope; ต้องตรวจ native UI และ rejection readback · ความต่างระหว่าง source/expected/actual: ______

### MAN-COM-001 — สถานประกอบการลงประกาศงานพร้อม CAPTCHA

**Requirement ID:** 2.3.4 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Company · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/recruit_student/recruit_student.html → ฟอร์มรับสมัคร  
**Frontend/handler:** [frontend/src/pages/recruitStudent.js:25](../../frontend/src/pages/recruitStudent.js#L25); recruitment form submit  
**API/Service:** POST /api/job-submissions; [backend/src/services/jobSubmission.service.js:7](../../backend/src/services/jobSubmission.service.js#L7)  
**Preconditions:** recruitment feature เปิดโดยผู้ดูแลไว้แล้ว, live provider config ที่ผู้ดูแลอนุมัติ, inbox บริษัททดสอบ; ไม่แก้ .env เพื่อให้ checklist ผ่าน  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Company หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/recruit_student/recruit_student.html; เปิด ฟอร์มรับสมัคร | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดฟอร์มรับสมัคร | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กรอกข้อมูลบริษัท/ตำแหน่งครบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | CAPTCHA | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | submit หนึ่งครั้ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | ตรวจข้อความและ inbox ทดสอบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, company_access_tokens, job_postings, job_posting_work_modes, job_submissions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ส่งผ่าน CAPTCHA แล้ว pending_email_verification; verification→pending_review; ยังไม่ published จน Staff approve; provider error แสดงตามจริง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, company_access_tokens, job_postings, job_posting_work_modes, job_submissions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-COM-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ฟอร์ม/API/CAPTCHA/email lifecycle มีจริง; live Turnstile/inbox และ publication UI ยังไม่ตรวจรับ · ความต่างระหว่าง source/expected/actual: ______

### MAN-COM-002 — สถานประกอบการแก้ไขข้อมูลตนเอง / ประกาศ

**Requirement ID:** 2.3.4 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Company · **สถานะ source:** NOT STARTED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/recruit_student/recruit_student.html → ไม่พบ portal  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ owner company/job update endpoint; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Company หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/recruit_student/recruit_student.html; เปิด ไม่พบ portal | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | เปิด recruitment | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สำรวจ portal แก้บริษัท/ประกาศเดิม | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ owner portal/CRUD/update posting route; email capability เป็นการ verify submission |  | ☐ |
| 5 | บันทึกว่าไม่พบและหยุด | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ owner portal/CRUD/update posting route; email capability เป็นการ verify submission |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่พบ company owner CRUD/posting edit portal; ไม่มีขั้นบันทึกที่ควรอ้าง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-COM-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ owner portal/CRUD/update posting route; email capability เป็นการ verify submission · ความต่างระหว่าง source/expected/actual: ______

### MAN-COM-003 — ยืนยันอีเมลและข้อมูลสถานประกอบการ

**Requirement ID:** 2.3.4 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Company · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/recruit_student/recruit_verify_email.html → หน้ายืนยันอีเมล  
**Frontend/handler:** [frontend/src/pages/recruitVerifyEmail.js:14](../../frontend/src/pages/recruitVerifyEmail.js#L14); recruitVerifyEmail  
**API/Service:** GET/POST /api/job-submissions/verify-email; POST /api/job-submissions/resend-verification; [backend/src/services/companyVerification.service.js:15](../../backend/src/services/companyVerification.service.js#L15)  
**Preconditions:** recruitment feature เปิดโดยผู้ดูแลไว้แล้ว, live provider config ที่ผู้ดูแลอนุมัติ, inbox บริษัททดสอบ; ไม่แก้ .env เพื่อให้ checklist ผ่าน  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Company หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/recruit_student/recruit_verify_email.html; เปิด หน้ายืนยันอีเมล | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดลิงก์ verification จาก inbox ทดสอบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดลิงก์เดิมอีกครั้ง | used/expired/revoked capability ถูกปฏิเสธ; ปิด token ก่อนบันทึกภาพ |  | ☐ |
| 6 | ตรวจ pending_review และ resend ตาม UI | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, company_access_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ลิงก์ purpose/submission scoped ใช้ครั้งเดียว; expired/revoked/used ถูกปฏิเสธ; email_verified ไม่รับรองรายละเอียดบริษัท

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, company_access_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-COM-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ยืนยัน email ไป pending_review ได้; ไม่ใช่ยืนยันรายละเอียดบริษัทครบทุกช่อง · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-001 — พี่เลี้ยงตรวจบันทึกรายวันเป็นชุดรายสัปดาห์

**Requirement ID:** 2.3.5.1 (1) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → โหมดตรวจสัปดาห์  
**Frontend/handler:** [frontend/src/pages/mentorInternshipReview.js:4](../../frontend/src/pages/mentorInternshipReview.js#L4); initMentorInternshipReview  
**API/Service:** GET /api/internship-logs/mentor/weeks และ /:id; POST /:id/review; [backend/src/services/internshipLog.service.js:6](../../backend/src/services/internshipLog.service.js#L6)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด โหมดตรวจสัปดาห์ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดลิงก์ review ของพี่เลี้ยง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เปิดทั้งสัปดาห์ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ขอแก้พร้อม feedback | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Student แก้/ส่งใหม่ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Mentor reviewed | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_review_tokens, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** review ทั้งสัปดาห์พร้อม feedback/ผู้ตรวจ/เวลา; revision_requested กลับ Student; reviewed ล็อก; ไม่มีคะแนนรายสัปดาห์

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_review_tokens, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** reviewed/revision_requested และ feedback มีจริง; ไม่พบคะแนนตัวเลขรายสัปดาห์ · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-002 — พี่เลี้ยงยืนยัน / แก้ไขข้อมูลส่วนตัว

**Requirement ID:** 2.3.5.1 (2) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → โหมดยืนยันข้อมูล  
**Frontend/handler:** [frontend/src/pages/mentor.js:33](../../frontend/src/pages/mentor.js#L33); confirmVerificationButton / saveProfileButton  
**API/Service:** GET /api/mentor-verification/verify; PUT /profile; POST /confirm; [backend/src/controllers/mentorVerification.controller.js:21](../../backend/src/controllers/mentorVerification.controller.js#L21)  
**Preconditions:** ลิงก์ของ Mentor/ผู้แทนสำหรับ test record ที่ได้รับอนุญาต; purpose ถูกต้องและยังไม่หมดอายุ; มีลิงก์ expired/used/revoked เตรียมไว้โดยผู้ดูแลสำหรับ negative case  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด โหมดยืนยันข้อมูล | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดลิงก์พี่เลี้ยง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | แก้ชื่อ/ตำแหน่งที่อนุญาต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | กดบันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | ยืนยันครั้งเดียว | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | เปิดลิงก์เดิมอีกครั้ง | used/expired/revoked capability ถูกปฏิเสธ; ปิด token ก่อนบันทึกภาพ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, mentor_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** บันทึก/confirm ของลิงก์พี่เลี้ยงนี้เท่านั้น; status=verified และ verified_at; used/expired กลับมาใช้ไม่ได้

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน mentors, mentor_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐานยืนยันครั้งเดียว/expired/consumed เดิม; ไม่รับรอง SMTP ผู้รับจริง · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-003 — พี่เลี้ยงยืนยันข้อมูลก่อนวันนิเทศ

**Requirement ID:** 2.3.5.1 (3) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → โหมดยืนยันนัด  
**Frontend/handler:** [frontend/src/pages/mentorSupervision.js:4](../../frontend/src/pages/mentorSupervision.js#L4); initMentorSupervision  
**API/Service:** GET /api/supervision/mentor/appointment; POST /api/supervision/mentor/confirm; [backend/src/services/supervision.service.js:8](../../backend/src/services/supervision.service.js#L8)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด โหมดยืนยันนัด | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดลิงก์นัด | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ตรวจข้อมูล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ลองยืนยันโดยไม่ checkbox | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | เลือก checkbox | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | ยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_events, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ต้อง checkbox; token version/purpose/current mentor ผูกนัด; consumed ใช้ซ้ำไม่ได้; Teacher เห็น confirmed

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_events, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** identity checkbox และ capability นัดเดียว; ไม่รับรองเข้าร่วมนิเทศจริง · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-004 — ผู้แทนพี่เลี้ยงยืนยันข้อมูลสำหรับนัด

**Requirement ID:** 2.3.5.1 (4) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** VERIFIED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → โหมดยืนยันนัดผู้แทน  
**Frontend/handler:** [frontend/src/pages/mentorSupervision.js:4](../../frontend/src/pages/mentorSupervision.js#L4); initMentorSupervision  
**API/Service:** GET /api/supervision/mentor/appointment; POST /api/supervision/mentor/confirm; [backend/src/services/supervision.service.js:8](../../backend/src/services/supervision.service.js#L8)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด โหมดยืนยันนัดผู้แทน | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ผู้แทนเปิดลิงก์ของตน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ตรวจชื่อ snapshot | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | checkbox | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | ยืนยัน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Teacher ดู readback | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 8 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 9 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** เฉพาะผู้แทน snapshot ของนัดยืนยันได้; Mentor หลักไม่เปลี่ยน; ไม่รับรอง attendance

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** capability ผูก substitute snapshot; ไม่ได้สร้างบัญชีหรือเปลี่ยนพี่เลี้ยงหลัก · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-005 — พี่เลี้ยงบันทึกพฤติกรรม ขาด ลา มาสาย

**Requirement ID:** 2.3.5.1 (5) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → ไม่พบเมนูพฤติกรรม  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ Mentor attendance endpoint; [backend/src/services/internshipLog.service.js:6](../../backend/src/services/internshipLog.service.js#L6)  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด ไม่พบเมนูพฤติกรรม | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Mentor เปิด weekly review | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | สำรวจฟอร์มขาด/ลา/มาสาย | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; Student บันทึก non_working_reason ได้; ไม่พบ Mentor attendance/late/penalty workflow |  | ☐ |
| 5 | เทียบ Student non_working reason | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่พบ Mentor attendance/late rubric; Student non_working reason เป็นคนละหน้าที่

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** Student บันทึก non_working_reason ได้; ไม่พบ Mentor attendance/late/penalty workflow · ความต่างระหว่าง source/expected/actual: ______

### MAN-MEN-006 — พี่เลี้ยงประเมินนักศึกษา เล่ม ชิ้นงานและโปสเตอร์

**Requirement ID:** 2.3.5.1 (6) (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Mentor · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** /src/mentor_coop/mentor_verify_user.html → ไม่พบเมนูคะแนน  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/mentor_coop/mentor_verify_user.html; เปิด ไม่พบเมนูคะแนน | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | Mentor เปิดหน้ายืนยัน/weekly | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | สำรวจ final numeric rubric และเล่ม/โปสเตอร์ grading | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่พบ final Mentor assessment model/API/UI; ขาด rubric/maxima |  | ☐ |
| 5 | บันทึกไม่มี | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี final assessment numeric persistence; weekly feedback ใช้แทนไม่ได้

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-MEN-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ final Mentor assessment model/API/UI; ขาด rubric/maxima · ความต่างระหว่าง source/expected/actual: ______

### MAN-ACA-001 — คำนวณคะแนนวิชาการรวมและคณะกรรมการสอบ

**Requirement ID:** 2.3.6.1 (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Academic · **สถานะ source:** BLOCKED · **ประเภทกรณี:** Gap survey; acceptance ของส่วนที่ไม่มี implementation ยังทำไม่ได้  
**หน้า/เมนู:** ไม่มี UI คะแนนรวม → ไม่พบเมนูคะแนนรวม  
**Frontend/handler:** ไม่พบ; ไม่พบ  
**API/Service:** ไม่พบ score/committee endpoint; ไม่พบ  
**Preconditions:** บัญชีทดสอบ role นี้และ environment ที่ได้รับอนุญาต; เป็นการสำรวจ gap; ส่วนที่ไม่มี UI/API ไม่สามารถทำ acceptance ได้ ไม่สร้างข้อมูลชดเชยหรือ bypass  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Academic หรือเปิด capability link ของ inbox ทดสอบ; ไป ไม่มี UI คะแนนรวม; เปิด ไม่พบเมนูคะแนนรวม | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | สำรวจคะแนนรวม/คณะกรรมการ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่มี score engine หรือ grade/committee models; สัดส่วนใน README ยังไม่ยืนยัน ทก.01 |  | ☐ |
| 4 | บันทึกไม่มี UI/API | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ไม่มี score engine หรือ grade/committee models; สัดส่วนใน README ยังไม่ยืนยัน ทก.01 |  | ☐ |
| 5 | ขอ rubric ก่อนกำหนด expected totals | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่พบ score engine; สัดส่วนจาก README คือ 20+30+10+5+25+10=100 แต่ยังไม่มีเกณฑ์/aggregation ที่ยืนยันทางการ

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-ACA-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มี score engine หรือ grade/committee models; สัดส่วนใน README ยังไม่ยืนยัน ทก.01 · ความต่างระหว่าง source/expected/actual: ______

### MAN-STU-017 — นักศึกษาจัดการบัญชีผู้ใช้

**Requirement ID:** USER-S-ACCOUNT (provisional; ยังไม่ยืนยัน ทก.01)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile / ออกจากระบบ  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242); saveStudentProfile / logout  
**API/Service:** GET /api/auth/me; PUT /api/student-profile/student-info; change/reset password ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html; เปิด panel-profile / ออกจากระบบ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Student ดู/แก้ข้อมูลบัญชีที่มี | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | Logout | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 5 | สำรวจเปลี่ยน/กู้รหัสผ่านและยืนยันอีเมลบัญชี | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; แก้ profile/logout ได้; ไม่พบ password change/recovery และนิยามบัญชีทางการ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** แก้ข้อมูลที่ฟอร์มมี/Logout ได้; recovery/change password และ policy account ยังขาด

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-STU-017-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** แก้ profile/logout ได้; ไม่พบ password change/recovery และนิยามบัญชีทางการ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-001 — เข้าสู่ระบบและออกจากระบบ Staff

**Requirement ID:** X01 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /staff-login.html → /src/department_staff/department_staff.html →  /src/department_staff/department_staff.html  
**Frontend/handler:** [frontend/src/pages/staffLogin.js:3](../../frontend/src/pages/staffLogin.js#L3)  
**API/Service:** POST /api/staff/auth/login; GET /api/staff/auth/me; [backend/src/services/staffAuth.service.js:6](../../backend/src/services/staffAuth.service.js#L6)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /staff-login.html → /src/department_staff/department_staff.html; เปิด  /src/department_staff/department_staff.html | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login บัญชี active | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | ลองรหัสผิดครั้งเดียว | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Logout | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 6 | เปิดหน้าเดิม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน department_staffs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** สิทธิ์ Staff ตรวจ active จาก DB; หลัง logout ไม่อ่านข้อมูลส่วนตัวได้

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน department_staffs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-001-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ยังไม่ได้ทดสอบใหม่; ผล cancellation login เดิมครอบคลุมเพียงบัญชี fixture · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-002 — เข้าสู่ระบบอาจารย์และหัวหน้าภาค

**Requirement ID:** X02 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Teacher/Head · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /teacher-login.html; /department-head-login.html → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/teacherLogin.js:4](../../frontend/src/pages/teacherLogin.js#L4)  
**API/Service:** POST /api/teachers/auth/login; POST /api/department-head/auth/login; [backend/src/services/teacherAuth.service.js:14](../../backend/src/services/teacherAuth.service.js#L14)  
**Preconditions:** บัญชี Head active มี is_department_head และ department ที่ตรง Class advisor; มีคำร้องทดสอบ department_head_review และบัญชีภาคอื่นสำหรับตรวจ scope  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher/Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /teacher-login.html; /department-head-login.html; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login Teacher และ Head ด้วย session แยก | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | ให้ Teacher ธรรมดาเปิดหน้า Head | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Logout | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Head ต้องมี flag สดและภาควิชา; token namespace เดียวต้องแสดง role ถูกต้อง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-002-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** การสลับ Teacher/Head และ concurrent sections ต้องตรวจมือ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-003 — Dashboard และเปลี่ยน panel นักศึกษา

**Requirement ID:** X03 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-overview →  panel-overview  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** GET /api/auth/me; GET /api/student-profile/me; [backend/src/controllers/auth.controller.js:8](../../backend/src/controllers/auth.controller.js#L8)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-overview; เปิด  panel-overview | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | เปิดภาพรวม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เลือกเมนูทุก panel | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | กลับภาพรวม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** แสดงข้อมูลของตนและ panel ถูกต้อง; ส่วนที่เป็น mock ต้องไม่เข้าใจว่าบันทึกแล้ว

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students, student_profiles; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-003-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ยังไม่รับรองทุกการ์ดด้วย browser · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-004 — Dashboard เจ้าหน้าที่และการนำทางเอกสาร/ปฏิทิน

**Requirement ID:** X04 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html#documents → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** GET /api/staff/auth/me; GET /api/staff/document-requests; [backend/src/routes/roleWorkflow.routes.js:22](../../backend/src/routes/roleWorkflow.routes.js#L22)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; ชื่อกิจกรรมสมมติ วันเริ่ม/จบอนาคต เวลา Asia/Bangkok; แยก public description และ Staff-only notes

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html#documents; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | เลือกจัดการเอกสาร | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดกิจกรรม | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | กลับเอกสาร | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, department_staffs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** session คงอยู่และแต่ละ section โหลดข้อมูลจริง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_requests, department_staffs; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-004-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ dashboard สถิติแยก; หน้าเป็นคิวเอกสาร · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-005 — Dashboard อาจารย์/หัวหน้าภาคและงานที่ต่างกัน

**Requirement ID:** X05 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Teacher/Head · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/teacher_coop/teacher_coop.html; /src/department_head/department_head.html → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/departmentHead.js:5](../../frontend/src/pages/departmentHead.js#L5)  
**API/Service:** GET /api/teachers/me; GET /api/department-head/me; [backend/src/routes/roleWorkflow.routes.js:22](../../backend/src/routes/roleWorkflow.routes.js#L22)  
**Preconditions:** บัญชี Head active มี is_department_head และ department ที่ตรง Class advisor; มีคำร้องทดสอบ department_head_review และบัญชีภาคอื่นสำหรับตรวจ scope  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Teacher/Head หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/teacher_coop/teacher_coop.html; /src/department_head/department_head.html; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดสามเมนู Teacher | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เปิด Head queue และลิงก์งานอาจารย์ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, coop_requests, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Class approvals แยกจาก project advisees; Head queue ใช้ภาค

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_project_advisor_requests, coop_requests, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-005-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มีสถิติ/dashboard บริหารเพิ่มเติม · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-006 — อัปโหลดและครอปรูปประวัติ

**Requirement ID:** X06 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile → รูปประวัติ →  panel-profile → รูปประวัติ  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** POST/GET /api/student-profile/profile-image; [backend/src/controllers/studentProfile.controller.js:616](../../backend/src/controllers/studentProfile.controller.js#L616)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-profile → รูปประวัติ; เปิด  panel-profile → รูปประวัติ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | กดรูป | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เลือกรูป JPG/PNG/WebP ≤5MB | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ครอป/บันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | โหลดใหม่ | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** รูปของเจ้าของแสดงใหม่; ข้อมูล file_type=profile_image ตรงกัน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน students; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-006-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ตรวจ MIME/size; ไม่พบ strict signature แบบ project upload · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-007 — สกัดข้อความ PDF และ OCR Resume

**Requirement ID:** X07 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student/NLP · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile → Resume →  panel-profile → Resume  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** POST /api/student-profile/resume → POST /api/v1/resume-ocr; [backend/src/services/resumeOcr.client.js:5](../../backend/src/services/resumeOcr.client.js#L5)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student/NLP หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-profile → Resume; เปิด  panel-profile → Resume | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | อัปโหลด PDF แบบข้อความและแบบสแกนสองชุด | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ตรวจ extraction status | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** pdf_text หรือ ocr พร้อม ready; OCR ล้มเหลวเก็บไฟล์ได้แต่ failed; ไม่อ้างว่าจับคู่จาก Resume ได้

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-007-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** Tesseract tha+eng และ NLP สด NOT TESTED · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-008 — ตรวจชื่อสถานประกอบการซ้ำและข้อมูลประกาศงาน

**Requirement ID:** X08 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-request →  panel-request  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** GET /api/coop-requests/companies/duplicate-check; GET /api/coop-requests/job-postings/:id; [backend/src/controllers/coopRequest.controller.js:85](../../backend/src/controllers/coopRequest.controller.js#L85)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-request; เปิด  panel-request | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | กรอกชื่อบริษัทที่มีแล้ว | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เลือกจากผลซ้ำ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดงานจากผล matching | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, coop_requests, job_postings; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** เติม company/job snapshot; แยกชื่อ manual กับ existing ID

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, coop_requests, job_postings; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-008-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** published check มี; expires_at ไม่พบใน lookup · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-009 — อ่านผลตอบรับ/ปฏิเสธบริษัทและประวัติ

**Requirement ID:** X09 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-request → รายละเอียด →  panel-request → รายละเอียด  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** GET /api/coop-requests/:id/company-response; [backend/src/controllers/companyResponse.controller.js:1](../../backend/src/controllers/companyResponse.controller.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-request → รายละเอียด; เปิด  panel-request → รายละเอียด | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | หลัง Staff บันทึกผลตอบบริษัทเปิดรายละเอียดคำร้องของตน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 5 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** อ่านผลตอบและ correction history ได้ตาม scope

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-009-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่ใช่ portal ให้บริษัทตอบเอง; ไม่มี Student letter download · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-010 — ส่งบันทึกทั้งสัปดาห์ / ขอแก้ / ส่งใหม่

**Requirement ID:** X10 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-daily →  panel-daily  
**Frontend/handler:** [frontend/src/pages/studentInternshipLog.js:4](../../frontend/src/pages/studentInternshipLog.js#L4)  
**API/Service:** POST /api/internship-logs/weeks/:date/submit; [backend/src/services/internshipLog.service.js:6](../../backend/src/services/internshipLog.service.js#L6)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-daily; เปิด  panel-daily | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | บันทึกครบวันภายในสัปดาห์ที่ผ่านมา | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ส่ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | Mentor ขอแก้ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | แก้และส่งอีกครั้ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** submitted→revision_requested→submitted; snapshot เดิมไม่หาย; reviewed ล็อก

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_daily_logs, internship_weeks, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-010-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มี numeric weekly scores; ขาด manual ใหม่ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-011 — ส่งลิงก์ตรวจสัปดาห์ใหม่และดู feedback

**Requirement ID:** X11 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student/Mentor · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-daily →  panel-daily  
**Frontend/handler:** [frontend/src/pages/studentInternshipLog.js:4](../../frontend/src/pages/studentInternshipLog.js#L4)  
**API/Service:** POST /api/internship-logs/mentor-link; GET /overview; [backend/src/services/internshipLog.service.js:6](../../backend/src/services/internshipLog.service.js#L6)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student/Mentor หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-daily; เปิด  panel-daily | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | กดส่งลิงก์อีกครั้ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | Mentor เปิดลิงก์ใหม่ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ลิงก์เก่าถูกยกเลิก | used/expired/revoked capability ถูกปฏิเสธ; ปิด token ก่อนบันทึกภาพ |  | ☐ |
| 6 | Student อ่าน feedback | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_review_tokens, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** แสดง email_sent ตามจริง; feedback/ผู้ตรวจ/เวลาคงอยู่

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน internship_review_tokens, internship_week_events; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-011-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** SMTP inbox ยังไม่ verified · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-012 — อ่านนัดนิเทศและผล completed พร้อมรูป

**Requirement ID:** X12 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-overview / ข้อมูลนิเทศ →  panel-overview / ข้อมูลนิเทศ  
**Frontend/handler:** [frontend/src/pages/studentSupervision.js:4](../../frontend/src/pages/studentSupervision.js#L4)  
**API/Service:** GET /api/supervision/student; GET /student/appointments/:appointment/visits/:visit/result; GET /result/images/:image; [backend/src/services/supervisionResult.service.js:10](../../backend/src/services/supervisionResult.service.js#L10)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-overview / ข้อมูลนิเทศ; เปิด  panel-overview / ข้อมูลนิเทศ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Teacher complete ผลทั้งสองครั้ง | completed ต้องเงื่อนไขครบ; ล็อกแก้; Student อ่านเฉพาะ completed |  | ☐ |
| 4 | Student เปิดอ่านวันนัด/ผล/รูป | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_images, supervision_results; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ดูเฉพาะของตน; draft ไม่ปรากฏ; ไม่มี controls แก้ไข

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน supervision_appointments, supervision_images, supervision_results; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-012-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** history ผล draft/revisions เป็น Teacher; ไม่พบ Student grading · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-013 — เปิด preview เล่ม/โปสเตอร์ด้วย blob ที่มีสิทธิ์

**Requirement ID:** X13 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-report-upload →  panel-report-upload  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** GET /api/student-coop/project-files/:id/preview; [backend/src/services/studentCoopProject.service.js:12](../../backend/src/services/studentCoopProject.service.js#L12)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-report-upload; เปิด  panel-report-upload | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | อัปโหลดไฟล์ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | กดดูไฟล์ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เปิดด้วย Student B ใน session อื่นโดยใช้ ID ทดสอบที่อนุญาต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** B ถูกปฏิเสธ; ไม่มี storage path ใน response; blob ถูก revoke หลังปิด

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-013-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มี Teacher/Mentor artifact review endpoint ที่ตรวจพบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-014 — บันทึกและแก้ผลตอบบริษัทพร้อมเหตุผล

**Requirement ID:** X14 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html#documents → รายละเอียด →  รายละเอียด  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** POST/PUT /api/staff/document-requests/:id/company-response; GET /:id/company-response/history; [backend/src/services/staffDocuments.service.js:10](../../backend/src/services/staffDocuments.service.js#L10)  
**Preconditions:** นักศึกษา co_op มีหนึ่งช่วงฝึกงานที่อนุมัติและ Mentor verified; เตรียมสัปดาห์ที่ผ่านมา/สัปดาห์แรกหรือท้ายแบบ partial; แต่ละวันไม่เกินวันนี้และอยู่ในช่วง; ข้อมูลเป็น test records ที่ได้รับอนุญาต  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html#documents → รายละเอียด; เปิด  รายละเอียด | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | หลัง generate cooperation เลือก accepted | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | บันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | แก้เป็น rejected พร้อมเหตุผลก่อนมี placement | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** version/history เพิ่ม; หลังมี placement ห้ามแก้; Student readback ตรง

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, company_response_history; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-014-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** HTML prerequisites เท่านั้น; official policy ยังขาด · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-015 — ตรวจสิทธิ์สร้างหนังสือส่งตัว

**Requirement ID:** X15 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html#documents → หนังสือส่งตัว →  หนังสือส่งตัว  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** GET /api/staff/document-requests/:id/placement-eligibility; [backend/src/services/companyResponseRules.js:3](../../backend/src/services/companyResponseRules.js#L3)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html#documents → หนังสือส่งตัว; เปิด  หนังสือส่งตัว | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปรียบเทียบคำร้องไม่มี cooperation, rejected response และ accepted response | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 4 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 5 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** สร้างได้เฉพาะ approved + cooperation generated + accepted response

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_responses, coop_documents, coop_requests; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-015-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ใช้ development letters; ไม่รับรองหนังสือทางการ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-016 — อ่าน revision เอกสารเก่า / download / print HTML

**Requirement ID:** X16 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/department_staff/department_staff.html#documents → ประวัติฉบับ →  ประวัติฉบับ  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** GET /api/staff/document-requests/:id/documents/:type/preview และ /download?version=...; [backend/src/services/staffDocuments.service.js:10](../../backend/src/services/staffDocuments.service.js#L10)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/department_staff/department_staff.html#documents → ประวัติฉบับ; เปิด  ประวัติฉบับ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | generate | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | แก้ draft | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | generate ใหม่ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | เปิด revision เก่า | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | ดาวน์โหลด | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 8 | Print dialog แล้วปิด | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 9 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 10 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_documents, coop_document_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** HTML hash/snapshot แยกฉบับ; format text/html; ไม่มีการลบประวัติ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_documents, coop_document_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-016-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ official PDF และ document delete · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-017 — ตรวจ/เผยแพร่/ปฏิเสธประกาศงานผ่าน API

**Requirement ID:** X17 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Staff · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** ไม่มี production UI; /src/department_staff/department_staff.html → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** GET /api/staff/job-postings และ /:id; POST /:id/publish หรือ /reject; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** บัญชี Staff active และ record ทดสอบหลาย state; งานเอกสารต้อง approved/document_issued/in_progress และข้อมูล snapshot ครบ; mutation เฉพาะ test environment  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; เหตุผลตัวอย่าง «ทดสอบการยกเลิกในระบบทดสอบ» และค่าว่างเพื่อ negative case

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Staff หรือเปิด capability link ของ inbox ทดสอบ; ไป ไม่มี production UI; /src/department_staff/department_staff.html; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | สำรวจหน้า Staff ว่ามีคิวงานหรือไม่ | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ขาด UI; manual write API อยู่นอก checklist browser |  | ☐ |
| 4 | เทียบ read-only route inventory | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; ขาด UI; manual write API อยู่นอก checklist browser |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** API มี pending_review→published/rejected; ไม่รายงาน browser PASS เพราะไม่มีหน้าจอ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน companies, job_postings, job_posting_reviews; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-017-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ขาด UI; manual write API อยู่นอก checklist browser · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-018 — ปฏิทินกิจกรรมแบบอ่านอย่างเดียว

**Requirement ID:** X18 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-activities →  panel-activities  
**Frontend/handler:** [frontend/src/pages/coopActivities.js:5](../../frontend/src/pages/coopActivities.js#L5)  
**API/Service:** GET /api/coop-activities/student และ /student/:id; [backend/src/services/coopActivity.service.js:8](../../backend/src/services/coopActivity.service.js#L8)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; ชื่อกิจกรรมสมมติ วันเริ่ม/จบอนาคต เวลา Asia/Bangkok; แยก public description และ Staff-only notes

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-activities; เปิด  panel-activities | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Staff สร้าง draft/published/cancelled | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | Student เปลี่ยนเดือน/รายการและค้นหา | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activities; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** draft และ Staff notes/reasons ไม่เปิดเผย; ไม่มี mutation controls

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activities; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-018-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** หลักฐานเดิมมี; rollout ปัจจุบันไม่ทราบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-019 — ฟอร์มขอย้ายสถานประกอบการ

**Requirement ID:** X19 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-transfer →  panel-transfer  
**Frontend/handler:** [frontend/src/pages/student_coop.js:242](../../frontend/src/pages/student_coop.js#L242)  
**API/Service:** ไม่พบ; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-transfer; เปิด  panel-transfer | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดขอย้าย | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กรอกข้อมูลทดสอบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | กดส่ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | Refresh | อ่านข้อมูลล่าสุดจาก persistence ตรงกับผลของผู้ดำเนินการ; ไม่เห็น record อื่น |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ปัจจุบันแจ้งยังไม่เชื่อม Backend ด้วย success style; ไม่มีคำร้องถูกเก็บ

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-019-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** Confirmed code gap; ต้องไม่เข้าใจว่าการย้ายเสร็จแล้ว · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-020 — การ์ดงาน / carousel / ค้นหาและกรองหน้าแรก

**Requirement ID:** X20 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Public · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /index.html → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/index.js:11](../../frontend/src/pages/index.js#L11)  
**API/Service:** ไม่พบ API ค้นหา/โหลดงานหน้าแรก; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Public หรือเปิด capability link ของ inbox ทดสอบ; ไป /index.html; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดหน้าแรก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เลื่อน carousel | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ค้น/กรอง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | กดค้นหาสถานประกอบการ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** carousel มี UI; search/filter console-only และ search_company.html ไม่มี

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-020-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** งานแสดงเป็น mock; public search ขาด · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-021 — ส่งอีเมลยืนยันบริษัทใหม่และ recovery cookie

**Requirement ID:** X21 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Company · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/recruit_student/recruit_student.html → หลังส่งประกาศ →  หลังส่งประกาศ  
**Frontend/handler:** [frontend/src/pages/recruitStudent.js:25](../../frontend/src/pages/recruitStudent.js#L25)  
**API/Service:** POST /api/job-submissions/resend-verification; [backend/src/services/recruitmentRecovery.service.js:7](../../backend/src/services/recruitmentRecovery.service.js#L7)  
**Preconditions:** recruitment feature เปิดโดยผู้ดูแลไว้แล้ว, live provider config ที่ผู้ดูแลอนุมัติ, inbox บริษัททดสอบ; ไม่แก้ .env เพื่อให้ checklist ผ่าน  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Company หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/recruit_student/recruit_student.html → หลังส่งประกาศ; เปิด  หลังส่งประกาศ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ส่งประกาศใน inbox ทดสอบ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 4 | ใช้ปุ่มส่งยืนยันใหม่ตามที่ UI เปิดให้ | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | เปิดลิงก์เก่า/ใหม่ | used/expired/revoked capability ถูกปฏิเสธ; ปิด token ก่อนบันทึกภาพ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | capability ที่ถูกใช้/revoked/expired ไม่กลับใช้งานได้; fragment อาจถูกล้างและ token อยู่ใน memory จึงอาจต้องเปิดลิงก์ใหม่ที่ยัง valid; ตรวจ persistence ผ่านหน้าผู้ส่ง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_access_tokens, job_submissions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** origin/cooldown/recovery ตรวจสอบ; token เก่าถูก revoke; ไม่ส่ง secret ลงภาพ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_access_tokens, job_submissions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-021-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** live SMTP/secure cookie environment ยังไม่ตรวจรับ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-022 — รายชื่ออาจารย์สำหรับเลือกประจำชั้น/โครงการ

**Requirement ID:** X22 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Student/Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/student_coop/student_coop.html → panel-profile / panel-coop →  panel-profile / panel-coop  
**Frontend/handler:** [frontend/src/api/teacher.api.js:3](../../frontend/src/api/teacher.api.js#L3)  
**API/Service:** GET /api/teachers; [backend/src/controllers/teacher.controller.js:1](../../backend/src/controllers/teacher.controller.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Student/Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/student_coop/student_coop.html → panel-profile / panel-coop; เปิด  panel-profile / panel-coop | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิด dropdown ทั้งสองแบบ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เปรียบเทียบรายชื่อและเลือกคนละคน | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** Class ID แยก Project ID; endpoint directory ใช้ JWT เท่านั้น แต่ไม่ใช่ approval API

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-022-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ต้องตกลง directory policy; ไม่ยืนยันเป็น unauthorized access · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-023 — JWT / RBAC / ownership / session logout

**Requirement ID:** X23 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** หน้า login และ dashboard ทุกบทบาท → ดู Navigation  
**Frontend/handler:** [frontend/src/api/client.js:27](../../frontend/src/api/client.js#L27)  
**API/Service:** protected API families; GET /api/auth/me; GET /api/teachers/me; [backend/src/middlewares/auth.middleware.js:62](../../backend/src/middlewares/auth.middleware.js#L62)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป หน้า login และ dashboard ทุกบทบาท; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิดหน้า Staff ด้วย Student | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | เปิด Head ด้วย Teacher | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | A/B อ่านข้อมูลของตน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Logout และ Back | ล้าง session namespace และกลับ login; Back ไม่เปิดข้อมูลส่วนตัวได้ |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน department_staffs, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** 401/403/404 ตาม route; ไม่อ่าน/แก้ของคนอื่น; token ไม่บันทึกในรายงาน

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน department_staffs, students, teachers; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-023-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** storage XSS policy และ generic directory ต้องตรวจ; ไม่มี exploit ที่ยืนยัน · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-024 — ประวัติ audit ของคำร้อง เอกสาร งาน บันทึกและนิเทศ

**Requirement ID:** X24 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** รายละเอียดแต่ละฟังก์ชัน → ประวัติ →  ประวัติ  
**Frontend/handler:** [frontend/src/pages/staffDocuments.js:12](../../frontend/src/pages/staffDocuments.js#L12)  
**API/Service:** detail/history endpoints ของแต่ละ module; [backend/src/services/roleWorkflow.service.js:35](../../backend/src/services/roleWorkflow.service.js#L35)  
**Preconditions:** นักศึกษา co_op มีคำร้อง approved/document_issued/in_progress เพียงช่วงเดียว, project advisor confirmed, Mentor verified; ผู้รับลิงก์เป็น inbox ทดสอบที่ได้รับอนุญาต; นัดใหม่เลือกวันอนาคต Asia/Bangkok; บันทึกผลใช้วันที่นิเทศจริงไม่เกินวันนี้  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป รายละเอียดแต่ละฟังก์ชัน → ประวัติ; เปิด  ประวัติ | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ทำการเปลี่ยนที่อนุญาตจากกรณีหลัก | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | อ่าน history เก่าและใหม่ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activity_history, coop_document_revisions, coop_request_reviews, internship_week_events, job_posting_reviews, supervision_events, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** actor/from/to/reason/version คงอยู่; ไม่พบ global audit viewer หรือ auth/security event audit

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน coop_activity_history, coop_document_revisions, coop_request_reviews, internship_week_events, job_posting_reviews, supervision_events, supervision_result_revisions; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-024-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** เป็น domain audit; ไม่ใช่ระบบ audit ทุกเหตุการณ์ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-025 — File Storage และการควบคุมสิทธิ์อ่านไฟล์

**Requirement ID:** X25 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** Student profile/project และ supervision results → ดู Navigation  
**Frontend/handler:** [frontend/src/api/studentCoop.api.js:11](../../frontend/src/api/studentCoop.api.js#L11)  
**API/Service:** GET profile-image/project preview/supervision images; [backend/src/config/storage.js:1](../../backend/src/config/storage.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป Student profile/project และ supervision results; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | อ่านไฟล์ทดสอบของตน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ตรวจไฟล์ผ่าน Network | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ลองบัญชี B แบบไม่แก้ข้อมูล | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files, supervision_images; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่มี public static storage route; path containment/ownership มี; credentials ไม่ปรากฏ

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน student_files, supervision_images; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-025-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** signature policies ต่างกัน; ไม่ได้ตรวจ physical volume · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-026 — Toast / reason modal / loading / focus

**Requirement ID:** X26 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** ปุ่มบันทึก/ยกเลิก/ยืนยันของแต่ละหน้า → ดู Navigation  
**Frontend/handler:** [frontend/src/ui/feedback.js:3](../../frontend/src/ui/feedback.js#L3)  
**API/Service:** ไม่ต้องมี API ของ UI helper; ใช้ mutation เดิม; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป ปุ่มบันทึก/ยกเลิก/ยืนยันของแต่ละหน้า; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ใช้ Tab/Shift+Tab/Escape | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | ยกเลิก modal | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ยืนยันหนึ่งครั้ง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | ดู loading/toast | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** confirm จำกัด Tab และคืน focus; action alert ยังไม่มี Tab trap แบบเดียวกัน

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-026-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่รับรองทุก custom modal; G-UX-01 · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-027 — Error Handling และการกู้หน้าหลัง offline

**Requirement ID:** X27 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** หน้าค้นหา/บันทึก/นัด/เอกสาร → ดู Navigation  
**Frontend/handler:** [frontend/src/api/client.js:27](../../frontend/src/api/client.js#L27)  
**API/Service:** API เดิม; timeout 30s ฝั่ง client; [backend/src/app.js:1](../../backend/src/app.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป หน้าค้นหา/บันทึก/นัด/เอกสาร; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | DevTools Network offline | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กดอ่าน/refresh | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | กลับ online | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | retry | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 7 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 8 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB สำหรับ error adapter; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** แจ้ง error ไม่แสดง success; ไม่เอาข้อมูลเก่ามาแสดงเป็นล่าสุด; parser คืน safe message

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB สำหรับ error adapter; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-027-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** health/db ยังคืน error.message ตรง · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-028 — Rate limiting login/recruitment/supervision

**Requirement ID:** X28 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** หน้า login / รับสมัคร / นัดนิเทศ → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/login.js:10](../../frontend/src/pages/login.js#L10)  
**API/Service:** Staff/Teacher login, recruitment, supervision limited; Student login/register ไม่พบ limiter; [backend/src/middlewares/recruitmentRateLimit.middleware.js:4](../../backend/src/middlewares/recruitmentRateLimit.middleware.js#L4)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป หน้า login / รับสมัคร / นัดนิเทศ; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | Login ผิดหนึ่งครั้งและดู feedback | role/identity ถูกต้อง; โหลดข้อมูลที่มีสิทธิ์เท่านั้น |  | ☐ |
| 4 | ตรวจการป้องกันจาก source โดยไม่ยิงซ้ำ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ห้าม brute force; ทดสอบ 429 เฉพาะเมื่อผู้ดูแลเตรียมสถานะไว้; UI บอก retry ได้

**PostgreSQL / persistence:** ไม่พบ model/table ของฟังก์ชันนี้จาก source; ไม่สั่ง SELECT ตารางสมมติ ไม่เพิ่ม schema; บันทึก gap เท่านั้น

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-028-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่พบ Student/mentor-verification/internship-review limiter · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-029 — Email notification และผลส่งจริง

**Requirement ID:** X29 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** PARTIAL · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** Mentor/weekly/supervision/recruitment resend controls → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/studentInternshipLog.js:4](../../frontend/src/pages/studentInternshipLog.js#L4)  
**API/Service:** mutation ส่ง email ใน services; [backend/src/services/email.service.js:10](../../backend/src/services/email.service.js#L10)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป Mentor/weekly/supervision/recruitment resend controls; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ใช้ inbox ทดสอบที่ได้รับอนุญาต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | กดส่งจากกรณีหลัก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | ตรวจผู้รับ/หัวข้อแบบปิดข้อมูลลับ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: capability tables; SMTP transport; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** email_sent ต้องตรงจริง; saved mutation คงอยู่แม้อีเมลล้มเหลวตาม module

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: capability tables; SMTP transport; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-029-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่มี unified in-app notification center; SMTP ไม่ทดสอบ · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-030 — Logging และ transaction / optimistic concurrency

**Requirement ID:** X30 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** เอกสาร/นัด/บันทึก/ปฏิทิน → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/coopActivities.js:5](../../frontend/src/pages/coopActivities.js#L5)  
**API/Service:** PUT และ POST ที่ใช้ version/expected timestamp; [backend/src/services/staffDocuments.service.js:10](../../backend/src/services/staffDocuments.service.js#L10)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป เอกสาร/นัด/บันทึก/ปฏิทิน; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | สองแท็บเปิด record ทดสอบเดียวกัน | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | แท็บแรกบันทึก | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | แท็บสองบันทึกค่าค้าง | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: sequelize transactions; domain history; console/NLP logging; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** 409 ไม่เขียนทับ; current row และ history เปลี่ยนสอดคล้อง; ไม่ log secret ในรายงาน

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: sequelize transactions; domain history; console/NLP logging; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-030-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่ยืนยัน operational log redaction ทุกเส้นทางหรือ crash durability · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-031 — Responsive / keyboard / accessibility

**Requirement ID:** X31 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** ทุก 13 HTML และ nested panels → ดู Navigation  
**Frontend/handler:** [frontend/src/styles/main.css:1](../../frontend/src/styles/main.css#L1)  
**API/Service:** ไม่ใช้ API เฉพาะ; ไม่พบ  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป ทุก 13 HTML และ nested panels; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | เปิด 1440/1366/768/390px | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | Tab ทุก control | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | ตรวจ overflow/labels/Thai/contrast | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** อ่านและคลิกได้; เห็น focus; modal ไม่ทิ้ง focus; ไม่มีผลมือที่กรอกไว้

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: ไม่ใช้ DB; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-031-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** CSS media rules มี; ไม่มี fresh visual acceptance · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-032 — Resume matching API แบบเดิมแยกจาก job-matches

**Requirement ID:** X32 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** NLP · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** ไม่พบ product UI consumer → ดู Navigation  
**Frontend/handler:** ไม่พบ  
**API/Service:** POST /api/v1/resume-match; [nlp-service/app/services/matching_service.py:1](../../nlp-service/app/services/matching_service.py#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ; PDF ข้อความและ PDF สแกนไทย/อังกฤษ, PNG/JPEG/WebP เฉพาะชนิดที่ฟอร์มรองรับ, ไฟล์ปกติที่เกิน limit สำหรับ negative validation; ห้าม payload อันตราย

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท NLP หรือเปิด capability link ของ inbox ทดสอบ; ไป ไม่พบ product UI consumer; เปิด ดู Navigation | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | ตรวจเอกสาร endpoint และตัวอย่างโดยอ่านอย่างเดียว | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | หากไม่มี UI ให้บันทึก NOT TESTED | บันทึกสิ่งที่มี/ขาดตาม source; ไม่กรอก PASS รับรองส่วนที่ยังไม่มี; runtime ไม่ได้ทดสอบ; เป็น duplicate-capability candidate ไม่ใช่พิสูจน์ dead code |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: data/processed job postings fallback; ไม่ใช้ PostgreSQL; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** TF-IDF/cosine ranking implementation มี; ไม่ถือว่าเป็น UI integration

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: data/processed job postings fallback; ไม่ใช้ PostgreSQL; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-032-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** runtime ไม่ได้ทดสอบ; เป็น duplicate-capability candidate ไม่ใช่พิสูจน์ dead code · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-033 — Health และ topology Docker / PostgreSQL

**Requirement ID:** X33 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Shared/NLP · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** ไม่พบเมนูผู้ใช้; health probe → ดู Navigation  
**Frontend/handler:** ไม่พบ  
**API/Service:** GET /; GET /health/db; GET NLP /health; [backend/src/app.js:1](../../backend/src/app.js#L1)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Shared/NLP หรือเปิด capability link ของ inbox ทดสอบ; ไป ไม่พบเมนูผู้ใช้; health probe; เปิด ดู Navigation | สำรวจหน้า existing ที่ระบุ; หากไม่มี UI ของฟังก์ชัน ให้บันทึก gap โดยไม่สร้างหน้าสมมติ |  | ☐ |
| 3 | ผู้ดูแลใช้หน้า health อ่านอย่างเดียวใน environment ที่ได้รับอนุญาต | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 4 | บันทึก status แบบปิด diagnostics | feedback/loading และสถานะตรง API; ดูผลเฉพาะฟังก์ชันด้านล่าง; ห้าม success เมื่อ mutation ไม่สำเร็จ |  | ☐ |
| 5 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 6 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | อ่านเฉพาะ metadata/สถานะที่มีจริง: PostgreSQL connection; named volumes; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** app startup authenticate เท่านั้น; ไม่ auto-migrate; health status ไม่ยืนยัน feature acceptance

**PostgreSQL / persistence:** อ่านเฉพาะ metadata/สถานะที่มีจริง: PostgreSQL connection; named volumes; หากฟังก์ชันเป็น UI-only ไม่ต้องตรวจ PostgreSQL

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-033-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่ได้เปิด Docker/DB; health/db error มี diagnostics exposure · ความต่างระหว่าง source/expected/actual: ______

### MAN-EXT-034 — CAPTCHA และ email capability security

**Requirement ID:** X34 (extra/shared; ไม่มีเลขข้อทางการ)  
**บทบาท:** Company/Shared · **สถานะ source:** IMPLEMENTED · **ประเภทกรณี:** Main flow + negative/scope/persistence ตามรายการ  
**หน้า/เมนู:** /src/recruit_student/recruit_student.html; /recruit_verify_email.html → ดู Navigation  
**Frontend/handler:** [frontend/src/pages/recruitVerifyEmail.js:14](../../frontend/src/pages/recruitVerifyEmail.js#L14)  
**API/Service:** POST /api/job-submissions; GET/POST /verify-email; [backend/src/services/captcha.service.js:15](../../backend/src/services/captcha.service.js#L15)  
**Preconditions:** บัญชีทดสอบที่ได้รับอนุญาตของ role นี้; environment ที่เปิดไว้อยู่แล้ว; ไม่ใช้บัญชี/ข้อมูลจริงของผู้อื่น  
**ข้อมูลทดสอบ:** ใช้ชื่อสมมติและอีเมล inbox ทดสอบที่ได้รับอนุญาต; อ้าง record ด้วย label TEST-A / TEST-B; ไม่ใส่ข้อมูลส่วนบุคคลหรือ credential ในผล/ภาพ

| ขั้นตอน | การกระทำด้วยตนเอง | ผลลัพธ์ที่คาดหวัง | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจเงื่อนไขก่อนทดสอบและระบุ TEST-A/TEST-B ของ case นี้ | มีบัญชี/ข้อมูล/สิทธิ์/schema ตาม Preconditions; ถ้าไม่พร้อมหยุด dependent steps และกรอก NOT TESTED |  | ☐ |
| 2 | เข้าสู่ระบบด้วยบทบาท Company/Shared หรือเปิด capability link ของ inbox ทดสอบ; ไป /src/recruit_student/recruit_student.html; /recruit_verify_email.html; เปิด ดู Navigation | หน้าและเมนูตรง role; ข้อมูลทดสอบเฉพาะของผู้มีสิทธิ์ |  | ☐ |
| 3 | ทดสอบขาด CAPTCHA ในฟอร์มที่อนุญาต | validation/scope ใช้กฎปัจจุบัน; ไม่เปลี่ยนข้อมูลเมื่อไม่ผ่าน; ดูผลรวมเฉพาะฟังก์ชันด้านล่าง |  | ☐ |
| 4 | ตรวจ expired/revoked link ที่เตรียมไว้ | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 5 | เปิด token เดิมอีกครั้ง | หน้า/ข้อมูล/controls ทำตามสิทธิ์และเงื่อนไขของฟังก์ชัน; ดู Expected Result เฉพาะด้านล่าง |  | ☐ |
| 6 | Refresh แล้วกลับเมนูเดิม / session ใหม่ตามชนิดของลิงก์ | ข้อมูลที่บันทึกสำเร็จกลับมาตรงเดิมจาก API; ไม่มีสิทธิ์ค้างจาก session อื่น; gap ที่ไม่มี persistence ให้บันทึกตรงตามจริง |  | ☐ |
| 7 | ผู้มีสิทธิ์อ่าน pgAdmin เฉพาะ record ทดสอบ และเก็บ screenshot แบบปิดข้อมูลส่วนบุคคล | ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_access_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง |  | ☐ |

**Expected Result เฉพาะฟังก์ชัน:** ไม่เกิด submission เมื่อ verification ไม่ผ่าน; token ผูก purpose/submission และใช้ซ้ำไม่ได้

**PostgreSQL / persistence:** ใน pgAdmin ที่ได้รับอนุญาต อ่านเฉพาะ record ทดสอบใน company_access_tokens; ตรวจค่าที่แก้, owner/FK, status/version และจำนวน current/history ที่สัมพันธ์กันก่อน/หลัง; ไม่ UPDATE/DELETE/TRUNCATE และไม่ดู/คัดลอก password_hash/token_hash/extracted_text ที่มีข้อมูลจริง

**หลัง Refresh:** ตรวจ current state/version/ownership และข้อมูลที่บันทึก; ประวัติ snapshot เดิมต้องยังอ่านได้ใน module ที่มี history; สำหรับ UI-only/missing module ไม่มี DB value ที่ควรอ้างว่า saved สำหรับ verification ที่ one-time ใช้หน้าผู้ส่งตรวจ verified/confirmed state หลัง action

**Screenshot ที่ควรบันทึก:** MAN-EXT-034-before, -validation, -after-save, -after-refresh; ถ้าเป็น gap เก็บภาพหน้า/เมนูที่สำรวจแทน; ปิดชื่อ/อีเมล/รหัส/ลิงก์ลับทั้งหมด

**ผลผู้ใช้:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · ผู้ตรวจ: ______ · วันที่/เวลา Asia/Bangkok: ______  
**Actual Result:** ______  
**Bug ID:** ______  
**หมายเหตุ:** ไม่ bypass provider; live Turnstile NOT TESTED · ความต่างระหว่าง source/expected/actual: ______

## Security checklist เสริม (8 Test IDs)

| Test ID | Requirement | บทบาท | หน้า | ทำด้วยมืออย่างปลอดภัย | Expected | PASS | FAIL | NOT TESTED | Bug ID |
|---|---|---|---|---|---|---|---|---|---|
| MAN-SEC-001 | X23 / Student ownership | Student A/B | /src/student_coop/student_coop.html | เปิด A/B คนละ browser profile; อ่าน profile/request/project และ screenshot ของตน; หากต้องตรวจ ID endpoint ให้ใช้ GET read-only ที่ผู้ดูแลเตรียมไว้เท่านั้น | A ไม่เห็น B; other-owner detail/file ตอบ 403/404 ตาม route; ไม่เปลี่ยน ID/mutation ของข้อมูลจริง | ☐ | ☐ | ☐ |  |
| MAN-SEC-002 | X23 / role guards | Student/Staff/Teacher/Head | login และ dashboard ทุก role | Student เปิด Staff HTML; Teacher ธรรมดาเปิด Head HTML; ดูข้อความ/Network หลังโหลด; Logout และ Back | HTML shell อาจโหลดได้ แต่ protected API ต้องปฏิเสธ; ไม่ถือว่าเปิด HTML เท่ากับ bypass; role session ไม่ปน | ☐ | ☐ | ☐ |  |
| MAN-SEC-003 | 2.3.3.1 (16) / Class vs Project | Class A / Project B | /src/teacher_coop/teacher_coop.html#coopApprovals | ให้ B เปิดคิวของตนและตรวจไม่มีคำร้อง Class A; ให้ A ทำ approval ของ test record จาก case หลัก; อ่าน ID สองชนิดก่อน/หลัง | Project advisor ไม่ได้ Class authority; A review เท่านั้น; IDs ไม่เปลี่ยนตาม approval | ☐ | ☐ | ☐ |  |
| MAN-SEC-004 | 2.3.3.2 (6) / live Head scope | Head ต่างภาค | /src/department_head/department_head.html | ใช้บัญชีต่างภาคที่เตรียมไว้เปิด queue/detail ของตัวเอง; ผู้ดูแลให้ GET test ID ต่างภาคแบบอ่านอย่างเดียวถ้าจำเป็น | scope ตามภาค Class advisor; role claim อย่างเดียวไม่พอ ต้อง live active Head; ไม่มีการแก้ flag ใน audit/checklist | ☐ | ☐ | ☐ |  |
| MAN-SEC-005 | Mentor verification/review/appointment tokens | Mentor | /src/mentor_coop/mentor_verify_user.html | เปิดลิงก์ expired/revoked/used ที่ผู้ดูแลเตรียม; ลองลิงก์ wrong-purpose ทดสอบหนึ่งครั้งโดยไม่ส่งต่อหรือเดา token | ปฏิเสธ; ไม่มี private data; query/fragment ถูกจัดการตาม mode; ไม่เก็บ raw token ในผล; หมดอายุ appointment ≤เวลานัด หรือ 7 วัน | ☐ | ☐ | ☐ |  |
| MAN-SEC-006 | 2.3.4 (1)/(3) / CAPTCHA/email | Company | /src/recruit_student/recruit_student.html; recruit_verify_email.html | ฟอร์มทดสอบขาด CAPTCHA; เปิด email capability ที่ used/expired; ลิงก์ไม่ถูกต้องที่ผู้ดูแลเตรียม | ไม่ verify/publish เมื่อไม่ผ่าน; email verify ไม่ข้าม pending_review; ไม่ bypass CAPTCHA/provider | ☐ | ☐ | ☐ |  |
| MAN-SEC-007 | upload/file ownership | Student / Teacher | Student profile/project และ Teacher results | ใช้ไฟล์ปกติชนิดไม่รองรับ/เกินขนาด; บันทึก validation; เปิดไฟล์ของตน; บัญชี B ใช้ GET ID ทดสอบต่างเจ้าของที่ได้รับอนุญาต | profile ≤5MB JPG/PNG/WebP; Resume/book ≤10MB PDF; poster ≤10MB PDF/PNG/JPEG; supervision ≤5MB PNG/JPEG×2; unauthorized file denied; ไม่ใช้ malicious content | ☐ | ☐ | ☐ |  |
| MAN-SEC-008 | errors/rate limit/session | ทุก role | หน้า login/refresh และ Network | Login ผิดหนึ่งครั้ง; DevTools offline เพื่ออ่าน; online retry; อ่าน safe error response; ตรวจ rate policy จาก source; ไม่ brute force/ไม่สร้าง 500 บนระบบจริง | ไม่ expose password/secret/SQL; 429 เป็นกรณีที่ผู้ดูแลเตรียมไว้เท่านั้น; Student limiter gap ยังมี; health diagnostics ต้องปิดข้อมูลก่อนบันทึก | ☐ | ☐ | ☐ |  |

### MAN-SEC-001 — X23 / Student ownership

**Requirement ID:** X23 / Student ownership · **บทบาท:** Student A/B  
**หน้า/เมนู/URL:** /src/student_coop/student_coop.html  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | เปิด A/B คนละ browser profile; อ่าน profile/request/project และ screenshot ของตน; หากต้องตรวจ ID endpoint ให้ใช้ GET read-only ที่ผู้ดูแลเตรียมไว้เท่านั้น | A ไม่เห็น B; other-owner detail/file ตอบ 403/404 ตาม route; ไม่เปลี่ยน ID/mutation ของข้อมูลจริง |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ students; coop_requests; student_files; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** students; coop_requests; student_files; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-001-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-002 — X23 / role guards

**Requirement ID:** X23 / role guards · **บทบาท:** Student/Staff/Teacher/Head  
**หน้า/เมนู/URL:** login และ dashboard ทุก role  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | Student เปิด Staff HTML; Teacher ธรรมดาเปิด Head HTML; ดูข้อความ/Network หลังโหลด; Logout และ Back | HTML shell อาจโหลดได้ แต่ protected API ต้องปฏิเสธ; ไม่ถือว่าเปิด HTML เท่ากับ bypass; role session ไม่ปน |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ teachers; department_staffs; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** teachers; department_staffs; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-002-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-003 — 2.3.3.1 (16) / Class vs Project

**Requirement ID:** 2.3.3.1 (16) / Class vs Project · **บทบาท:** Class A / Project B  
**หน้า/เมนู/URL:** /src/teacher_coop/teacher_coop.html#coopApprovals  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | ให้ B เปิดคิวของตนและตรวจไม่มีคำร้อง Class A; ให้ A ทำ approval ของ test record จาก case หลัก; อ่าน ID สองชนิดก่อน/หลัง | Project advisor ไม่ได้ Class authority; A review เท่านั้น; IDs ไม่เปลี่ยนตาม approval |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ students; coop_request_reviews; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** students; coop_request_reviews; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-003-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-004 — 2.3.3.2 (6) / live Head scope

**Requirement ID:** 2.3.3.2 (6) / live Head scope · **บทบาท:** Head ต่างภาค  
**หน้า/เมนู/URL:** /src/department_head/department_head.html  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | ใช้บัญชีต่างภาคที่เตรียมไว้เปิด queue/detail ของตัวเอง; ผู้ดูแลให้ GET test ID ต่างภาคแบบอ่านอย่างเดียวถ้าจำเป็น | scope ตามภาค Class advisor; role claim อย่างเดียวไม่พอ ต้อง live active Head; ไม่มีการแก้ flag ใน audit/checklist |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ teachers; students; coop_requests; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** teachers; students; coop_requests; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-004-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-005 — Mentor verification/review/appointment tokens

**Requirement ID:** Mentor verification/review/appointment tokens · **บทบาท:** Mentor  
**หน้า/เมนู/URL:** /src/mentor_coop/mentor_verify_user.html  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | เปิดลิงก์ expired/revoked/used ที่ผู้ดูแลเตรียม; ลองลิงก์ wrong-purpose ทดสอบหนึ่งครั้งโดยไม่ส่งต่อหรือเดา token | ปฏิเสธ; ไม่มี private data; query/fragment ถูกจัดการตาม mode; ไม่เก็บ raw token ในผล; หมดอายุ appointment ≤เวลานัด หรือ 7 วัน |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ mentor_tokens; internship_review_tokens; supervision_tokens (อ่าน status/time เท่านั้น); ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** mentor_tokens; internship_review_tokens; supervision_tokens (อ่าน status/time เท่านั้น); status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-005-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-006 — 2.3.4 (1)/(3) / CAPTCHA/email

**Requirement ID:** 2.3.4 (1)/(3) / CAPTCHA/email · **บทบาท:** Company  
**หน้า/เมนู/URL:** /src/recruit_student/recruit_student.html; recruit_verify_email.html  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | ฟอร์มทดสอบขาด CAPTCHA; เปิด email capability ที่ used/expired; ลิงก์ไม่ถูกต้องที่ผู้ดูแลเตรียม | ไม่ verify/publish เมื่อไม่ผ่าน; email verify ไม่ข้าม pending_review; ไม่ bypass CAPTCHA/provider |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ company_access_tokens; job_postings; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** company_access_tokens; job_postings; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-006-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-007 — upload/file ownership

**Requirement ID:** upload/file ownership · **บทบาท:** Student / Teacher  
**หน้า/เมนู/URL:** Student profile/project และ Teacher results  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | ใช้ไฟล์ปกติชนิดไม่รองรับ/เกินขนาด; บันทึก validation; เปิดไฟล์ของตน; บัญชี B ใช้ GET ID ทดสอบต่างเจ้าของที่ได้รับอนุญาต | profile ≤5MB JPG/PNG/WebP; Resume/book ≤10MB PDF; poster ≤10MB PDF/PNG/JPEG; supervision ≤5MB PNG/JPEG×2; unauthorized file denied; ไม่ใช้ malicious content |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ students.profile_image; student_files; supervision_images; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** students.profile_image; student_files; supervision_images; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-007-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

### MAN-SEC-008 — errors/rate limit/session

**Requirement ID:** errors/rate limit/session · **บทบาท:** ทุก role  
**หน้า/เมนู/URL:** หน้า login/refresh และ Network  
**Preconditions:** บัญชีและคู่ record/link ที่ผู้ดูแลอนุญาตเตรียมไว้; ห้ามโจมตีระบบจริง/เดา token/ปรับสิทธิ์หรือข้อมูลบุคคลอื่น  
**ข้อมูลทดสอบ:** TEST-A/TEST-B และ expired/used link ที่มีผู้ดูแล; ห้ามจด raw token

| ขั้นตอน | การกระทำด้วยตนเอง | Expected | ผลจริง | ผ่าน/ไม่ผ่าน |
|---|---|---|---|---|
| 1 | ตรวจ role/คู่ record ทดสอบและ session แยก | มีขอบเขตข้อมูลที่ได้รับอนุญาตชัดเจน |  | ☐ |
| 2 | Login ผิดหนึ่งครั้ง; DevTools offline เพื่ออ่าน; online retry; อ่าน safe error response; ตรวจ rate policy จาก source; ไม่ brute force/ไม่สร้าง 500 บนระบบจริง | ไม่ expose password/secret/SQL; 429 เป็นกรณีที่ผู้ดูแลเตรียมไว้เท่านั้น; Student limiter gap ยังมี; health diagnostics ต้องปิดข้อมูลก่อนบันทึก |  | ☐ |
| 3 | Refresh/Logout แล้วเปิด read-only view อีกครั้ง | สิทธิ์ไม่ค้าง; unauthorized data ไม่กลับมา; capability ที่ใช้แล้วไม่คืนสิทธิ์ |  | ☐ |
| 4 | อ่าน pgAdmin เฉพาะ metadata ของ test records และบันทึกภาพ redacted | ตรวจ ไม่อ่าน credentials; ไม่ใช้ SELECT sensitive fields; ไม่มี mutation และไม่ดูค่าลับ |  | ☐ |

**PostgreSQL:** ไม่อ่าน credentials; ไม่ใช้ SELECT sensitive fields; status/owner/time เท่านั้น  
**หลัง Refresh:** ตรวจไม่มีข้อมูล/สิทธิ์ค้างจาก session ที่ไม่ควรได้  
**Screenshot:** MAN-SEC-008-denied / -refresh พร้อม status code ที่ปิด body/URL ลับ  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Actual: ______ · ผู้ตรวจ/วันเวลา: ______  
**หมายเหตุ / Bug ID:** ______; ดู security source ใน X23–X34 และ gap report

## จุดที่ควรหยุด dependent steps

ถ้า login ไม่ได้ ให้หยุด feature downstream ของบัญชีนั้นและบันทึก blocker; ถ้า Mentor ยังไม่ verified ห้ามข้ามไป submit weekly/schedule; ถ้า appointment ยังไม่ confirmed ห้ามทำ completed result; ถ้า cooperation ยังไม่ generated หรือบริษัทไม่ accepted ห้ามทำ placement; ถ้า numeric grades/PDF/UI ไม่มี อย่าสร้าง planned step เหมือนปัจจุบันมีแล้ว

หลักฐาน source และทุก API ดู [Inventory](FITM_FULL_FEATURE_INVENTORY_2026-10-10.md) · ทดสอบข้าม role ต่อด้วย [Workflow/UXUI](FITM_MANUAL_WORKFLOW_UXUI_2026-10-10.md) · issue ให้ใส่ Bug ID ตาม [Gap report](FITM_GAP_AND_PRIORITY_REPORT_2026-10-10.md)

