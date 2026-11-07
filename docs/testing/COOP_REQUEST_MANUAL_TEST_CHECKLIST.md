# Checklist ทดสอบคำร้องสหกิจศึกษาด้วย Chrome

เตรียมวันที่ **7 พฤศจิกายน 2026 (Asia/Bangkok)** สำหรับผู้ใช้ตรวจรับวันที่ **8 พฤศจิกายน 2026**. ช่อง Actual Result/ผล/หมายเหตุยังเว้นว่างทั้งหมด: ผล Automated ของผู้พัฒนาไม่ใช่ผล Manual Acceptance ของผู้ใช้.

## เริ่มทดสอบ

1. เปิด Docker Desktop และบริการ Development เดิม. จาก repository root ใช้ `docker compose ps`; ถ้าบริการหยุดใช้ `docker compose up -d` โดยไม่ reset/init ฐานข้อมูลหรือถอด volumes.
2. เปิด Chrome ที่ `http://localhost:5173/login.html` ทุกบทบาทใช้หน้าเดียว ไม่มีตัวเลือก Role. ใช้ **localhost เหมือนกันทุกหน้า** เพื่อไม่แยก Browser storage กับ 127.0.0.1.
3. เปิด Credential viewer เดิมจาก repository root ด้วยคำสั่งด้านล่าง เลือกบัญชีเฉพาะในหน้าต่าง Local. ไม่ใส่รหัสผ่าน/Token ลง Checklist, Screenshot, Console หรือ Git. ตัวระบุ Advisor/Head ที่ตรงกับ Student IT อยู่ใน [บัญชีสำหรับทดสอบแบบ private](../../.local-db-backups/manual-prep/20261107/manual-accounts-private.md) ซึ่ง Git ignore และไม่มีรหัสผ่าน.
4. ใช้ Chrome Profile แยก Student/Teacher/Head/Staff หรือ Logout แล้ว Login ตามลำดับ. การเปิด Teacher และ Head คนละแท็บใน Profile เดียวอาจเพิกถอน session เดิมตาม cross-tab protection; ไม่ใช่ปัญหา Queue.
5. ทดสอบ Happy Path: **Student IT → Class Advisor ของคนนั้น → Head ใน department ของ Advisor → Student รีเฟรช → Staff Catalog → Student ตรวจ Catalog ใหม่**. ทำ INE แยกผ่าน Google Login ของเจ้าของบัญชีเดิม.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/src/seeders/prepareDevelopmentAccounts.ps1 -ShowCredentials
```

คำสั่งนี้เปิด viewer แบบ masked ใช้ DPAPI ของ Windows user เดิม ไม่เปลี่ยน OS execution policy และไม่ export Credential. หาก viewer ใช้งานไม่ได้ให้บันทึก BLOCKED; ไม่ reset รหัสผ่านหรือสร้างบัญชีแทน.

| บทบาท/บริการ | URL จริง |
| --- | --- |
| Login กลาง | http://localhost:5173/login.html |
| Student | http://localhost:5173/src/student_coop/student_coop.html |
| Teacher | http://localhost:5173/src/teacher_coop/teacher_coop.html |
| Department Head | http://localhost:5173/src/department_head/department_head.html |
| Department Staff | http://localhost:5173/src/department_staff/department_staff.html |
| Backend health | http://localhost:5000/ |
| Database health | http://localhost:5000/health/db |

## บัญชีและข้อมูลเริ่มต้น

| ตัวเลือก | ใช้ทดสอบ | ข้อจำกัด/การเตรียม |
| --- | --- | --- |
| `s9900000000001@email.kmutnb.ac.th` | IT Happy Path → approved | co_op; มี saved Advisor และ Credential ใน viewer; หลัง approved ยังเป็น active request จึงยื่นใหม่ไม่ได้ |
| `s9900000000003@email.kmutnb.ac.th` | IT Teacher/Head Reject และยื่นใหม่ | co_op; ใช้ reason ที่ระบุว่าเป็นการทดสอบ |
| `s9900000000005@email.kmutnb.ac.th` | IT Cancel/Draft/Catalog changes | co_op; ใช้แยกจากคำร้อง Happy Path |
| บัญชี Google INE co_op เดิมของผู้ใช้ | INE ทุกขั้นตอน | **USER MANUAL TEST PENDING**. ตรวจพบ saved major INE, active Advisor/department พร้อม, Google mapping1/actor1. ต้องให้เจ้าของทำ Provider Login เอง; ไม่มีการเปลี่ยน Password/Track/Linking |
| บัญชี `9900000000002` และ `9900000000004` | Negative Login ตามนโยบายเดิมเท่านั้น | เป็น internship จึงไม่ใช่บัญชี INE co_op สำหรับ Happy Path; ไม่เปลี่ยน track เพื่อผ่านการทดสอบ |
| Class Advisor / Head | ใช้บัญชีตาม private lookup และ saved Advisor ของ Student | Teacher account active; Head ใช้ `is_department_head` และ department จริง ไม่เดาจาก Email |
| `fitm.staff1@example.test` | Catalog IT และ INE | active Staff; ได้รับ `coop_prerequisite_catalog.manage` ทั้ง IT/INE ตามคำสั่งผู้ใช้แล้ว |
| `fitm.staff2@example.test` | Catalog IT และ INE / Revision Conflict | active Staff; ได้รับสิทธิ์ทั้งสองสาขาเช่นกัน |

ฐาน Development เริ่มต้นมี **56 ตาราง, IT5/INE5 active courses, Programs2, active Grants4**. ก่อนผู้ใช้ทดสอบ Requests/Snapshots/Reviews/Academic State/Academic History เป็น0. การทดสอบของผู้ใช้จะสร้างข้อมูลจริงใน Development; **อย่า Reset DB หรือลบ Snapshot/History**. ใช้ Cancel/Reject ตาม Workflow และใช้บัญชีทดสอบอีกคนเมื่อคำร้องเดิม approved.

เตรียมบริษัทสมมติ `บริษัททดสอบสหกิจ MANUAL-20261108-IT` / `MANUAL-20261108-INE`, จังหวัดจาก Dropdown, ที่อยู่สมมติ, ผู้รับหนังสือสมมติ, วันเริ่ม `2026-12-01`, วันสิ้นสุด `2027-03-31`, วิธีส่ง Email. ใช้บริษัทสมมติ/กรอกเองเพื่อไม่แก้ Company/Mentor จริง. เลือกอย่างน้อย1วิชา **studying + ไม่มีเกรด** เพื่อทดสอบอัปเดตภายหลัง; passed ใช้ B+ หรือเกรดอื่นที่รองรับ. Course Status มี passed/studying/failed/unselected และ Grade Dropdown A/B+/B/C+/C/D+/D/F.

ทุกกรณีให้บันทึก Request ID, บัญชี alias/สาขา, เวลา Asia/Bangkok และ Screenshot ที่ไม่มี Credential/ข้อมูลส่วนบุคคลเกินจำเป็น. คอลัมน์ผลกรอกเฉพาะ **PASS / FAIL / BLOCKED**; คงว่างเมื่อยังไม่ได้ทำ.
สำหรับ S02–S22 และกรณี Teacher/Head ที่ทำทั้งสองสาขา ให้แยกผล IT/INE ใน Actual Result หรือสำเนาแถวต่อท้าย Test ID ด้วย `-IT`/`-INE`.

## A. Student — ทำซ้ำทั้ง IT และ INE

| Test ID | ขั้นตอน | Expected Result | Actual Result | PASS / FAIL / BLOCKED | หมายเหตุ / Screenshot |
| --- | --- | --- | --- | --- | --- |
| S01-IT | Login ด้วย IT Student1 ผ่าน Email/Password | เข้า Student Dashboard; Profile เป็น IT/co_op | | | |
| S01-INE | ที่ Login กลาง กด Google และเลือกบัญชี INE เดิม | เข้า Student Dashboard เป็น INE/co_op; ไม่เกิดการสมัคร/Link ใหม่. ถ้าบัญชีไม่ตรงหรือ Provider ไม่ผ่านให้ BLOCKED | | | |
| S02 | เปิด Profile ตรวจ saved major, Class Advisor และข้อมูลส่วนตัว; หากเลือก Advisor ใหม่ให้ Save ก่อน | ค่าที่บันทึกและโหลดใหม่ตรงกัน; ไม่ใช่ project/coop advisor | | | |
| S03 | เปิดเมนูคำร้อง รอรายการโหลด แล้วเปิดฟอร์ม | Empty/Loading ถูกต้อง; ข้อมูล Student และ Advisor readonly มาจากข้อมูลที่ Save แล้ว | | | |
| S04 | ตรวจ Catalog ของสาขา | เริ่มต้น5วิชาตรง IT/INE; ไม่เห็นวิชาข้ามสาขา; จำนวนตาม Active Catalog ปัจจุบัน | | | |
| S05 | เลือก passed+B+, studying ไม่เลือกเกรด, failed+F, unselected | Grade ถูกล้าง/disable เมื่อ studying/unselected; Dropdown ครบ8เกรด; ไม่มีเกรดสมมติ | | | |
| S06 | ทดลอง passed+F, failed+เกรดอื่น, วันสิ้นสุดก่อนเริ่ม หรือไม่เลือกวิธีส่ง | ปฏิเสธพร้อมข้อความเหมาะสม; ไม่มีคำร้อง/ประวัติใหม่ และ Draft ยังอยู่ | | | |
| S07 | ในบัญชีทดสอบที่ไม่มี active request ล้าง Advisor แล้ว Save; ทดลองเปิด/Submit จากนั้นคืน Advisor และ Save | เตือนให้เลือกและบันทึก Advisor; ไม่สร้างคำร้อง. คืนค่าเดิมก่อนทำกรณีถัดไป | | | |
| S08 | เปลี่ยน Advisor ใน Profile แต่ยังไม่ Save แล้วเปิดคำร้อง | แจ้งให้ Save ก่อน; ไม่ใช้ค่าที่ยังไม่บันทึกแทน Server | | | |
| S09 | กรอกบริษัท/สถานะวิชา กดไปส่วน Advisor ใน Profile แล้วกลับมาเปิดฟอร์ม | Draft บริษัท/รายวิชายังอยู่ในหน้าเดิม; ชื่อ Advisor อ่านจาก DB ใหม่. ไม่รับรอง Draft หลัง F5/ปิดหน้า | | | |
| S10 | กรอกข้อมูลครบ มี studying อย่างน้อย1วิชา กด Submit และลองกดซ้ำเร็ว ๆ | มีคำร้องเดียว status advisor_review; ปุ่มแสดง Loading แล้วคืนสถานะ; Snapshot มี studying/gradeNULL | | | |
| S11 | รีเฟรชคำร้องและเปิดรายละเอียด | บริษัท/วัน/วิธีส่ง/รายวิชาตรงข้อมูลที่ยื่น; Original Snapshot อ่านได้; ประวัติมี Submit/เวลา | | | |
| S12 | ขณะ advisor_review อัปเดต studying เดิมหนึ่งวิชาเป็น passed+B+ | Latest Result เปลี่ยน; Original Snapshot คง studying/ไม่มีเกรด; History เก็บ old/new/เวลา และ approval status ไม่เปลี่ยน | | | |
| S13 | ลองอัปเดตวิชาเดิมซ้ำ หรือเปลี่ยน unselected เป็นผลภายหลัง | ไม่เปิดสิทธิ์แก้ซ้ำ/เส้นทางที่นโยบายยังไม่อนุมัติ; ไม่สร้าง History ผิด | | | |
| S14 | หลัง Teacher Approve กดรีเฟรช/เปิดรายละเอียด | status department_head_review; เห็นชื่อผู้พิจารณา วันที่จริง ความเห็น และ Review History | | | |
| S15 | หลัง Head Approve กดรีเฟรช | status approved; เห็นชื่อ Head/วันที่จริง; ไม่แสดงว่าได้รับรองคุณสมบัติอัตโนมัติ | | | |
| S16 | ใน approved ที่ยังไม่มีเอกสาร/เริ่มงาน อัปเดต studying เดิมที่ยังไม่เคยรายงานเป็น failed+F | บันทึก Latest/History ได้ครั้งเดียว; Original ไม่เปลี่ยน; approved คงเดิม; คุณสมบัติยัง pending ไม่ auto-certify | | | |
| S17 | ใช้ Student3 หลัง Teacher/Head Reject รีเฟรชและเปิดรายละเอียด | rejected พร้อมเหตุผล ผู้พิจารณา/เวลา; ยื่นใหม่ได้หลัง terminal ตาม guard เดิม | | | |
| S18 | ใช้ Student5 ยกเลิกคำร้องที่ยัง advisor_review/department_head_review ผ่าน Shared Confirm | cancelled + cancellation history; ไม่ลบ Snapshot; ถ้ายกเลิก dialog ต้องไม่เปลี่ยนข้อมูล | | | |
| S19 | หลังโหลดรายการสำเร็จ ใช้ DevTools block เฉพาะ `*/api/coop-requests/me` แล้วรีเฟรช; จากนั้นปลด block และ Retry | แสดง Error และข้อมูลล่าสุดเดิม ไม่แสดง Empty เท็จ/เปิดให้ยื่นใหม่; Retry สำเร็จกลับข้อมูลล่าสุด | | | |
| S20 | ถ้าเปิดจากตำแหน่งงาน ให้เปลี่ยนเป็นบริษัทอื่น/กรอกเอง | Job context เดิมถูกล้าง; ข้อมูลที่ส่ง/บันทึกตรงบริษัทที่เลือก ไม่ถูกเติมบริษัทเก่ากลับ | | | |
| S21 | พิมพ์ค้นหาบริษัทเร็ว ๆ สองคำขณะ Network ช้า | ผลลัพธ์คำเก่าไม่ทับคำล่าสุด; ปิดฟอร์ม/เลือกบริษัทแล้วไม่มีผลเก่ากลับมา | | | |
| S22 | เปิดรายละเอียดคำร้องของบัญชีตนเอง จากนั้น Logout | Session/Dashboard ถูกเพิกถอนตามเดิม; ไม่ส่ง Draft ไปบัญชีใหม่ | | | |

## B. Teacher / Class Advisor

| Test ID | ขั้นตอน | Expected Result | Actual Result | PASS / FAIL / BLOCKED | หมายเหตุ / Screenshot |
| --- | --- | --- | --- | --- | --- |
| T01 | Login ด้วย Class Advisor ของ Student ที่ยื่น; เปิดเมนูคำร้องสหกิจ | เห็น Queue advisor_review ของ Student ที่รับผิดชอบ | | | |
| T02 | เปิดรายละเอียดคำร้อง IT และ INE ตาม assignment ที่บันทึก | ข้อมูลบริษัท/Original Snapshot/Latest Academic/History ถูกต้อง; studying มีคำเตือนแยกจาก approval | | | |
| T03 | Login ด้วย Teacher คนอื่นที่ไม่ใช่ Class Advisor หรือ project-only | ไม่เห็นคำร้องใน Queue และ API พิจารณาไม่ได้; ไม่เกิด Review ใหม่ | | | |
| T04 | Approve ผ่าน Shared Confirm | status department_head_review; Review เก็บ Teacher/เวลา; ปุ่มป้องกันส่งซ้ำ; Queue รีเฟรชตรง Server | | | |
| T05 | ใช้คำร้อง Student3 เลือก Reject โดยเว้นเหตุผล แล้วลองกรอกเหตุผลสมมติ | เว้นเหตุผลไม่ผ่าน; เมื่อกรอกแล้ว rejected พร้อมเหตุผล/ผู้พิจารณา/วันที่จริง | | | |
| T06 | เลือก filter สถานะที่เพิ่งพิจารณาและเปิดรายละเอียดอีกครั้ง | ประวัติ Submit/Approve/Reject และชื่อ/วันที่อ่านได้; ไม่มี action พิจารณาซ้ำผิดสถานะ | | | |
| T07 | กด Refresh เมื่อไม่มีคำร้อง/จำลอง GET ล้มเหลว | Empty/Loading/Error แยกกัน พร้อมทาง Retry; ไม่อ้างบันทึกสำเร็จเมื่อ API ปฏิเสธ | | | |

## C. Department Head

| Test ID | ขั้นตอน | Expected Result | Actual Result | PASS / FAIL / BLOCKED | หมายเหตุ / Screenshot |
| --- | --- | --- | --- | --- | --- |
| H01 | Login กลางด้วย Head account | เข้า Head Dashboard จาก is_department_head/department จริง | | | |
| H02 | เปิดคำร้องที่ Teacher Approve แล้ว | Queue department_head_review ใน department scope; เห็นชื่อ Teacher ที่อนุมัติ/วันที่จริง | | | |
| H03 | ตรวจรายละเอียด IT/INE และ Academic | Original/Latest/History อ่านได้; ยังไม่รับรองวิชาการอัตโนมัติแม้เกรดครบ | | | |
| H04 | Approve คำร้อง Happy Path | approved พร้อม Head/เวลาใน Review; Student รีเฟรชเห็นตรงกัน | | | |
| H05 | ใช้คำร้อง Student3 ที่ยื่นใหม่และ Teacher Approve แล้ว ทดลอง Reject เว้นเหตุผล/กรอกเหตุผล | เว้นเหตุผลไม่ผ่าน; กรอกแล้ว rejected และเหตุผลแสดงทุกหน้าที่เกี่ยวข้อง | | | |
| H06 | ทดลองพิจารณาคำร้องผิด stage/ที่ตัดสินแล้วจากหน้าค้าง | API ปฏิเสธ409หรือ403ตามสิทธิ์; ไม่เกิด Review ซ้ำ | | | |
| H07 | บันทึกข้อสังเกต A08 เรื่องย้าย Advisor/department กลาง Workflow โดยไม่เปลี่ยน assignment จริงถ้าไม่จำเป็น | **PENDING POLICY DECISION:** สิทธิ์ Teacher และ Head อิง Advisor ปัจจุบัน; ไม่ freeze ผู้มีอำนาจตอนยื่น/ตอน Teacher Approve | | | |

## D. Department Staff — ทำด้วยทั้งสองบัญชี

ผู้ใช้อนุมัติให้ทั้งสองบัญชีจัดการ **IT + INE** ใน Development แล้ว: exact permission `coop_prerequisite_catalog.manage`, active account + active Grant. ไม่ต้องมอบ Grant เพิ่มเพื่อเริ่มทดสอบ.

| Test ID | ขั้นตอน | Expected Result | Actual Result | PASS / FAIL / BLOCKED | หมายเหตุ / Screenshot |
| --- | --- | --- | --- | --- | --- |
| F01 | Login ด้วย staff1 และ staff2 แยก Chrome Profile/Logout ตามลำดับ | เข้า Staff Dashboard และเห็นส่วน “รายวิชาก่อนออกสหกิจศึกษา” | | | |
| F02 | ตรวจตัวเลือกสาขา/โหลด IT และ INE ของทั้งสองบัญชี | เลือกได้ทั้ง IT/INE; เริ่มต้น5วิชาต่อสาขา; Loading/Ready/Refresh ทำงาน | | | |
| F03 | เพิ่มวิชาทดสอบ IT รหัส `999000081` ชื่อ `MANUAL-20261108-IT` ลำดับ8 active | บันทึกสำเร็จ/Toast; Refresh แล้วยังอยู่; Student IT ฟอร์มใหม่เห็นเพิ่ม1วิชา ไม่เพิ่มให้ INE | | | |
| F04 | เพิ่มวิชาทดสอบ INE รหัส `999000082` ชื่อ `MANUAL-20261108-INE` | Student Google INE ฟอร์มใหม่เห็นวิชาเพิ่มตามสาขา; IT ไม่ถูกเพิ่มตาม | | | |
| F05 | แก้ชื่อไทย/อังกฤษและลำดับวิชาทดสอบ แล้ว Refresh | ค่าและลำดับใหม่อยู่จริง; Student ฟอร์มใหม่เห็นค่าใหม่ | | | |
| F06 | ปิดใช้งานวิชาทดสอบผ่าน Shared Confirm | คำร้องใหม่ไม่แสดงวิชาปิด; รายการ Staff ยังมีสถานะปิด; คำร้องเก่าคง Snapshot เดิม | | | |
| F07 | เปิดใช้งานกลับ แล้วรีเฟรช Student | วิชากลับมาสำหรับคำร้องใหม่; จำนวนวิชารองรับจริงโดยไม่บังคับ5ตายตัว | | | |
| F08 | เพิ่มหรือแก้ให้รหัสซ้ำในสาขาเดียว | API409/Inline Error/Toast; ไม่สร้างรายการซ้ำ; Draft ยังอยู่ | | | |
| F09 | กรอกรหัสไม่ครบ9หลัก/ชื่อว่าง/ลำดับติดลบ | Validation ปฏิเสธ; ไม่เปลี่ยน Catalog | | | |
| F10 | สอง Staff โหลด revision เดียวกัน; คนแรกแก้/save แล้วคนที่สอง save ข้อมูลเก่า | คนที่สองได้ Revision Conflict409; Draft ยังอยู่; กดโหลดรายการ/สิทธิ์ใหม่ก่อนตรวจและส่งอีกครั้ง | | | |
| F11 | ใช้ Student/Teacher/anonymous เรียก Catalog management API โดยไม่แก้ Token | ถูกปฏิเสธ401/403; ไม่มี Catalog mutation | | | |
| F12 | หลัง Catalog เปลี่ยน ให้ Student ที่เปิดฟอร์ม revisionเก่า Submit | Server409 Catalog Changed; โหลดรายการใหม่พร้อมเก็บค่าที่จับคู่ Course Code ได้; ต้องตรวจรายการก่อนส่งใหม่ | | | |
| F13 | เปรียบเทียบ Original Snapshot ของคำร้องที่ยื่นก่อนแก้/ปิด Catalog | Course code/name/grade/status เดิมไม่เปลี่ยน; Academic History ยังอ่านได้ | | | |
| F14 | เมื่อจบ ปิดเฉพาะสองวิชา `999000081/82` ที่เพิ่มเพื่อทดสอบ | คงประวัติ/รายการทดสอบไว้แบบ inactive; ไม่ลบ/แก้10seed coursesหรือ restore revision ย้อนด้วย SQL | | | |

## Desktop / Mobile / Keyboard / Session

ใช้ Chrome DevTools Device Toolbar. บริการ bind loopback; `localhost` บนโทรศัพท์จริงหมายถึงโทรศัพท์เอง จึงยังไม่ใช่การทดสอบอุปกรณ์จริงผ่าน LAN.

| Test ID | ขั้นตอน | Expected Result | Actual Result | PASS / FAIL / BLOCKED | หมายเหตุ / Screenshot |
| --- | --- | --- | --- | --- | --- |
| UI01 | Desktop1280px เปิดฟอร์ม/รายละเอียด Student และ Queue/Detail Teacher/Head/Staff | อ่านและกดได้ครบ ไม่มี page overflow; ตารางกว้างเลื่อนในพื้นที่ตารางได้ | | | |
| UI02 | Tablet768px ทำรายการเดิม | เมนู/ฟอร์ม/รายวิชา/ปุ่มไม่ทับกัน; สถานะ Error/Success อ่านได้ | | | |
| UI03 | Mobile390px และ320px ทำรายการเดิม | ไม่มี page overflow; ปุ่มและ Dropdown เข้าถึงได้; เมนูแนวนอนเลื่อนได้ตามเดิม | | | |
| UI04 | ใน Student Create/Detail ใช้ Tab/Shift+Tab/Escape | Focus อยู่ใน Dialog; backgroundไม่รับ focus; Escape/ปิดคืน focus; ไม่ปิดระหว่าง mutation | | | |
| UI05 | ใช้ Shared Confirm ของ Approve/Reject/Toggle และยกเลิก dialog | Focus/Loading ถูกต้อง; Cancel ไม่ส่ง mutation; ไม่มี native alert/confirm | | | |
| UI06 | ใช้ Network throttling/GET request blocking เฉพาะคำร้องหรือ Catalog | Loading/Error/Retry ชัดเจน; ไม่แสดง Empty แทน Error; Draft ไม่หายจาก Submit failure | | | |
| UI07 | Logout และเปิดหน้าป้องกันอีกครั้ง; ลอง Login Teacher/Head สลับใน Profile เดียว | ต้องใช้ session ที่ถูกต้อง; cross-tab revocationทำงาน ไม่คงสิทธิ์เก่า | | | |
| UI08 | Remember Me เปิด/ปิด แล้วปิด/เปิด Chrome ตามโหมด | เป็นไปตาม Session contract เดิม; Token หมดอายุ/ถูกเพิกถอนต้อง Login ใหม่ | | | |

## กติกาวิชาการและประเด็นที่ต้องหารือ

- Update ผลเรียนได้เฉพาะ Original studying/null ที่ยังไม่เคยรายงาน และ requestอยู่ advisor_review/department_head_review/approved โดยยังไม่มี document_issued_at/started_at. passed+Fไม่ผ่าน; failedต้องF; ไม่แก้ grade/status ของ Original Snapshot.
- pending_grades/pending_verification แยกจาก approved. เกณฑ์มหาวิทยาลัย/ผู้รับรอง/retake/แก้เกรดซ้ำ/unselected→ผลภายหลัง ยัง **PENDING POLICY DECISION**. อย่าใช้ Manual PASS ของ Approval แทนการรับรองคุณสมบัติ.
- A08: เปลี่ยน Advisor หลัง Teacher Approve แล้ว Head scopeยังย้ายตาม Advisor ปัจจุบัน. ตรวจแล้วด้วย isolated fixtures; ยังไม่เปลี่ยนนโยบาย assignment/identity. บันทึกข้อเสนอในการตรวจรับ.
- เอกสาร/เริ่มงาน document_issued/in_progress เป็น workflow downstreamนอก Checklist นี้; approved ไม่ได้แปลว่าออกเอกสารแล้ว. Legacy submitted/staff_review ไม่ใช่คำร้องที่สร้างใหม่ในรอบนี้.
- หาก Network ขาดระหว่าง Commit/รับ Response ให้กดรีเฟรชตรวจ Server ก่อนส่งซ้ำ. แก้ response-read-before-commit แล้ว แต่ไม่รับรองการสูญเสีย acknowledgement ระดับเครือข่ายทุกกรณี.

## เครื่องมือ Grant สำหรับผู้ดูแล Development

Grant4รายการติดตั้งแล้วตามคำสั่งวันที่7พ.ย. ไม่ต้องรันซ้ำเพื่อทดสอบ. ถ้าต้องตรวจซ้ำ ใช้ UUID จาก private lookup และ Preview ซึ่งไม่เขียนข้อมูล. Apply ต้องใช้เฉพาะ Mapping ที่ได้รับมอบหมาย; คำสั่งไม่สร้างบัญชี/ไม่แก้ Schema/ไม่ถอนสิทธิ์อื่นอัตโนมัติ.

```powershell
# Preview; แทน UUID ด้วย Staff1 หรือ Staff2 จาก private lookup
docker exec intern_backend node src/seeders/grantCoopCatalog.js --staff-id=STAFF_UUID_FROM_PRIVATE_LOOKUP --programs=IT,INE
# Apply Mapping เดิมที่ผู้ใช้อนุมัติแล้ว; rerun ไม่สร้างซ้ำ
docker exec intern_backend node src/seeders/grantCoopCatalog.js --staff-id=STAFF_UUID_FROM_PRIVATE_LOOKUP --programs=IT,INE --apply --confirm=intern_system
```

## จบการทดสอบ / ส่งผลตรวจรับ

ตรวจสถานะ Student/Teacher/Head ตรงกันหลัง Refresh, Original Snapshotไม่เปลี่ยน, Latest Academic/Historyถูกต้อง, Staff scopesยังIT+INEและวิชาทดสอบปิดแล้ว. บันทึก Request IDsและกรณีที่FAIL/BLOCKEDพร้อมScreenshotที่ไม่มีSecret. ไม่ลบคำร้อง/ประวัติหรือ Reset DB. **NEXT TASK: USER MANUAL ACCEPTANCE**; Google INE Loginคง **USER MANUAL TEST PENDING** จนเจ้าของทดสอบ Provider จริง.
