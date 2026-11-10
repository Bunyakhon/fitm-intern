---
name: fitm-intern-workflow
description: Implement scoped FITM-INTERN changes and maintain project documentation under the repository's autonomous execution and user-owned testing agreement. Use for work in FITM-INTERN; not for unrelated repositories or global Codex configuration.
---

# FITM-INTERN Workflow

ข้อตกลงมีผล 8 พฤศจิกายน 2026 (Asia/Bangkok). ใช้ร่วมกับ [AGENTS.md](../../../AGENTS.md); คำสั่งผู้ใช้สำหรับงานปัจจุบันมาก่อนกฎทั่วไป. Skill นี้ไม่อนุญาตให้เปลี่ยนระบบนอกขอบเขตงาน.

## Project Context

- Frontend: Vite / HTML / CSS / JavaScript ที่ `http://localhost:5173`; Backend: Node.js / Express / Sequelize ที่ `http://localhost:5000`; PostgreSQL 16 / `intern_system`. พัฒนาบน Windows, VS Code และ Docker Desktop.
- Authentication ใช้ Email/Password และ Google OAuth ตาม Login/Identity contract ใน AGENTS.md; ห้ามเปลี่ยน flags, linking หรือ role detection เอง.
- งานปัจจุบัน: Student Submit → `advisor_review` → Class Advisor Approve → `department_head_review` → Department Head Approve → `approved`. Class Advisor อิง `students.advisor_teacher_id`.
- รักษา Catalog IT/INE, Academic Eligibility, Original Submission Snapshot, Latest Academic State, append-only Change History, Revision Control, live RBAC และ Draft/Session contracts. Approval ไม่ใช่ Academic Certification; เกณฑ์และผู้รับรองที่ยังไม่ตกลงต้องคง Pending Decision.
- อ่านส่วนปัจจุบันของ [Handoff](../../../HANDOFF_fitm-intern.md) และ [README](../../../README.md) ก่อน อ่าน Source/callers ที่เกี่ยวข้องเป็นหลักฐานพฤติกรรมจริง; ไม่ถือผลทดสอบในประวัติเป็นผลปัจจุบัน.

## Autonomous Execution / No Questions

ทำงานที่ได้รับอนุญาตจนเสร็จโดยไม่ถาม clarification, multiple choice หรือ confirmation สำหรับงานปกติ. เมื่อข้อมูลไม่ครบ ให้อ่าน Source/เอกสาร ใช้ข้อตกลงเดิมและวิธีที่รักษาพฤติกรรมระบบ. ไม่เดานโยบายมหาวิทยาลัย; บันทึกนโยบายที่ยังไม่ชัดเป็น `Pending Decision` และทำส่วนอิสระต่อ.

ห้ามข้าม Permission/Security Approval. เมื่อสิทธิ์หรือเครื่องมือไม่พอ ข้ามเฉพาะขั้นตอนนั้นและบันทึก Blocker ไม่ขออนุมัติซ้ำหรือข้ามระบบสิทธิ์. ทำงานที่เหลือได้ต่อโดยไม่เปลี่ยนขอบเขต.

## User-Owned Testing / No Automated Tests

ผู้ใช้เป็นผู้ทดสอบระบบและ Manual Acceptance เองทั้งหมด. Codex ห้ามรัน Unit/Integration/E2E/API/Database tests, Browser Automation, Playwright/Puppeteer, build, lint/typecheck, syntax checks/automated validation หรือ health checks เว้นแต่ผู้ใช้อนุญาตอย่างชัดเจนในงานครั้งนั้น. คำสั่งทดสอบเก่าและการอนุญาตครั้งก่อนไม่ใช่สิทธิ์รันใหม่.

อ่าน [Manual Acceptance Checklist](../../../docs/testing/COOP_REQUEST_MANUAL_TEST_CHECKLIST.md) และผลผู้ใช้เพื่อแก้ไขได้. Checklist มี 59 กรณี: Student 23 (S01-IT และ S01-INE แยกกัน), Teacher 7, Head 7, Staff 14, UI/Session 8. สถานะ `PENDING USER RESULTS`; ไม่สร้างผล PASS/FAIL/BLOCKED เอง ไม่รับรอง Manual Acceptance แทนผู้ใช้. เมื่อไม่ได้รับอนุญาต ให้บันทึก `Tests: NOT RUN — USER-OWNED TESTING` และระบุรายการที่ผู้ใช้ควรทดสอบภายหลัง.

Workflow: ผู้ใช้ส่ง Bug Reports/Acceptance Results → ChatGPT เตรียมคำสั่งพัฒนาโดยละเอียด → Codex ทำตามขอบเขตที่อนุมัติ → ผู้ใช้ทดสอบซ้ำ.

## Scoped Implementation / Data Preservation

- อ่าน `git status --short` และ Diff ของไฟล์ที่เกี่ยวข้องก่อนเริ่ม บันทึก baseline และรักษางานเดิม. แก้ Requirement/Bug ที่ได้รับจริง ไม่ Audit ทั้งระบบ, refactor, เพิ่ม Feature หรือแก้เมนู/Workflow อื่นเอง.
- รักษา UI/branding, API Contract, Database Schema, RBAC และ Authentication/Identity policy เว้นแต่จำเป็นตามคำสั่งที่อนุญาต. ใช้ Sequelize Models/integrity definitions เป็น Schema Source of Truth; ไม่เรียก migration/reset/init จากประวัติ.
- ห้าม `git reset`, `git clean`, `git stash`, ลบ Modified/Untracked Files หรือเขียนทับงานเดิม. ห้ามทำลาย PostgreSQL data, Truncate/Recreate Database, ลบ Docker Volumes หรือเปลี่ยน Environment Secrets.
- ห้าม Commit/Push อัตโนมัติ; ห้ามใส่ Credentials, Passwords, Hashes, JWT, Tokens หรือ Secrets ใน Chat/Handoff/README/Skill. ไม่สร้างบัญชีหรือเพิ่มสิทธิ์เพื่อให้ทดสอบผ่าน.

## Documentation Updates / Pending Decisions / Token Efficiency

หลังพัฒนา/แก้ไข/ลบฟังก์ชัน อัปเดต Handoff หลักไฟล์เดียวเป็น UTF-8: วันที่ Asia/Bangkok, งานที่ได้รับ, Implementation ที่เสร็จจริง, ไฟล์เพิ่ม/แก้/ลบ, Workflow/ข้อห้ามที่ต้องรักษา, ผลกระทบ/ข้อจำกัด, Tests, Pending Decisions, Remaining Issues และ NEXT TASK. เก็บประวัติสำคัญ แยกผลเก่าจากผลผู้ใช้ และไม่บันทึกซ้ำเมื่องานไม่เปลี่ยนจริง.

README อัปเดตเฉพาะข้อมูลใช้งาน/สถาปัตยกรรมที่เปลี่ยนจริง. อัปเดต Skill เมื่อข้อตกลงเปลี่ยน ไม่ต้องแก้ทุกครั้ง. อ่านเฉพาะไฟล์เกี่ยวข้อง ไม่ตรวจซ้ำเมื่อหลักฐานพอ ไม่สร้าง Audit Reports/Tests/Evidence เพิ่มหรือเริ่มโมดูลถัดไปเอง. อ่าน Diff/เนื้อหาและ Git status เพื่อทบทวนขอบเขตได้ โดยไม่รัน automated validation.

## Final Reporting Format

สรุปภาษาไทยสั้น ไม่ถามปิดท้าย:

1. `UPDATED FILES` — เพิ่ม/แก้/ลบและผลงานจริง พร้อม Git ก่อน/หลัง แยกจาก baseline.
2. `RULES APPLIED` — ข้อตกลงที่ใช้และผลกระทบ.
3. `NOT MODIFIED` — ส่วนสำคัญนอกขอบเขตที่คงไว้.
4. `TESTS` — `NOT RUN — USER-OWNED TESTING` เมื่อไม่ได้รับอนุญาต; งานที่สั่งห้ามทดสอบให้รายงาน `NOT RUN — AS INSTRUCTED`. ผลจากผู้ใช้/ประวัติต้องระบุที่มา.
5. `PENDING DECISIONS / BLOCKERS` — นโยบายค้าง ปัญหา ข้อจำกัด และสิ่งที่ยังไม่ได้ทดสอบ.
6. `NEXT TASK` — Await user-reported results from the 59-case Manual Acceptance Checklist and fix confirmed issues only. เปลี่ยนตามคำสั่งงานถัดไปเมื่อผู้ใช้มอบหมาย; ไม่เริ่มเอง.
