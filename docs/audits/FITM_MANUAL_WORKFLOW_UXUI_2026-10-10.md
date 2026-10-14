# FITM — Workflow ต่อเนื่องและ Manual UX/UI

วันที่รายงาน: **10 ตุลาคม 2026 (Asia/Bangkok)** · branch `main` · HEAD `0ab9765`

งานนี้เป็น **READ-ONLY SOURCE AUDIT + MANUAL TEST PLANNING** อ่าน working tree, source, test definitions และหลักฐานเก่าเท่านั้น ไม่รัน automated tests, browser automation, app startup, migration, seed, API mutations หรือ Docker/DB commands และไม่แก้ source/config/ข้อมูลจริง สร้างเฉพาะรายงาน Markdown ใหม่ห้าไฟล์ใน `docs/audits/` Git status ก่อนเริ่มไม่มี uncommitted changes

**OFFICIAL SCOPE NOT VERIFIED**: ค้นไฟล์ PDF ใน workspace แล้วไม่พบ ทก.01 ต้นฉบับ จึงยังยืนยันเลขข้อ ถ้อยคำ จำนวนข้อ และความครบถ้วนทางการไม่ได้ เลข 2.3.* ในรายงานนี้เป็น provisional IDs จาก baseline เดิม/README เท่านั้น 56 แถวคือ baseline audit ไม่ใช่จำนวน requirement ทางการ

**ผลทดสอบมือทั้งหมด: NOT TESTED / ช่องผลยังว่าง** ไม่เปิด browser, PostgreSQL หรือ Docker ในงานนี้ เป็นข้อจำกัดของขอบเขตที่ผู้ใช้กำหนด ไม่ใช่หลักฐานว่า environment เสียหรือเข้าถึงไม่ได้ ผล PASS ที่อ้างต่อไปนี้เป็นหลักฐานเก่าที่อ่านเท่านั้น

## วิธีดำเนินการ

ใช้ browser ด้วยมือและบัญชีทดสอบที่ได้รับอนุญาตแยก role/profile ไม่รัน source/test scripts การเปลี่ยนใน checklist เป็นแผนอนาคตเฉพาะ test data ที่ได้รับอนุญาต ระหว่างเปลี่ยน role ให้ Refresh readback ทุกครั้งและตรวจ record เดิม ไม่ควรตัดสินจาก toast อย่างเดียว ช่องผลทั้งหมดว่าง ให้ผู้ใช้กรอกเอง

## Workflow A — Student Application

**ผู้เริ่ม/ผู้ต่อ:** Student → Class Advisor → Head → Student  
**Test Cases:** MAN-STU-005 / MAN-TEA-016 / MAN-HEAD-006 / MAN-SEC-003/004  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Student | /src/student_coop/student_coop.html → คำร้อง | สร้างคำร้อง; กรอก prerequisite/บริษัท/ช่วงวัน/วิธีส่ง; ส่ง | ไม่มี active duplicate; นักศึกษา/track/Class advisor ครบ | advisor_review; company/prerequisite/delivery snapshot และ student submit review | Class A เห็นในคิว; Student refresh รายละเอียด | manual create form ยังไม่ได้ตรวจรับเต็ม |  |
| 2 | Class Advisor A | /src/teacher_coop/teacher_coop.html#coopApprovals | ดูรายละเอียด → อนุมัติ หรือปฏิเสธพร้อมเหตุผล | advisor_teacher_id เป็น A; request advisor_review | approve→department_head_review; reject→rejected; audit เพิ่มครั้งเดียว | Head เห็น approved-by-Class queue; Student reason/readback หลัง refresh | Project Advisor B ไม่มีสิทธิ์ Class decision |  |
| 3 | Head ภาคเดียว | /src/department_head/department_head.html#coopApprovals | ดูรายละเอียด → อนุมัติ หรือปฏิเสธพร้อมเหตุผล | live active Head flag + department ตรง Class advisor; state ถูกต้อง | approve→approved; reject→rejected; review actor/from/to/reason | Student และ Staff อ่านสถานะใหม่; refresh ทุกหน้า | HTML issuance ไม่ได้เปลี่ยนสถานะเป็น document_issued โดยอัตโนมัติที่รับรองใน audit |  |
| 4 | Student | คำร้อง → รายละเอียด | เปิดใหม่ / Refresh; เปรียบเทียบเหตุผลและขั้นตอน | ผู้ขอเป็นเจ้าของ | current request/history ตรงการตัดสิน | Student readback; pgAdmin test request/reviews อ่านเท่านั้น | การเปิดหนังสือทางการของ Student ยังไม่พบ endpoint |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow B — Staff Cancellation

**ผู้เริ่ม/ผู้ต่อ:** Staff → Cancel → Student  
**Test Cases:** MAN-STA-002 / MAN-SEC-001/002  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Staff | Staff dashboard #documents → ตรวจสอบคำร้อง | ค้น/กรอง; ดูคำร้อง/ยกเลิก | submitted/staff_review/advisor_review/department_head_review เท่านั้น | cancellation.allowed และ expected status/time ล่าสุด | Staff detail อ่าน current history | approved/document_issued/in_progress/rejected/cancelled ยกเลิกไม่ได้ |  |
| 2 | Staff | รายละเอียด → ยกเลิกคำร้อง | ลอง reason ว่าง; กดยกเลิก modal; จากนั้นใส่เหตุผลและยืนยัน | active Staff; ข้อมูลไม่ stale | cancelled + cancelled_at; audit cancel/reason เพียงครั้งเดียว | Refresh Staff และ pgAdmin current/history | stale409 ต้องโหลดใหม่; ไม่มี approve/reject/forward Staff |  |
| 3 | Student เจ้าของ | คำร้อง → รายละเอียด | Refresh อ่านสถานะ/เหตุผล | คำร้องของตน | เห็น cancelled และเหตุผล Staff ตาม review | Student history/readback ตรง DB | นักศึกษาอื่นไม่มีสิทธิ์อ่าน |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow C — Mentor / Daily Log

**ผู้เริ่ม/ผู้ต่อ:** Student → Mentor verification → Student weekly → Mentor review → Student  
**Test Cases:** MAN-STU-010/011 / MAN-MEN-001/002 / MAN-EXT-010/011  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Student | ข้อมูลพี่เลี้ยง panel-mentor | เพิ่มพี่เลี้ยง; บันทึก; ส่งยืนยันใหม่ตาม UI | inbox ทดสอบ; ไม่มีข้อมูลพี่เลี้ยงหรือแก้ชุดของตน | pending; token hash ใน mentor_tokens; email outcome ตามจริง | Mentor เปิด inbox test link | SMTP จริงยังไม่มีหลักฐาน; resend ใช้ PUT /api/mentors/me |  |
| 2 | Mentor | mentor_verify_user.html โหมด query token | แก้ข้อมูลได้ → บันทึก → ยืนยันข้อมูล | token valid ไม่ used/expired; purpose verification | mentors.status=verified / verified_at; token consumed | Student refresh Mentor state | การ refresh token consumed ไม่เปิดสิทธิ์ซ้ำ |  |
| 3 | Student | บันทึกรายวัน panel-daily | บันทึก working 4 ฟิลด์หลัก+notes หรือ non_working reason; ครบวันแล้วส่งทั้งสัปดาห์ | หนึ่งช่วง approved; สัปดาห์ที่ผ่านมา/last applicable date; Mentor verified | daily persisted; weekly submitted frozen snapshot; email_sent ตามจริง | Mentor เปิด fragment review_token ที่แยกจาก verification | ยังไม่มี numeric rubric/compiled logbook export |  |
| 4 | Mentor | โหมด review_token → เปิดสัปดาห์ | ขอแก้ไขพร้อม feedback หรือ reviewed | capability binding mentor/student/verified_at; version ล่าสุด | revision_requested หรือ reviewed + history actor/time/feedback | Student refresh daily feedback | ไม่มี daily approval แยกรายวัน / numeric weekly score |  |
| 5 | Student / Mentor | daily → แก้ / ส่งใหม่ → Mentor ตรวจ | แก้เฉพาะ revision_requested; ส่งใหม่; Mentor reviewed | old snapshots คงอยู่ | revision_requested→submitted→reviewed; daily freeze | Refresh ทั้งสอง; pgAdmin daily/week/events read-only | ลิงก์เก่า revoked; ห้ามลบ Mentor ที่มี weekly history |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow D — Documents / private file

**ผู้เริ่ม/ผู้ต่อ:** Student Upload → Storage → owner preview; Staff letters แยก  
**Test Cases:** MAN-STU-003/013/014 / MAN-EXT-006/013/025 / MAN-SEC-007  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Student | profile → Resume / รูป; report-upload → เล่ม/โปสเตอร์ | เลือกไฟล์ตามชนิด/size; กดบันทึก/อัปโหลด | Student/co_op ตาม endpoint; ไม่มีไฟล์อันตราย | private filesystem + students.profile_image หรือ student_files type ของไฟล์ | Student refresh metadata/รูป/preview | Resume extraction failed ไม่เท่ากับ upload failed |  |
| 2 | Student เจ้าของ | report-upload → ดูไฟล์ | preview ผ่าน authenticated blob request | current file ID ของตน | inline MIME/filename; ไม่ส่ง private storage path | Refresh/เปิดใหม่; ทดลอง B อ่าน ID test file แบบได้รับอนุญาต | Teacher/Mentor อ่านเล่มเพื่อ final grading ยังไม่มี consumer; Planned Behavior |  |
| 3 | Teacher/Student | นัดนิเทศ → results/photos | Teacher save/complete; Student อ่าน completed | appointment confirmed; owner/project scope; PNG/JPEG2 ภาพ | supervision_images private; completed immutable | Student อ่านภาพ; บัญชีอื่น denied | ไม่ใช่ upload artifact ขั้นสอบ; ไม่รวม official PDF |  |
| 4 | Staff | #documents → cooperation / company response / placement | draft→generate→preview/download/print HTML; correction history | approved + complete snapshot; placement ต้อง cooperation generated + accepted response | coop_documents/revisions และ company_responses/history | Refresh Staff; Student อ่าน response | HTML development; Student letter/PDF download, delete/reissue ยังขาด |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow E — Job Matching

**ผู้เริ่ม/ผู้ต่อ:** Company posting → Verify → Staff publish → Student selection → Resume → Matching  
**Test Cases:** MAN-COM-001/003 / MAN-EXT-017 / MAN-STU-003/004/016  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Company | recruit_student.html | กรอกทุกตำแหน่ง/ข้อมูลติดต่อ/สถานที่/โหมด/วัน/จำนวน/ค่าตอบแทน; CAPTCHA; submit | feature gate/provider/inbox test พร้อม | pending_email_verification; company/submission/jobs/modes/tokens ตาม transaction | Company รับ email; view submission outcome | SMTP/Turnstile สด NOT TESTED |  |
| 2 | Company | recruit_verify_email.html | เปิดลิงก์/verify; ลิงก์เดิม reuse denied | purpose/submission/hash/expiry ถูกต้อง | email_verified และ jobs→pending_review | Staff backend queue จะมีรายการ | email verification ไม่เผยแพร่ทันทีและไม่ใช่แก้บริษัท |  |
| 3 | Staff | ไม่มี production job review menu | **หยุด browser workflow ณ จุดนี้**: API publish/reject มี แต่ UI ไม่พบ | ต้องให้ผู้ดูแลเตรียม published test posting ไว้โดยการอนุญาตแยก | planned UI จะเปลี่ยน pending_review→published/rejected; source API ทำได้ | ไม่อ้าง browser PASS / ไม่ยิง write API ใน audit | Missing UI integration gate |  |
| 4 | Student | คำร้อง → company picker / job-matching | ค้นบริษัทจริง; เลือก; บันทึกทักษะหรือ Resume ready; ค้น matching | published job test พร้อมและ NLP service พร้อม | ผลสูงสุด 5; score/rank/IDs valid; fallback/error ตาม source | Refresh student profile/Resume metadata; rerun matching (ผลไม่ต้องเก็บ DB เพราะคำนวณใหม่) | หน้าแรกยัง mock/public search link ขาด; expired published filtering ไม่พบ |  |
| 5 | Student/NLP | profile → Resume upload | PDF native text ก่อน OCR tha+eng fallback | ไฟล์สแกนไม่เกิน 5 หน้า OCR และ text cap20k | student_files extraction_status=ready/failed และ method pdf_text/ocr | matching จาก ready Resume เท่านั้น | ไม่ควรใช้ test stub pass แทน live NLP acceptance |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow F — Supervision

**ผู้เริ่ม/ผู้ต่อ:** Teacher Schedule → Mentor/ผู้แทน Confirm → Teacher Result → Student  
**Test Cases:** MAN-TEA-004/005/006/007/009 / MAN-MEN-003/004 / MAN-EXT-012  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Teacher Project Advisor | #supervisionScheduling → เลือกนักศึกษา | ตรวจพี่เลี้ยง verified; สร้าง visit1/visit2; เลือก substitute พร้อมเหตุผลเมื่อจำเป็น | confirmed project relation; approved request; future date/time Bangkok | appointment pending_confirmation version/snapshot; tokens/events; SMTP outcome | Mentor/ผู้แทน inbox link | Class advisor อย่างเดียวไม่ grant project supervision |  |
| 2 | Mentor / Substitute | mentor fragment appointment_token | อ่าน snapshot; checkbox identity; ยืนยัน | token valid current version; expires ≤เวลานัดหรือ 7 วัน | confirmed; token consumed; event identity | Teacher/Student refresh appointment | ยืนยันข้อมูลไม่ใช่รับรอง attendance |  |
| 3 | Teacher | นัดเดิม → แก้ไข/เลื่อนนัด; ส่งลิงก์ใหม่ | ใส่เหตุผล; save; inbox ผู้รับใหม่ยืนยัน | appointment ยังอนาคต/version current และไม่มี result | version เพิ่ม; pending_confirmation ใหม่; old capability invalid; history preserved | Teacher/Student อ่านนัดล่าสุด | มี result แล้ว edit blocked; personal info ผิดต้องแก้/reverify |  |
| 4 | Teacher | ผล visit1/visit2 | วันที่นิเทศจริง/summary/issues/recommendations + PNG/JPEG2 ภาพ → save draft → complete | appointment confirmed; วันที่จริงไม่อนาคต; size≤5MB ต่อภาพ | draft→completed immutable พร้อม revision/image ownership | Student เห็นเฉพาะ completed และสองภาพ; Refresh และ read-onlyDB | PDF/คะแนน rubric/แก้ผล completed หลังปิด ยังไม่มี |  |
| 5 | Teacher / Academic | planned numeric assessment / PDF | **หยุด**: ไม่พบฟอร์ม/engine/PDF ทางการ | ต้องมี template/rubric/authorization ในงานพัฒนาใหม่ | ไม่มีผลคะแนน/official PDF ที่ audit รับรอง | ระบุ gap report; ไม่สร้าง expected totals สมมติ | Dependency blockers |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Workflow G — Scoring

**ผู้เริ่ม/ผู้ต่อ:** Mentor assessment → Teacher/กรรมการ → Final score (Planned Behavior)  
**Test Cases:** MAN-MEN-006 / MAN-TEA-011/013/014 / MAN-ACA-001  
**ผล:** PASS ☐ · FAIL ☐ · NOT TESTED ☐ · Bug ID: ______ · วันที่/ผู้ตรวจ: ______

| ลำดับ | ผู้ดำเนินการ / ต่อให้ใคร | เมนูจริง | ปุ่ม/การกระทำ | Precondition | ข้อมูล/สถานะที่ควรเปลี่ยน | Readback/Refresh | จุดยังไม่พร้อม | ผลจริง |
|---|---|---|---|---|---|---|---|---|
| 1 | Mentor | ไม่มี final numeric assessment UI | สำรวจเกณฑ์/ฟอร์ม; **หยุด numeric submission** | rubric/maxima ยังไม่มีหลักฐานทางการ | source มี weekly textual feedback แต่ไม่มี academic score source | บันทึก Missing Feature/Dependency blocker | weekly20% + final30% เป็น README baseline ไม่ใช่ PDF verified |  |
| 2 | Teacher / กรรมการ | ไม่มี grading/committee UI/API/model | **Planned Behavior**: ต้องออกแบบประเมินเล่ม 10/โปสเตอร์ 5/ชิ้นงานเนื้อหา 25/สอบ 10 หลังยืนยันทางการ | คะแนนเต็ม/aggregation/ประธานและกรรมการสองคนต้องยืนยัน | ไม่มี score ที่ควรบันทึกปัจจุบัน | ไม่กรอก PASS หรือคำนวณเกรดจากคำบรรยาย | Dependency rubric/committee rules |  |
| 3 | ระบบรวมคะแนน | ไม่พบ score engine | **Planned Behavior**: รวมแหล่งคะแนนภายหลัง implementation | scores/missing components/maxima/weights policy พร้อม | สัดส่วน README รวม 100%; วิธี normalize/เฉลี่ยกรรมการยังไม่ยืนยัน | ต้องมี acceptance ของ missing/out-of-range/rounding ภายหลัง | ไม่เดาวิธีรวมกรรมการ |  |
| 4 | Student feedback บริษัท | panel-evaluate (ฟังก์ชันปัจจุบันอีกชนิด) | กรอก 3,4,5,6,7 แล้วบันทึก | คะแนนห้าข้อจำนวนเต็ม 1–10 | total25 average5; persisted feedback เท่านั้น | Student refresh; company_evaluations read-only | ใช้แทนคะแนนวิชาการไม่ได้ |  |

**Screenshot:** ก่อน action/หลังบันทึก/หน้าบทบาทถัดไปหลัง Refresh (ปิดข้อมูลส่วนบุคคลและ token)  
**PostgreSQL:** อ่าน current + audit history ของ test IDs ตาม Inventory เท่านั้น; ห้ามแก้สถานะด้วย SQL เพื่อให้ workflow ไปต่อ  
**Actual / Bug ID / สิ่งที่ต้องแก้:** ______

## Responsive matrix — ตรวจด้วยมือทุกหน้า

ตั้ง viewport ใน DevTools ด้วยมือที่ **1440 / 1366 / 768 / 390 px** บันทึก browser/version/height/zoom (เริ่ม 100%) และ orientation จริงในผล หากจอ mobile ต้อง scroll table ให้ตรวจว่าช่องข้อมูล/controls ยังอ่าน/แตะได้ ความกว้าง CSS ที่มีใน source ไม่ใช่หลักฐานว่าผ่าน visual acceptance

| Page / panel | Desktop1440 | Laptop1366 | Tablet768 | Mobile390 | Navigation | Form | Accessibility | Issue/Bug ID |
|---|---|---|---|---|---|---|---|---|
| /index.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /login.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /register.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /staff-login.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /teacher-login.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /department-head-login.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/student_coop/student_coop.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/department_staff/department_staff.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/teacher_coop/teacher_coop.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/department_head/department_head.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/recruit_student/recruit_student.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/recruit_student/recruit_verify_email.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| /src/mentor_coop/mentor_verify_user.html | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |

| Nested panel/flow | Desktop1440 | Laptop1366 | Tablet768 | Mobile390 | Navigation | Form | Accessibility | Issue/Bug ID |
|---|---|---|---|---|---|---|---|---|
| Student profile edit/image crop | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Student request create/detail/company picker | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Student daily editor/history/submit modal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Student project/files/preview/evaluation/transfer | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Staff cancellation/reason/doc preview/response modal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Staff/Student calendar month/list/detail/edit | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Teacher result/photo/history and Student read-only | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |
| Mentor original/review/appointment/substitute modes | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ______ |

## UX/UI detailed checklist — ใช้กับทุกหน้า/Panel

| Check | การกระทำด้วยมือ | Expected | 1440 | 1366 | 768 | 390 | ผลจริง/Bug ID |
|---|---|---|---|---|---|---|---|
| Sidebar | เปิดทุกเมนูทุกความกว้างด้วย click/keyboard | active state/aria-current ที่ใช้ถูก; ไม่มี panel ทับ; sidebar ไม่บัง controls | ☐ | ☐ | ☐ | ☐ | ______ |
| Header/Navbar | Login role/logout/Back; บีบจอ | ชื่อบทบาทและลิงก์ถูก; dropdown อ่านได้; secret ไม่อยู่ header | ☐ | ☐ | ☐ | ☐ | ______ |
| Cards | ภาพรวม/dashboard/job carousel | ค่าที่แสดงไม่ทำให้ mock ดูเหมือน API จริง; ข้อความไม่ถูกตัดสาระ | ☐ | ☐ | ☐ | ☐ | ______ |
| Tables | คำร้อง/prerequisite/daily/history | หัวข้อ/ข้อมูลตรง; scroll อ่านได้; buttons เข้าถึงใน 390px | ☐ | ☐ | ☐ | ☐ | ______ |
| Forms | profile/request/mentor/company/supervision/evaluation/calendar | label/input เชื่อม; required/type/maxlength ถูก; ไทยไม่เพี้ยน | ☐ | ☐ | ☐ | ☐ | ______ |
| Validation | ค่าว่าง/ผิดช่วง/ชนิดไฟล์ไม่รองรับแบบปลอดภัย | error ใกล้ฟิลด์อ่านเข้าใจ; focus ไปจุดแก้; draft ไม่หายเมื่อ reject | ☐ | ☐ | ☐ | ☐ | ______ |
| Search/Filters | ค้นชื่อ/รหัส/สถานะ/เดือน/category ตาม controls จริง | ผล/API/filter เปลี่ยนจริง; search หน้าแรกที่ console-only บันทึก gap | ☐ | ☐ | ☐ | ☐ | ______ |
| Pagination | คิว Staff/Teacher/Head/activities | ปุ่มก่อนหน้า/ถัดไป disable ถูก; ไม่ข้าม/ซ้ำเมื่อ filter เปลี่ยน | ☐ | ☐ | ☐ | ☐ | ______ |
| Buttons | กดบันทึกเร็วสองครั้งด้วยมือเมื่อทำ test record | loading/disabled กัน submit ซ้ำ; success เฉพาะ commit จริง | ☐ | ☐ | ☐ | ☐ | ______ |
| Modal | confirm/reason/profile/mentor/company picker/alert | Tab/Shift+Tab วนใน modal, Escape ปิด, clickoutside ตาม policy, คืน focus opener/fallback | ☐ | ☐ | ☐ | ☐ | ______ |
| Dropdown | อาจารย์/นักศึกษา/type/view/status | keyboard ลูกศรเลือกได้; แยก Class/Project; ค่าที่ loaded ตรง selection | ☐ | ☐ | ☐ | ☐ | ______ |
| Toast | save/reject/offline/SMTPfailed | message ตาม outcome, อ่านได้, success ไม่ทับ error; status accessible | ☐ | ☐ | ☐ | ☐ | ______ |
| Loading | อ่าน/บันทึก/NLP/fileupload | เห็นกำลังโหลด, ไม่มี controls stale, ไม่ re-enable ก่อน finally | ☐ | ☐ | ☐ | ☐ | ______ |
| Empty State | บัญชี test ไม่มี record/ผลไม่พบ | ข้อความอธิบายและทางเริ่มจริง; ไม่โชว์ record เดิม | ☐ | ☐ | ☐ | ☐ | ______ |
| Error State | DevTools offline อ่าน→online retry | แจ้งผิดพลาดและคืนข้อมูลล่าสุด; ไม่กรอก PASS จาก olddata | ☐ | ☐ | ☐ | ☐ | ______ |
| Typography/Thai | ชื่อหัวข้อ/ข้อความหลายบรรทัด/ชื่อไฟล์ไทยยาว | glyph/font ไม่เพี้ยน; อ่านได้ไม่ตัด codepoint; contrast ตรวจด้วยมือ | ☐ | ☐ | ☐ | ☐ | ______ |
| Horizontal Overflow | ทุก page/panel ทั้ง 4 ขนาด | ไม่มี bodyoverflow ที่บังข้อมูล; table scroll เฉพาะ container | ☐ | ☐ | ☐ | ☐ | ______ |
| Touch Targets | mobilebuttons/calendarcells/photo controls | ตรวจแตะได้จริงและขนาดเป้าหมายประมาณ 44px เมื่อเหมาะสม; ไม่อ้างมาตรฐานกฎหมาย | ☐ | ☐ | ☐ | ☐ | ______ |
| Keyboard Navigation | Tab ทั้งหน้า/Enter/Space/ESC | ลำดับตามสายตา; ไม่มี trap นอก modal; hiddenelement ไม่รับ focus | ☐ | ☐ | ☐ | ☐ | ______ |
| Focus Indicators | main.css focus-visible และ custommodals | มองเห็น focus; ไม่หายเมื่อ modal/opener ถูกลบ | ☐ | ☐ | ☐ | ☐ | ______ |
| Accessibility | label/heading/alt/role/status/live regions | screenreader ประกาศ action/error ตามหน้าที่; ไม่พึ่งสีอย่างเดียว | ☐ | ☐ | ☐ | ☐ | ______ |
| Responsive Layout | 1440/1366/768/390; portrait/landscape เมื่อมีอุปกรณ์ | grid/forms ปรับจริง; preview และ photos พอดี; ไม่ถือว่ามี@media แล้วผ่าน | ☐ | ☐ | ☐ | ☐ | ______ |
| Refresh / navigation / unsaved edits | แก้ยังไม่ save→สลับหน้า; save→Refresh | persist เฉพาะ saved; การสูญ draft ต้องบันทึก UX จริง; dailyweekly ต้อง save ก่อน submit | ☐ | ☐ | ☐ | ☐ | ______ |
| Native alert/confirm | ดำเนิน maincases ทั้งหมด | ไม่พบ window.alert/confirm/prompt ใน source scan; confirmaliases เป็น sharedhelper; หาก browsernativedialog ปรากฏบันทึกจริง | ☐ | ☐ | ☐ | ☐ | ______ |
| Privacy in UI | สลับ role/expiredsession/capabilityscope | ไม่ showtoken/storagepath/foreignrecord; ปิดข้อมูลส่วนบุคคลใน screenshot | ☐ | ☐ | ☐ | ☐ | ______ |

## Source clues ที่ต้องทดสอบจริง

| หลักฐาน | ข้อสังเกตจาก source | กรณีมือ |
|---|---|---|
| [frontend/src/styles/main.css:1](../../frontend/src/styles/main.css#L1) | focus-visible/reduced-motion/media rules มี | Keyboard/focus/layout ทุก page |
| [frontend/src/styles/coop_activities.css:1](../../frontend/src/styles/coop_activities.css#L1) | calendar responsive/44px event rules มี | ทั้ง Staff/Student month/list ที่ 390px |
| [frontend/src/styles/staff_documents.css:1](../../frontend/src/styles/staff_documents.css#L1) | grid→singlecolumn และ previewheight | reason/companyresponse/docmodal ที่ 390px |
| [frontend/src/ui/feedback.js:45](../../frontend/src/ui/feedback.js#L45) | action alert มี Escape แต่ไม่มี Tabconfinement เหมือน confirm | ลอง Tab ออกนอก actionalert; suspected runtimeUX ต้องบันทึก actual |
| [frontend/src/ui/feedback.js:124](../../frontend/src/ui/feedback.js#L124) | Tabwrap/Escape/focusfallback มี | ทุก confirmreason ระหว่าง cancel/staleerror |
| [frontend/src/pages/student_coop.js:3728](../../frontend/src/pages/student_coop.js#L3728) | transfer ใช้ successstyle ทั้งที่ไม่เชื่อม Backend | อย่ารับรอง save; บันทึก G-FLOW-01 |
| [frontend/src/pages/index.js:575](../../frontend/src/pages/index.js#L575) | chatfixedreply/searchconsoleonly | public UX/integrationgap |
| Existing logs E-ACT/E-SUP/E-RES/E-CAN | มี history PASS บาง desktop/mobile; มี olderFAIL | ไม่เติมช่อง manual ว่าผ่านจาก artifact เดิม |

## ใบบันทึก UX issue ที่นำไปใช้ได้

| Bug ID | Page/panel | Viewport/height/zoom | ขั้นตอน | Expected | Actual | Screenshot redacted | Severity/ผลกระทบ | ผู้ตรวจ/วันที่ |
|---|---|---|---|---|---|---|---|---|
| ______ | ______ | ______ | ______ | ______ | ______ | ______ | ______ | ______ |

Checklist นี้ไม่ประเมิน visual จาก browser สดและไม่ได้วัด contrast/touch/overflow จริง ทุกช่องยังต้องผู้ใช้ตรวจและกรอก ดู [กรณีรายฟังก์ชัน](FITM_MANUAL_TEST_CHECKLIST_2026-10-10.md) และ [Gap report](FITM_GAP_AND_PRIORITY_REPORT_2026-10-10.md)

