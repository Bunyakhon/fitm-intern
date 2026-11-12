# Teacher Bugfix Round 1 — Focused Chrome Retest

11 พฤศจิกายน 2569 (Asia/Bangkok). ที่มา: ผลผู้ใช้53ข้อ PASS27/FAIL10/BLOCKED16. **คงผลรอบเดิม; ตารางนี้เป็น Retest ใหม่ ทุกข้อ NOT VERIFIED.** CodexรันเฉพาะTargeted STU-01 Development Service Read ตามสิทธิ์; ไม่มีAPI/Browser/TestSuites/Build/Lint/Syntax Checks. **Database Writes: NONE.**

Restart Backend/reload Frontend ตามปกติเพื่อใช้Sourceใหม่; ไม่ต้องเปิดAllow Popups/ปิดBrowserSecurity/รันSeeder/แก้DB. ใช้บัญชีและไฟล์ที่มีสิทธิ์จริง; ผู้ใช้ทำUpload/Reviewผ่านWorkflowเดิมเองเมื่อกรณีนั้นจำเป็น. ห้ามส่งJWT/Credentials/PrivateURLs/ข้อมูลบุคคลในรายงาน.

| ID เดิม | ขั้นตอน / Expected | Retest |
|---|---|---|
| SYS-02 | Dashboard→เลือกTask CoopคนA→Modalแสดงชื่อ/รหัส/บริษัทของAและRequestเดียวกับTask; ปิดแล้วเลือกBต้องเปลี่ยนเป็นB. ทำซ้ำAdvisorTask→รายละเอียดคำขอถูกคน. แม้เคยกรองList/อยู่หน้าอื่นต้องเปิดตามRequestIDได้. Taskที่เปลี่ยนสิทธิ์แล้วแสดงError ไม่เปิดคนอื่น. TotalsรวมจากBackend/Queueแสดงสูงสุด5ต่อหมวด | NOT VERIFIED |
| ADV-01 | เปิดคำขอเป็นที่ปรึกษาครั้งแรก→ทุกสถานะ. สลับรอยืนยัน/ยืนยันแล้ว/ปฏิเสธ/ถูกแทนที่→ตรงDBที่มีสิทธิ์เห็น; เปลี่ยนStatusกลับหน้า1 คงSearch/ปี/ภาค/IT–INE/Sort/View. ทุกสถานะรวมเฉพาะTeacherตัวเอง; Actionsเฉพาะpending | NOT VERIFIED |
| ADV-02 | เลือกทุกสถานะ→ค้นชื่อ/รหัสของคำขอconfirmedหรือrejectedที่มีจริง→พบ. ค้นหัวข้อโครงการ→พบข้ามสถานะ. กรองปี/ภาค/สาขาต้องเป็นAND, เปลี่ยนSort/CardTableไม่ล้างคำค้น. ไม่มีข้อมูลในสถานะนั้นให้รายงานยังไม่ได้ตรวจ ไม่สร้างคำขอปลอม | NOT VERIFIED |
| STU-05 | Teacher→นักศึกษาในความดูแล ดูหน้า1/2และสลับCard/Table→StudentIDไม่ซ้ำ. เปิดAแล้วB→Mentor/CompanyตรงStudentที่เลือก ไม่ค้างAบนB. Unknownแสดงไม่ระบุและไม่เดาปี. รายงานชื่อซ้ำพร้อมลำดับการกด/ข้อความโดยปิดข้อมูลส่วนบุคคล; Source/DBAuditรอบนี้ไม่พบDuplicateStudent/MentorในScopeที่ตรวจ | NOT VERIFIED |
| STU-06 | Default10→หน้าแรก10ถ้ามีเพียงพอ, Nextอีก8สำหรับSnapshotScope18ที่Codexอ่าน (จำนวนเปลี่ยนได้ตามข้อมูลล่าสุด). เลือก25/50→กลับหน้า1และCount/Rangeตรงจริง. Search/Filter/Sort/CardTablePreference/SelectedDraftไม่หาย, Paginationไม่มีStudentIDซ้ำ/ตกหล่น. Backendไม่รับLimitนอก10/25/50. กรณีDatasetไม่ถึง50ไม่ต้องสร้างข้อมูลเพิ่ม | NOT VERIFIED |
| DOC-01 | เปิดBook/PosterPDFชื่อprofile.pdfที่Uploadลงหมวดนั้นจริง→Previewอยู่ในSharedModalหน้าเดิม ไม่มีPopup/แท็บใหม่/ChromeBlocked. ตรวจชื่อหมวด+ชื่อไฟล์ ไม่ตัดสินประเภทจากชื่อprofile.pdf. ไฟล์external_profile_pdf/Transcript/IDส่วนตัวต้องไม่โผล่ในหมวดเอกสารโครงการ | NOT VERIFIED |
| DOC-04 | PDFหลายหน้า→หน้าก่อน/ถัดไปและข้อความที่อ่านได้ตรงหน้า; PNG/JPEG→รูปภายในModal. Loading/Error/Retry/CloseX/Escape/TabTrap/FocusReturnถูกต้อง. Downloadทั้งจากCardและPreviewต้องผ่านAuthenticatedGETใหม่/ชื่อUnicodeถูก. ปิดหรือออกเมนู→Worker/Render/Blobถูกล้าง; Overleaf/DriveยังเปิดExternalตามเดิม | NOT VERIFIED |
| DOC-02 | เลือกทุกปี+ทุกภาค+ทุกสาขา ล้างSearch→รวมUnknownในScope; เลือก“ไม่ระบุปีการศึกษา”→มีเฉพาะคนที่ไม่มีEligiblePlacementพร้อมStructuredPeriod. ค้นชื่อ/รหัสของUnknownเมื่อเลือกทุกปี/ทุกภาค→ยังพบ. Emptyต้องไม่แทนNetwork/SchemaError | NOT VERIFIED |
| DOC-03 | เลือกปีเฉพาะ/ภาคเฉพาะ→ตรงStructuredDataและไม่มีUnknownปน. เลือกUnknown+ภาคเฉพาะ→ไม่มีรายการเพราะไม่ทราบภาค. กลับทุกปี/ทุกภาค→Sortใหม่สุด/เก่าสุดUnknownท้ายทั้งคู่, Totalไม่เปลี่ยนเพียงเพราะSort และCountตรงหน้า/Filter | NOT VERIFIED |
| DOC-16 | StudentในCoopAdvisorScopeจริงUploadBook→TeacherReloadDetail→ชื่อ/เวลา/Preview/Downloadล่าสุดตรงกัน. ทำซ้ำPosterPNG/JPEG/PDFและCO09ตามWorkflowเดิม. แทนไฟล์ขณะDTOเก่า→404/409+ReloadDetailก่อนอ่านเวอร์ชันใหม่. Teacherอื่น/ถอดAssignment/ExpiredSessionต้องอ่านใหม่ไม่ได้. หากยังเปิดไม่ได้ให้รายงานหมวด+HTTPstatus+ข้อความที่พบโดยไม่ส่งToken/PrivatePath | NOT VERIFIED |

## BLOCKED ที่เกี่ยวข้อง — วิธีตรวจง่าย

| ID | วิธีตรวจ / ขอบเขต | สถานะ |
|---|---|---|
| STU-01 | Codexอ่านServiceจริงdefault10และoffset10ได้10+8 รวม18unique/total18โดยRead-only. ผู้ใช้LoginTeacher→นักศึกษาในความดูแล→ตรวจList/Next/CountจริงบนChrome; ServiceEvidenceไม่แทนAPIJWT/BrowserAcceptance | PENDING USER TESTING |
| STU-02 | ใช้เมนูTeacher→นักศึกษาในความดูแล (ไม่ใช่หน้าStudent) ช่องค้นหาระบุชัดแล้ว; คัดลอกStudentCodeของรายการที่เห็น→ค้นหา→พบคนเดิม จากนั้นล้างเพื่อกลับทั้งหมด | PENDING USER TESTING |
| ADV-06 Empty | ทุกสถานะ+ทุกปี+ทุกภาค+ทุกสาขา→ค้นข้อความเฉพาะที่ไม่พบแน่นอน เช่น `ไม่พบรายการ-R1-xyz987`→FilteredEmptyไม่ใช่Error จากนั้นล้าง→รายการเดิมกลับ. ไม่ต้องสร้าง/ลบข้อมูล | PENDING USER TESTING |
| ADV-06 Pagination | ล้างFilters/ทุกสถานะแล้วดูTotal. ถ้าTotal>25ให้Next/PreviousเทียบRequestIDsข้ามหน้าและSort; ถ้า≤25ให้รายงานกรณีนี้ยังไม่ได้ตรวจจากจำนวนข้อมูล ไม่ใช่Bugและไม่สร้างข้อมูลเพิ่ม | PENDING USER TESTING |
| STU-08 | ผู้ใช้ระบุยังไม่ให้ทำเพิ่ม: ไม่ขยายงานนัดนิเทศ/ผลนิเทศรอบนี้ | DEFERRED BY USER |
| BLOCKEDอื่น | คงผลเดิม. ผู้ใช้เลือกตรวจด้วยบัญชี/ข้อมูลที่มีสิทธิ์และส่งID+ขั้นตอน+Expected/Actual; ถ้าข้อมูล/สิทธิ์ไม่พอคงPending ไม่เปิดflags/เพิ่มสิทธิ์เอง | PENDING USER TESTING |

ระหว่างFocusedRetestสังเกต27PASSเดิมที่ใช้ร่วมกัน ได้แก่CoopFilters/Sort/CardTable/Detail/ApproveReject, AdvisorAcceptReject/Sort/View, StudentFilters/Drafts, Overleaf/Drive/CO09/Empty/Session. ไม่เปลี่ยนผล27ข้อเป็นผลRegressionรอบใหม่จนผู้ใช้ยืนยัน. ตรวจ1280/768/390/320pxและKeyboardร่วมกับหน้าที่แก้.

ส่งผลแต่ละIDเป็นActual+ขั้นตอน+สถานะที่พบ; **NEXT TASK: User Manual Chrome Retest.**
