# FITM-INTERN — Repository Rules

ใช้กฎนี้กับงานทุกส่วนใน Repository. คำสั่งผู้ใช้สำหรับงานปัจจุบันมาก่อนข้อตกลงทั่วไปในไฟล์นี้; การอนุญาตเดิมใน Session ใช้ต่อได้ภายในขอบเขตเดิม ไม่ขออนุญาตซ้ำโดยไม่จำเป็น. หากงานใหม่ขัดกับข้อตกลงเดิมและยังไม่มีคำสั่งเปลี่ยนนโยบายชัดเจน ให้แจ้งความขัดแย้งก่อนดำเนินการส่วนที่ขึ้นกับนโยบายนั้น.

## Working Agreement — Effective 8 November 2026

- ใช้ [Project Skill](.agents/skills/fitm-intern-workflow/SKILL.md) สำหรับงาน FITM-INTERN ใน Repository นี้. ข้อตกลงนี้แทนคำสั่งเดิมให้ Codex รัน Focused Verification, tests, build, syntax/static checks หรือ health checks เอง รวมคำสั่งในประวัติ README/Handoff; ไม่เปลี่ยนพฤติกรรมระบบหรือขยายนโยบายสิทธิ์.
- **User-Owned Testing:** ผู้ใช้ทดสอบระบบและ Manual Acceptance เองทั้งหมด. Codex ห้ามรัน Unit/Integration/E2E/API/Database tests, Browser Automation, Playwright/Puppeteer, build, lint/typecheck, syntax checks/automated validation หรือ health checks เว้นแต่ผู้ใช้อนุญาตอย่างชัดเจนในงานครั้งนั้น. การอนุญาตทดสอบครั้งก่อนใช้แทนไม่ได้.
- **No Questions:** ทำงานอัตโนมัติภายในขอบเขต ไม่ถาม clarification, multiple choice หรือ confirmation สำหรับงานปกติที่อนุญาตแล้ว. อ่าน Source/Documentation และข้อตกลงเดิมก่อน เลือกวิธีรักษาพฤติกรรมเดิม; นโยบายที่ยังไม่ชัดให้บันทึก `Pending Decision` และทำส่วนอิสระต่อ ไม่เดานโยบายมหาวิทยาลัย.
- **Implementation First:** แก้ Requirement/Bug ที่ได้รับจริง ไม่ Full Audit, refactor, เพิ่ม Feature หรือแก้เมนู/Workflow นอกขอบเขต. รักษา API Contract, Schema และ RBAC เว้นแต่คำสั่งงานจำเป็นต้องเปลี่ยน. ระบุสิ่งที่ผู้ใช้ควรทดสอบภายหลังโดยไม่รันเอง.
- Workflow: ผู้ใช้ส่ง Bug/Acceptance Results → ChatGPT เตรียมคำสั่งพัฒนาโดยละเอียด → Codex ทำตามขอบเขตที่อนุมัติ → ผู้ใช้ทดสอบซ้ำ. ห้ามสร้างผลทดสอบ PASS/FAIL/BLOCKED เอง; บันทึก `Tests: NOT RUN — USER-OWNED TESTING` เมื่อไม่ได้รับอนุญาต.
- ไม่ข้าม Permission/Security Approval ของเครื่องมือ. หากสิทธิ์/เครื่องมือไม่พอ ให้ข้ามเฉพาะขั้นตอนนั้น บันทึกข้อจำกัด/Blocker และทำส่วนที่เหลือต่อ ไม่พยายามข้ามระบบหรือขออนุมัติซ้ำ.
- อ่านเฉพาะไฟล์ที่เกี่ยวข้อง ไม่ตรวจซ้ำเมื่อมีหลักฐานเพียงพอ ไม่สร้าง Audit Report เพิ่มโดยไม่จำเป็น และสรุปงานสั้นเป็นภาษาไทย.

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
- Branding Contract ใหม่ มีผล 14 พฤศจิกายน 2026 (Asia/Bangkok): Frontend ทุกหน้าที่มี Branding ใช้ Primary Brand `CWIE-IT CoopConnect` ตัวหนาสีกรมท่า และ Secondary Description `ระบบจัดการสหกิจศึกษา` ขนาดเล็กกว่าสีรองใน Header สองบรรทัด พร้อมโลโก้เดิม `/images/logo_kiwi.png`; คลิกโลโก้/ชื่อแบรนด์กลับ `/index.html` และ Browser Title ใช้ `ชื่อหน้า | CWIE-IT CoopConnect`. ข้อตกลงนี้แทนที่เฉพาะ Branding Contract เดิม ไม่เปลี่ยน Login/Testing/Security/Working Agreement. **Google อยู่เหนือฟอร์ม Email/Password** ตามคำตอบผู้ใช้วันที่ 14 ตุลาคม 2026 ซึ่งแทนที่ตำแหน่งใต้ฟอร์มจากรอบก่อน. ห้ามย้ายหรือออกแบบใหม่โดยไม่มีคำสั่ง.
- ต้องมีปุ่ม Google ใน UI เสมอ. อ่าน `/api/auth/google/config`; disabled ให้แสดง `ยังไม่เปิดใช้งาน` และกดแล้วแจ้ง Shared Toast โดยไม่โหลด Provider หรือเรียก challenge/login. Enabled ใช้ GIS/ID token verification/nonce guards/secure subject mapping/Application JWT และ automatic role detection เดิม; ไม่สร้าง Authentication ซ้ำ.
- ห้ามเปิด Google Login/Account Linking flags เอง, ห้าม Auto-Link จาก Email เพียงอย่างเดียว และห้ามเปลี่ยน domain/hosted-domain/identity/linking policy. Subject ที่มีหลาย Actor โดยไม่มี safe context ต้องปฏิเสธตาม guard เดิมและบันทึกเป็นข้อจำกัดเมื่อมีหลักฐาน ไม่สร้างผลทดสอบเอง.

## Database

- PostgreSQL 16 และ Sequelize Models เป็น Schema Source of Truth; ใช้ Model-driven initialization ใน `backend/src/db/initialize.js`, associations และ integrity definitions ปัจจุบัน (`models/schemaIntegrity.js`, `db/postgresIntegrity.js`).
- ไม่มี Migration-based workflow ปัจจุบัน. คำสั่ง migrations/ledger/Umzug ในประวัติคืออดีต ห้ามรันตามเอกสารเก่า. ไม่ใช้ db:init/reset/verify-empty เพื่อทดลองงาน UI หรือ Auth โดยไม่จำเป็น.
- ห้าม Reset Database โดยไม่มีอนุญาตสำหรับงานนั้น, ห้ามลบ Docker Volumes โดยพลการ และห้าม Force Sync/alter/sync อัตโนมัติใน Backend startup.
- ห้ามแก้ Models, Constraints, Schema หรือข้อมูลบัญชีนอกขอบเขต. การเปลี่ยน Database ที่ได้รับมอบหมายต้องตรวจ target และการรักษาข้อมูลก่อนทำ; ไม่สร้างบัญชีหรือให้สิทธิ์เพื่อให้ทดสอบผ่านเอง.

## Git และข้อมูลส่วนตัว

- ห้าม Commit/Push อัตโนมัติ และห้าม `git reset`, `git clean`, `git stash`, ลบ Modified/Untracked Files หรือทับ Uncommitted Changes. ห้าม Truncate/Recreate Database หรือทำลายข้อมูล PostgreSQL. ห้ามแก้ Environment Secrets; ไม่พิมพ์ credentials, password, hash, JWT, tokens หรือข้อมูลส่วนบุคคลลง Chat/เอกสาร/Skill.
- ตรวจ Git Diff หลังทำงานและรายงานไฟล์ที่เพิ่ม แก้ไข หรือลบ โดยแยกงานรอบนี้จาก Baseline เดิม. ไม่สร้าง Audit Reports เพิ่มโดยไม่มีงานที่ต้องใช้.

## Testing Responsibility — User-Owned Testing

- อ่าน Test Checklist และผลที่ผู้ใช้ส่งมาเพื่อประกอบการแก้ไขได้; ไม่ถือเป็นอนุญาตให้รันทดสอบ. ใช้ [Manual Acceptance Checklist](docs/testing/COOP_REQUEST_MANUAL_TEST_CHECKLIST.md) 59 กรณี; สถานะ `PENDING USER RESULTS` จนมีผลยืนยันจากผู้ใช้.
- ถ้างานนั้นอนุญาตทดสอบชัดเจน อ่าน scripts ปัจจุบันก่อนและทำเฉพาะขอบเขตที่อนุญาต ไม่เรียก runner จากประวัติโดยเดาว่ายังมีอยู่. ไม่เปิด flags/สร้างบัญชี/เพิ่มสิทธิ์เพื่อให้ทดสอบผ่าน.
- งาน Login UI ให้ระบุรายการสำหรับผู้ใช้ตรวจ: Google disabled ไม่เรียก Provider, Unified endpoint, ไม่มี Role Selector, Responsive 1280/390/320 px และ Session/RBAC เดิม; Codex ไม่รัน Browser/build/health เอง.
- ผลเก่าคงวันที่และชนิดหลักฐาน static/mock/synthetic/browser/real accounts/provider E2E; ไม่ยกเป็นผลใหม่หรือ Manual Acceptance. ผลจากผู้ใช้ต้องอ้างที่มา ไม่สร้างผล PASS/FAIL/BLOCKED เอง.

## Handoff บังคับก่อนจบงาน

**ทุกครั้งที่พัฒนา แก้ไข หรือลบฟังก์ชันเสร็จ ต้องตรวจและอัปเดต `HANDOFF_fitm-intern.md` ให้ตรงกับสถานะล่าสุดก่อนจบงาน.** บันทึก UTF-8 และระบุ:

1. วันที่อัปเดต โดยอ้างอิง Asia/Bangkok
2. งานที่ได้รับมอบหมาย
3. ฟังก์ชันที่ทำเสร็จจริง
4. ไฟล์ที่เพิ่ม แก้ไข หรือลบ
5. Workflow ที่ต้องรักษา
6. ข้อกำหนดที่ห้ามเปลี่ยน
7. `Tests: NOT RUN — USER-OWNED TESTING` เมื่อไม่ได้รับอนุญาต; ผลผู้ใช้/ประวัติต้องแยกที่มาและวันที่
8. ปัญหาที่ยังเหลือ
9. `Pending Decisions`, `Remaining Issues` และ `NEXT TASK` โดยไม่เริ่มงานต่อเอง
10. ข้อจำกัดและสิ่งที่ยังไม่ได้ทดสอบ

ใช้ Handoff ไฟล์หลักเดียวนี้ ไม่สร้างไฟล์ซ้ำ ไม่ลบประวัติสำคัญ ไม่บันทึกซ้ำเมื่องานไม่มีการเปลี่ยนแปลงจริง. อัปเดตส่วนปัจจุบันอย่างกระชับและระบุเมื่อข้อตกลงใหม่แทนที่ของเดิม. ประวัติเป็น Project Continuity Record ไม่ใช่หลักฐานว่า Source ปัจจุบันทดสอบผ่านโดยอัตโนมัติ. ก่อนจบ ตรวจ Diff/UTF-8/สถานะนอกขอบเขต และสรุปภาษาไทย: ผลงาน ไฟล์เปลี่ยน ผลตรวจ Git ก่อน/หลัง และข้อจำกัด.

อ่าน Diff/เนื้อหาและ Git status ได้ แต่ไม่ใช้ขั้นตอนนี้เป็นเหตุให้รัน automated validation. README อัปเดตเฉพาะการใช้งาน/สถาปัตยกรรมที่เปลี่ยนจริง; Project Skill อัปเดตเมื่อข้อตกลงเปลี่ยน ไม่จำเป็นต้องแก้ทุกครั้ง. สรุปท้ายงานเป็น `UPDATED FILES`, `RULES APPLIED`, `NOT MODIFIED`, `TESTS`, `PENDING DECISIONS / BLOCKERS`, `NEXT TASK` พร้อม baseline/สถานะ Git หลังงาน; ไม่ถามปิดท้าย.
