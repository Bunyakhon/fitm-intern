# FITM-INTERN — Repository Rules

ใช้กฎนี้กับงานทุกส่วนใน Repository. คำสั่งผู้ใช้สำหรับงานปัจจุบันมาก่อนข้อตกลงทั่วไปในไฟล์นี้; การอนุญาตเดิมใน Session ใช้ต่อได้ภายในขอบเขตเดิม ไม่ขออนุญาตซ้ำโดยไม่จำเป็น. หากงานใหม่ขัดกับข้อตกลงเดิมและยังไม่มีคำสั่งเปลี่ยนนโยบายชัดเจน ให้แจ้งความขัดแย้งก่อนดำเนินการส่วนที่ขึ้นกับนโยบายนั้น.

## ก่อนเริ่มงาน

1. อ่าน `AGENTS.md`, ส่วนสถานะล่าสุดของ `HANDOFF_fitm-intern.md` และ `README.md`; อ่านประวัติที่เกี่ยวข้องเมื่อจำเป็น.
2. ตรวจ `git status --short` และ Diff ของส่วนที่จะเปลี่ยน บันทึก Baseline ของ Uncommitted Changes และรักษางานเดิม.
3. อ่าน Source เฉพาะส่วนที่เกี่ยวข้อง ตรวจว่ามีฟังก์ชันเดิมอะไรแล้ว รวม Workflow, UI, callers, Dependencies และผลกระทบก่อนเลือกวิธีแก้.
4. ใช้ Source ปัจจุบันเป็นหลักฐานของพฤติกรรมจริง; Handoff ให้บริบท ข้อตกลง ประวัติ และข้อจำกัด. หากขัดกันให้ระบุส่วนต่างและวันที่ ไม่เดาว่าฟังก์ชันไม่มีอยู่ ไม่ยกผล PASS เก่ามาเป็นผลตรวจใหม่.
5. ทำเฉพาะงานที่ได้รับมอบหมายต่อจนเสร็จในขอบเขตที่อนุญาต ไม่เริ่มโมดูลหรืองานถัดไปเอง.

## Source Code และ UI/UX

- แก้เฉพาะสิ่งที่ผู้ใช้สั่งและการเชื่อมต่อที่จำเป็น. ห้ามเปลี่ยน Header, Logo, Branding, Colors, Typography, Background, Layout, Spacing, Buttons หรือเมนูโดยไม่มีคำสั่งที่เกี่ยวข้อง.
- ก่อนกู้ UI ให้เทียบ Source, Diff และ `git show <revision>:<path>`; ใช้ Git History เพื่ออ่าน/เปรียบเทียบ ไม่ใช้ checkout/restore ทับไฟล์ที่มีงานค้าง และไม่ออกแบบใหม่แทนหลักฐานที่หาไม่พบ.
- ห้ามลบหรือซ่อนฟังก์ชันเดิมที่ยังใช้งาน; ตรวจ callers, imports, routes และ build entries ก่อนลบไฟล์. รักษา Responsive Design และ Shared UI Feedback; ห้าม native `alert`/`confirm`.
- รักษา Draft Preservation, Session Management, JWT expiry, Remember Me, cross-tab revocation, Logout และ live Backend RBAC. Browser ตรวจ token shape ได้ แต่ไม่แทนการตรวจ signature/สิทธิ์ของ Backend.
- ห้ามเปลี่ยน Authentication/Authorization/Identity Policies เอง. ห้ามแก้ Student Profile, Dashboard หรือโมดูลที่ไม่เกี่ยวข้อง; Mentor/Company workflows คงเดิมเมื่อไม่อยู่ในขอบเขต.

## Login Contract ที่ต้องรักษา

- หน้า Login หลักเพียงหน้าเดียวคือ `frontend/login.html` สำหรับ Student, Teacher, Department Head และ Department Staff. ไม่มี Role Selector, Dropdown, Tabs หรือปุ่มเลือกบทบาท. หน้า Login เก่าคง redirect compatibility.
- Email/Password ส่งไป `POST /api/auth/unified-login`. Backend ตรวจ credentials และสถานะจาก Student/Teacher/DepartmentStaff จริงแล้วคืน actor, role, Application JWT และ Dashboard ที่อนุญาต. ห้ามใช้ Email Domain, รูปแบบ Email หรือ Frontend flags เป็นหลักฐานให้บทบาท.
- Head ใช้ Teacher account และ `is_department_head` จาก Database พร้อม department ตาม guard เดิม. หากยืนยันหลายบัญชี/Actor และไม่มี safe default context ให้คง `409 AUTH_CONTEXT_AMBIGUOUS`; ไม่เลือกสุ่ม ไม่รวม/ยกระดับสิทธิ์ และไม่เพิ่ม Role Selector.
- คง Email/Password, Remember Me, JWT, RBAC, Logout, cross-tab protection และ Dashboard URLs เดิม: `/src/student_coop/student_coop.html`, `/src/teacher_coop/teacher_coop.html`, `/src/department_head/department_head.html`, `/src/department_staff/department_staff.html`.
- UI ใช้ Header `ระบบจัดการสหกิจศึกษา`, โลโก้ `/images/logo_kiwi.png` และ KIWI Branding/CSS เดิมตาม Git. **Google อยู่เหนือฟอร์ม Email/Password** ตามคำตอบผู้ใช้วันที่ 14 ตุลาคม 2026 ซึ่งแทนที่ตำแหน่งใต้ฟอร์มจากรอบก่อน. ห้ามย้ายหรือออกแบบใหม่โดยไม่มีคำสั่ง.
- ต้องมีปุ่ม Google ใน UI เสมอ. อ่าน `/api/auth/google/config`; disabled ให้แสดง `ยังไม่เปิดใช้งาน` และกดแล้วแจ้ง Shared Toast โดยไม่โหลด Provider หรือเรียก challenge/login. Enabled ใช้ GIS/ID token verification/nonce guards/secure subject mapping/Application JWT และ automatic role detection เดิม; ไม่สร้าง Authentication ซ้ำ.
- ห้ามเปิด Google Login/Account Linking flags เอง, ห้าม Auto-Link จาก Email เพียงอย่างเดียว และห้ามเปลี่ยน domain/hosted-domain/identity/linking policy. Subject ที่มีหลาย Actor โดยไม่มี safe context ต้องปฏิเสธและรายงาน BLOCKED สำหรับกรณีนั้น.

## Database

- PostgreSQL 16 และ Sequelize Models เป็น Schema Source of Truth; ใช้ Model-driven initialization ใน `backend/src/db/initialize.js`, associations และ integrity definitions ปัจจุบัน (`models/schemaIntegrity.js`, `db/postgresIntegrity.js`).
- ไม่มี Migration-based workflow ปัจจุบัน. คำสั่ง migrations/ledger/Umzug ในประวัติคืออดีต ห้ามรันตามเอกสารเก่า. ไม่ใช้ db:init/reset/verify-empty เพื่อทดลองงาน UI หรือ Auth โดยไม่จำเป็น.
- ห้าม Reset Database โดยไม่มีอนุญาตสำหรับงานนั้น, ห้ามลบ Docker Volumes โดยพลการ และห้าม Force Sync/alter/sync อัตโนมัติใน Backend startup.
- ห้ามแก้ Models, Constraints, Schema หรือข้อมูลบัญชีนอกขอบเขต. การเปลี่ยน Database ที่ได้รับมอบหมายต้องตรวจ target และการรักษาข้อมูลก่อนทำ; ไม่สร้างบัญชีหรือให้สิทธิ์เพื่อให้ทดสอบผ่านเอง.

## Git และข้อมูลส่วนตัว

- ห้าม Commit/Push อัตโนมัติ, Git Reset/Clean ที่ทำให้ข้อมูลสูญหาย และห้ามลบ/ทับ Uncommitted Changes. คง `.env` และ secrets เดิมเมื่อไม่มีคำสั่งแก้; ไม่พิมพ์ password, hash, JWT หรือข้อมูลส่วนบุคคลลง Chat/เอกสาร.
- ตรวจ Git Diff หลังทำงานและรายงานไฟล์ที่เพิ่ม แก้ไข หรือลบ โดยแยกงานรอบนี้จาก Baseline เดิม. ไม่สร้าง Audit Reports เพิ่มโดยไม่มีงานที่ต้องใช้.

## Focused Verification

- ตรวจเฉพาะฟังก์ชันที่ได้รับผลกระทบด้วย Focused Verification หรือ Smoke Tests. ไม่ทำ Full Repository Audit/Full Regression ทุกครั้ง และไม่สร้าง Test Files หรือ Evidence จำนวนมากโดยไม่จำเป็น.
- อ่าน scripts ปัจจุบันก่อนรัน; automated suites/runners เดิมถูกลบแล้ว อย่าสั่ง `npm test` หรือ runner จากประวัติโดยไม่ตรวจว่ามีจริง. เมื่อไม่มี tests ให้ใช้ syntax/static checks, build และ inline checks ที่เหมาะสม พร้อมระบุขอบเขตและข้อจำกัด.
- งาน Login UI ตรวจ Google disabled ไม่เรียก Provider, การเชื่อม Unified endpoint, ไม่มี Role Selector และ Responsive 1280/390/320 px. Build จาก `frontend` ด้วย `npm.cmd run build` บน Windows หรือ `npm run build` เมื่อ shell รองรับ. อ่าน Backend health จาก `/` และ `/health/db` เมื่อบริการรันอยู่; ไม่จำเป็นต้อง restart/reset เพื่อสร้างผล PASS.
- ใช้ PASS/FAIL/PARTIAL/BLOCKED/NOT TESTED ตามหลักฐาน. แยก static/mock/synthetic/browser/real accounts/provider E2E ให้ชัด; ไม่เปิด feature flags เพื่อให้ทดสอบผ่านและไม่อ้าง Provider E2E เมื่อยังไม่ได้ทดสอบจริง.

## Handoff บังคับก่อนจบงาน

**ทุกครั้งที่พัฒนา แก้ไข หรือลบฟังก์ชันเสร็จ ต้องตรวจและอัปเดต `HANDOFF_fitm-intern.md` ให้ตรงกับสถานะล่าสุดก่อนจบงาน.** บันทึก UTF-8 และระบุ:

1. วันที่อัปเดต โดยอ้างอิง Asia/Bangkok
2. งานที่ได้รับมอบหมาย
3. ฟังก์ชันที่ทำเสร็จจริง
4. ไฟล์ที่เพิ่ม แก้ไข หรือลบ
5. Workflow ที่ต้องรักษา
6. ข้อกำหนดที่ห้ามเปลี่ยน
7. ผลทดสอบพร้อมชนิด/ขอบเขตหลักฐาน
8. ปัญหาที่ยังเหลือ
9. งานที่ต้องทำต่อ โดยไม่เริ่มทำเอง
10. ข้อจำกัดและสิ่งที่ยังไม่ได้ทดสอบ

ใช้ Handoff ไฟล์หลักเดียวนี้ ไม่สร้างไฟล์ซ้ำ ไม่ลบประวัติสำคัญ ไม่บันทึกซ้ำเมื่องานไม่มีการเปลี่ยนแปลงจริง. อัปเดตส่วนปัจจุบันอย่างกระชับและระบุเมื่อข้อตกลงใหม่แทนที่ของเดิม. ประวัติเป็น Project Continuity Record ไม่ใช่หลักฐานว่า Source ปัจจุบันทดสอบผ่านโดยอัตโนมัติ. ก่อนจบ ตรวจ Diff/UTF-8/สถานะนอกขอบเขต และสรุปภาษาไทย: ผลงาน ไฟล์เปลี่ยน ผลตรวจ Git ก่อน/หลัง และข้อจำกัด.
