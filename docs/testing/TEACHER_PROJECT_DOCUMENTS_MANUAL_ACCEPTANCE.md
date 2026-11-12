# Teacher Project Documents — User Manual Chrome Acceptance

**Follow-up 11 November 2026:** งานBugfixRound1ใช้ [FocusedRetest](TEACHER_BUGFIX_ROUND1_MANUAL_RETEST.md) ตามผลผู้ใช้53ข้อ PASS27/FAIL10/BLOCKED16 (รหัสชุดนั้นต่างจากD01–D40). คงตารางนี้เป็นChecklistชุดเดิม ไม่จับคู่ผลรายข้อโดยเดา; PDFPreviewล่าสุดใช้PDF.jsCanvasภายในModalแทนNativeiframe และDocumentsเพิ่มตัวเลือกไม่ระบุปีการศึกษา.

11 November 2026 (Asia/Bangkok). **Tests: NOT RUN — USER-OWNED TESTING.** ทุกแถวเริ่มNOT TESTED; Checklistไม่ใช่ผลจากCodex. งานSearch/Filter/CardTable/Sorting/Dataset35คนก่อนหน้ายังPENDING USER TESTING. RestartBackend/reloadFrontendตามปกติ; ไม่รันSeeder/DDL/Reset/เพิ่มสิทธิ์เพื่อให้กรณีทดสอบผ่าน.

ใช้บัญชีและไฟล์ที่ผู้ใช้มีสิทธิ์ใช้งานจริง หลีกเลี่ยงเผยแพร่ข้อมูลบุคคล/Tokenในผลรายงาน. กรณีต้องใช้ข้อมูลที่ยังไม่มีให้ระบุยังไม่ได้ตรวจ ห้ามประดิษฐ์ผลผ่าน. FileuploadสำหรับAcceptanceทำผ่านStudentWorkflowเดิมโดยผู้ใช้เองตามสิทธิ์ ไม่ใช่Seederหรือคำสั่งให้Codexเขียนข้อมูล.

| ID | สิ่งที่ผู้ใช้ตรวจ / Expected behavior | สถานะ |
|---|---|---|
| D01 | TeacherLogin→เอกสารโครงการ เป็นWorkspaceจริง มีคำอธิบายตามRequirement ไม่มีplannedcards/ปุ่มแก้เอกสารหรือจัดสอบ | NOT TESTED |
| D02 | เห็นเฉพาะStudent.track=co_op และcoop_advisor_teacher_idตรงTeacher; ClassAdvisorอย่างเดียวไม่เห็น | NOT TESTED |
| D03 | Teacherอื่น/Head/Adminmemberที่ไม่ใช่CoopAdvisorเข้าถึงStudentนั้นไม่ได้ แม้รู้UUID | NOT TESTED |
| D04 | Student/Staff/standaloneSuperAdminJWTใช้TeacherList/Detail/Preview/Downloadไม่ได้; ไม่มีadminbypass | NOT TESTED |
| D05 | ไม่มีSession/ExpiredJWT/Accountdisabled/revoked→403/401ตามguardsเดิม ไม่เห็นข้อมูลใหม่ และUIล้างเอกสาร/Blobที่ค้างเมื่อทราบSessionchange | NOT TESTED |
| D06 | ListคืนเฉพาะMetadata/summary ไม่มีstorage_path/contacts/privateTokens/filebytes/ExternalURLทั้งชุด และไม่มีDetailGETทีละStudent | NOT TESTED |
| D07 | ค้นชื่อไทย/ชื่อเต็ม/partial/รหัส/หัวข้อ/บริษัท, trim/อังกฤษcaseinsensitive และliteral%/_ตามSharedSearch | NOT TESTED |
| D08 | ANDปี/ภาค1–2/IT–INE ไม่มีsummer; Unknownไม่เดาปีและไม่ตรงปีที่ระบุ; DropdownปีจากDBมาก→น้อย | NOT TESTED |
| D09 | Sortใหม่สุด/เก่าสุดก่อนก่อนPagination, Unknownท้าย, date/UUIDstabletie, totalไม่เปลี่ยนเพียงเพราะSort | NOT TESTED |
| D10 | PaginationBackendและCountตรงจริง, เปลี่ยนFilter/Sortกลับหน้า1, มีหลายหน้าจึงตรวจรอยต่อข้ามหน้าโดยไม่สร้างข้อมูลเพิ่ม | NOT TESTED |
| D11 | Card/TableResultSetเดียว, สลับไม่Fetchเพิ่ม/ไม่resetFilterSortPage, ตาราง8คอลัมน์อ่านข้อความยาวได้ครบ | NOT TESTED |
| D12 | PreferenceของprojectDocumentsแยกจากสามเมนูเดิมและReloadคืนค่า; Storageอ่านไม่ได้defaultCard/newestโดยไม่มีError | NOT TESTED |
| D13 | ไม่มีStudentในscope/Filterไม่ตรง→Empty; มีStudentแต่ยังไม่มีเอกสาร→Studentยังอยู่และBadge“ยังไม่มีเอกสาร”ทั้งสามประเภท | NOT TESTED |
| D14 | เลือกStudent→ชื่อ/รหัส/สาขา/ปีภาค/หัวข้อ/บริษัทถ้าชัดเจนตรงกัน; Currentdocumentsไม่ถูกอ้างว่าเป็นเอกสารย้อนหลังของปีนั้นโดยไม่มีmapping | NOT TESTED |
| D15 | BookPDFจริงแสดงชื่อ/MIME/ขนาด/อัปโหลด/แก้ไขและปุ่มPreview/Download; ไม่มีไฟล์ไม่แสดงActionเปิดไฟล์ | NOT TESTED |
| D16 | BookOverleafอย่างเดียว→“มีลิงก์”; fileอย่างเดียว→“มีไฟล์”; ทั้งสอง→“มีทั้งไฟล์และลิงก์” | NOT TESTED |
| D17 | PosterPDF/PNG/JPEGแสดงMetadataและPreviewตรงประเภท; ไม่รองรับSVG/HTML/MIMEนอกallowlist | NOT TESTED |
| D18 | PosterDriveอย่างเดียว/ไฟล์อย่างเดียว/ทั้งสองสถานะถูกต้อง; การมีลิงก์ไม่อ้างว่าเปิดProviderได้แน่นอน | NOT TESTED |
| D19 | CO09ไม่เคยสร้าง→ข้อความ“เอกสาร CO-09 ยังไม่ถูกสร้าง”; มีrowไม่มีbytesต้องไม่สร้างPDF/สถานะสมมติ | NOT TESTED |
| D20 | CO09ที่มีจริงแสดงreviewstatus/reason/date/PDF/Overleafตามข้อมูลเดิม ไม่มีReview/Schedule/Approvalcontrols | NOT TESTED |
| D21 | CO09legacyHTTPSจากระบบเดิมแสดง“เปิดลิงก์เดิม(host)”ตามSafeURL ไม่แอบเรียกทุกHostว่าOverleaf; unsafeURLไม่เป็นลิงก์ | NOT TESTED |
| D22 | ExternalLinksทุกประเภทตรวจHTTPS/host/credentials/lengthตามกฎเดิม, targetblank+noopener+noreferrer/no-referrer ไม่มีJWT/Authorization/ข้อมูลภายในส่งไปProvider | NOT TESTED |
| D23 | Previewทุกประเภทต้องมีAuthenticatedGETก่อนBlob ไม่เปิดPrivateStorageURLตรง; Headersมีprivate,no-store/nosniff/MIME/CSPตามroute | NOT TESTED |
| D24 | PreviewPDF/ภาพมีLoading/Error/Retry, ปิดX/Escape/ฉากหลังและFocusคืนเดิม, Tab/ShiftTabไม่หลุดออกDialog | NOT TESTED |
| D25 | PDF.jsCanvasในSharedModalแสดงPDFหลายหน้า/หน้าก่อนถัดไป/ข้อความที่อ่านได้ โดยไม่มีPopupหรือNativeiframe; Worker/FontsจากLibraryAllowlistเท่านั้น, ไม่มีPrivateStoragePublicURL. หากแสดงไม่ได้มีError/Retry/AuthenticatedDownload; Escape/Focus/WorkerCleanupตรงจริง | NOT TESTED |
| D26 | Downloadได้ชื่อไฟล์Unicode/เนื้อหาตรงกับไฟล์ที่เลือก ผ่านAuthenticatedGETใหม่ แม้มีPreviewเปิดอยู่ | NOT TESTED |
| D27 | เปลี่ยนStudent/ออกเมนู/กดBack/ปิดPreview/Pagehide/Logout→abortคำขอที่ไม่จำเป็นและrevokeBlobURL ไม่มีผลเก่ามาทับStudentใหม่ | NOT TESTED |
| D28 | เปลี่ยนบัญชี/cross-tabrevocation/tokenexpiryระหว่างRequest→ไม่แสดงresponseบัญชีเก่าและล้างBlob; กลับจากBFCacheต้องตรวจSessionและโหลดใหม่ | NOT TESTED |
| D29 | Teacherassignmentถูกถอด/เปลี่ยน→Preview/DownloadGETใหม่เข้าถึงไม่ได้ แม้มีUUID/revisionเก่า; ไม่อ้างว่าถอนสำเนาที่ดาวน์โหลดไปแล้วได้ | NOT TESTED |
| D30 | เปลี่ยนFileID/StudentID/Categoryข้ามคน/รูปแบบUUIDไม่ถูกต้อง→400/404ตามguard ไม่มีpath/SQLรั่วและไม่มีไฟล์ผิดคน | NOT TESTED |
| D31 | Filemetadataมีแต่ไฟล์ถูกลบ/ขนาดผิด/pathผิด→unavailable/Errorไม่fakeemptyหรือ“พร้อมใช้งาน”; ไม่มีPreviewActionที่อ้างว่ามีbytes | NOT TESTED |
| D32 | Studentแทนไฟล์ขณะTeacherเปิดDTOเก่า→409หรือ404/ReloadDetailก่อนเปิดเวอร์ชันใหม่ ไม่แสดงbytesใหม่ใต้ชื่อเก่า | NOT TESTED |
| D33 | List/Detail/networkfailure/schema503แสดงErrorชัด+Retry ไม่แทนด้วยไม่มีStudent/ไม่มีเอกสาร; Privateerrorไม่มีcredentials/serverpath | NOT TESTED |
| D34 | Rapidclick/Filter/Sort/View/เลือกStudentไม่เกิดDoubleRequestที่ไม่จำเป็นหรือStaleResponseทับผลล่าสุด; cancelไม่แสดงErrorปลอม | NOT TESTED |
| D35 | StudentUploadBook→TeacherReloadDetail/Preview/Downloadอ่านbytesล่าสุดจากStudentFileเดิม ไม่ต้องSeeder/Sync/แก้DB | NOT TESTED |
| D36 | StudentUploadPosterPDF/PNG/JPEGและSaveDrive→TeacherReadbackตรงไฟล์/ลิงก์ล่าสุดตามcategory | NOT TESTED |
| D37 | StudentCO09Upload/SaveOverleaf/Staffreviewเดิม→Teacherเห็นMetadataตามจริงและยังไม่มีสิทธิ์Manager; Student/Staff/AdminWorkflowเดิมไม่เปลี่ยน | NOT TESTED |
| D38 | Responsive1280/768/390/320px: ไม่มีPagehorizontaloverflow, TableScrollเฉพาะContainer, Card/Controls/Previewไม่ทับSidebar/Modalอื่น | NOT TESTED |
| D39 | Keyboard/ScreenReader: labels/aria-pressed/aria-busy/LiveError/ColumnRowHeaders/Caption/FocusVisibleอ่านได้ ไม่สื่อสถานะด้วยสีอย่างเดียว | NOT TESTED |
| D40 | Dashboard/คำร้อง/Advisor/StudentList/SearchSort/CardTable/Supervision1–2/ResultsDraftImages/Session/AdminEntryยังทำงานเดิม; ไม่ยกผลเก่าเป็นผลทดสอบรอบนี้ | NOT TESTED |

รายงานผลตามIDพร้อมขั้นตอน/เมนู/ประเภทไฟล์/HTTPstatusหรือข้อความที่พบ โดยไม่ส่งAuthorization/Token/ลิงก์ส่วนตัวหรือข้อมูลบุคคล. **NEXT TASK: User Manual Chrome Acceptance.**
