# Student Project — Overleaf / Google Drive Manual Retest

จัดทำ/ปรับตาม URL Validation และ Frontend State วันที่9พฤศจิกายน2026 (Asia/Bangkok). ทุกกรณี **NOT TESTED — PENDING USER RESULTS**. Codex ไม่รันทดสอบ/Browser/HTTP/PUT ในรอบแก้ไข; การติดตั้งDBในรอบก่อนและRead-only table inspectionรอบนี้ไม่ใช่ผลManual Acceptance.

## เตรียม

- Chrome → Student → โครงการสหกิจศึกษา; เปิด DevTools Network/Console. ใช้บัญชีทดสอบที่มีสิทธิ์อยู่แล้ว; Teacher ใช้ Chrome profile แยก. ไม่แนบ Authorization headers/token/ลิงก์ที่มี private access keys/ข้อมูลส่วนตัวในรายงานหรือ HAR.
- Development intern_system/public ติดตั้ง targeted SQL แล้วตามHandoff; ห้ามApplyซ้ำ/reset/seedเพื่อทดสอบ. Targetอื่นตรวจสถานะตาม `docs/database/STUDENT_PROJECT_LINKS_SCHEMA.md` แยกต่างหาก.
- Fault/expired session/concurrent cases ใช้ environment แยกที่ผู้ใช้ควบคุม. เลือกไฟล์ PDF/PNG/JPEG และ external links ที่ผู้ใช้มีสิทธิ์เอง; ไม่ต้องเปิด Public.

| Case | ขั้นตอน / Expected Result | Network / Console | สถานะ |
| --- | --- | --- | --- |
| P01 GET readiness / Save | ไม่มีปุ่มโหลดลิงก์ล่าสุด/ลองใหม่ในBook/Poster; เปิดหน้าโหลดอัตโนมัติ ไม่มีrowได้URLว่าง/version0. จำลองGETfailureในenvironmentแยก: แสดงErrorไทยและเก็บร่างแม้พิมพ์ต่อ; กดบันทึกลิงก์ลองGETใหม่ก่อน เมื่อสำเร็จร่างยังอยู่และกดบันทึกอีกครั้งจึงPUT | GET200 `{link}`/ETagตรงversion; ไม่มีPUTระหว่างread recovery; missingSchemaเฉพาะenvironmentแยกคืน503ตามเดิม ไม่ลบตารางจริงเพื่อทดสอบ | NOT TESTED |
| C01 CO-09 PDF + URL | บันทึกOverleafทั้งwww/non-www, rootและPathอื่นโดยไม่จำกัดread/project แล้วอัปโหลดPDF≤10MB; ทำกลับลำดับ; PDF/URLคงอยู่ทั้งคู่; URLผิดแสดงไทยใต้ช่อง | PUT document-url/POST document ใช้ If-Match และเพิ่ม document version ตามเดิม, ETagสอดคล้อง | NOT TESTED |
| C02 CO-09 Legacy | เปิด recordทดสอบที่มี non-Overleaf HTTPS เดิม; อ่าน/เปิด safe legacy linkได้; upload PDFไม่เปลี่ยนURL; Save URLเดิมถูกปฏิเสธแต่ค่าร่าง/DBเดิมยังอยู่; เปลี่ยนเป็นOverleafแล้วบันทึกได้ | ไม่มี writeจากการอ่าน; invalid new URL400/ไม่มี frontend requestเมื่อvalidationไม่ผ่าน | NOT TESTED |
| C03 CO-09 Concurrent / Review | สองแท็บอ่าน document versionเดียวกัน; อีกแท็บเปลี่ยน PDF/URL; แท็บเก่าบันทึกได้409และเก็บ Draft. ตรวจ review reset/เหตุผล/ตารางสอบตาม flowเดิม | 409 `CO09_REVISION_CONFLICT`; reloadมีShared Confirmation; examไม่ถูกแก้โดย URL save | NOT TESTED |
| B01 Book URL | เพิ่ม/แก้/Save Overleafทั้งwww/non-wwwและทุกPathรวมroot; reloadหน้าเปิดsavedlinkได้; clearแล้วSaveล้างเฉพาะURL | GET/PUT project-links/project-book; If-Match/ETag/bodyversionสอดคล้อง; no automatic repeat PUT | NOT TESTED |
| B02 Book Independence | มี Book PDFเดิม → แก้ URL → PDFยัง previewได้; มี URL → replace PDF → URLยังเดิม | Upload endpoints/metadata/path validationเดิม; link PUTไม่มี file fields และไม่เรียก cleanup | NOT TESTED |
| D01 Poster Drive | LabelระบุGoogle DriveและPlaceholderเป็นhttps://drive.google.com/...; เพิ่ม/แก้/เปิดHTTPS drive.google.comทุกPathรวมroot, Pathนอกfile/folderและQuery โดยไม่บังคับID | GET/PUT project-links/poster; ไม่มี OAuth/Drive API callsจากระบบ | NOT TESTED |
| D02 Poster Independence | สลับทดสอบ upload PDF/PNG/JPEG≤10MB กับ Save/clear Drive URL; ทั้งสองข้อมูลต้องไม่เขียนทับกัน; Bookไม่เปลี่ยน | Existing upload/previewเหมือนเดิม; PUTเปลี่ยนเฉพาะcategoryตัวเอง | NOT TESTED |
| V01 Provider / Safety | ทดลองhttp/javascript/data/file, embedded credentials, hostnameปลอมเช่นoverleaf.com.evil.example/drive.google.com.evil.example, Poster hostอื่นนอกdrive.google.com และURLเกิน2000; ต้องมีข้อความไทยใต้ช่องและaria-invalid | Frontendปฏิเสธก่อนส่ง; ใช้API clientในenvironmentแยกยืนยันBackend400เช่นกัน; Drive homepageและPathใดๆเป็นกรณีที่อนุญาต | NOT TESTED |
| V02 Strict Payload / Ownership | ผ่านAPI clientทดสอบในenvironmentแยกส่ง extra student_id/file_id/fields, categoryไม่รองรับ, ไม่มีtoken/ผิดrole/non-co_op | 400/401/403ตามเส้นทาง; ไม่มีwriteข้ามStudent/Categoryหรือสิทธิ์ใหม่ | NOT TESTED |
| L01 Link Conflict / Double Submit | สองแท็บอ่านversionเดียวกันแล้วแก้URLต่างกัน; Aสำเร็จ Bต้อง409และร่างอยู่; กดบันทึกลิงก์เพื่อreconcileผ่านSharedModal Cancelเก็บDraft Confirmจึงโหลดและแทน; กดSaveถี่ | requiredIf-Match; missing428, stale409 `PROJECT_LINK_CONFLICT`; ไม่มีretry PUTอัตโนมัติ | NOT TESTED |
| L02 Draft / Pending GET | เปิดหน้าโหลดอัตโนมัติ; หน่วงGETแล้วพิมพ์เพิ่ม; GETfailureแล้วแก้ร่าง/กดบันทึกเพื่อโหลดใหม่; เปลี่ยนเมนู/Reloadหน้าเมื่อมีร่าง | Shared Confirmationก่อนแทนDraftจากconflict; GETไม่ทับข้อความที่พิมพ์ระหว่างรอ; Topic Draftไม่เปลี่ยน; unload warningตามเดิม | NOT TESTED |
| L03 Network / Commit | จำลองPUToffline/500/commit acknowledgement lossและGETfailure; ร่างคงอยู่ ไม่แสดงsuccessโดยไม่มีack; อ่านล่าสุดก่อนลองSaveใหม่ | 503 `PROJECT_LINK_COMMIT_UNCERTAIN` หรือnetworkerror; acknowledged2xxใช้responseตรงไม่ต้องfollow-upGET | NOT TESTED |
| S01 Session | ระหว่างGET/PUTlinkหรือเปิดPreview ให้Logout/expiry/account change; Project links/Drafts/anchorsต้องล้างและresponseเก่าไม่คืนข้อมูล; ไม่มีwriteด้วยtokenบัญชีใหม่ | ตรวจrequestของworkspaceเดิม ไม่บันทึกtoken; CO-09/file session cleanupเดิมยังทำงาน | NOT TESTED |
| U01 Responsive / Keyboard | Desktop2columnsเมื่อพื้นที่พอ, Tablet/Mobile1columnตามCSSเดิม, 390/320px; Tab/Enter/Focus/Live region/Loading | Card/สี/font/Noto Sans Thai/ปุ่มเดิมคงไว้, formใหม่ไม่overflow, saved linkมีnoopener noreferrer | NOT TESTED |
| R01 Regression | Topic CAS/Draft, Advisor Refresh/Confirmed Lock, Book/Poster upload/Preview/SP-01 safety, CO-09 review/exam/version, Teacher Accept/Rejectเดิม | ไม่มีgeneralCoopRequest/Profile/JobMatching/TeacherUI changes; ไม่มีuncaughtConsole errors | NOT TESTED |

ผลที่ผู้ใช้รายงานก่อนงานนี้: CR13-01 Retestผ่าน, Student targeted fix16/16 PASS, Teacher Accept fix5/5 PASS; เป็น historical/user evidence ไม่ใช่ผลของlink featureนี้. SP-05ยังPending Policy.
