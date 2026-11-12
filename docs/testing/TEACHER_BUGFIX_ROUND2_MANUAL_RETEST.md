# Teacher Bugfix Round 2 — User Manual Chrome Retest

11 พฤศจิกายน 2569 (Asia/Bangkok). ผลผู้ใช้RetestRound1: **PASS7 / FAIL3**; ตารางนี้เป็นรอบใหม่ **NOT TESTED ทุกข้อ**. ไม่มีCodexTests/Browser/API/DB/Syntax/Build/Lintรอบนี้. **Tests: NOT RUN — USER-OWNED TESTING. Database Writes: NONE.**

RestartBackend/reloadFrontendตามปกติเพื่อรับSourceล่าสุด. ใช้บัญชี/ข้อมูลที่ได้รับสิทธิ์จริง ไม่Seed/Migrate/เพิ่มสิทธิ์หรือแก้ข้อมูลเพื่อให้ครบหน้า. หากจำนวนไม่พอตรวจ50หรือไม่มีประวัติsuperseded ให้ระบุยังไม่ได้ตรวจกรณีนั้น. รายงานID+ขั้นตอน+Expected/Actual/Statusโดยไม่ส่งToken/Secret/ข้อมูลบุคคลหรือPrivateLinks.

| ID | วิธีตรวจ / Expected | ผลใหม่ |
|---|---|---|
| R2-01 | คำร้องสหกิจเปิดครั้งแรก→ทุกสถานะ(ไม่กรอง). ค้นชื่อ/รหัสของคำร้องapproved/rejectedที่มีจริง→พบภายใต้ClassAdvisorScope; ลองบริษัท/ตำแหน่งงานข้ามสถานะ. Networkไม่ส่งstatusจำกัดเมื่อเลือกall | NOT TESTED |
| R2-02 | CoopเลือกStatusเฉพาะ→ผลตรงสถานะ; ไปหน้าถัดไปแล้วเปลี่ยนStatus→หน้า1โดยคงSearch/ปี/ภาค/IT–INE/Sort/CardTable. DefaultAllไม่เพิ่มปุ่มApprove/Rejectให้สถานะที่พิจารณาไม่ได้ | NOT TESTED |
| R2-03 | AdvisorFilter/Badge/Detailใช้ข้อความ“คำขอเดิม (มีคำขอใหม่แทน)” อ่านได้ด้วยScreenReader/Keyboard; ค่าAPIยังsuperseded. ไม่มีAccept/Rejectสำหรับประวัติเก่า; Filtersupersededไม่InvalidStatus | NOT TESTED |
| R2-04 | Advisorทุกสถานะ→ค้นชื่อ/รหัส/หัวข้อของconfirmed/rejected/supersededที่มีจริง พบตามTeacherOwnerเดิม; SpecificStatusยังANDกับFiltersและเปลี่ยนแล้วกลับหน้า1 | NOT TESTED |
| R2-05 | Teacher→นักศึกษาในความดูแล→กดพื้นที่การ์ดหรือปุ่มดูรายละเอียด→SharedPopupเปิดทันที มีLoadingแล้วชื่อ/รหัสถูกคน; ไม่เลื่อนลงInlineFormและURLไม่เปลี่ยน | NOT TESTED |
| R2-06 | StudentTable→ปุ่มดูรายละเอียด→PopupคนเดียวกับRow. แสดงIT/INE/หัวข้อ/บริษัท/Mentor+VerifiedStatusตรงDetail; ปี/ภาคจากRequestที่Listเลือกจริง. ไม่มีPeriodแสดงไม่ระบุ ไม่เดาจากรหัส/วันที่ | NOT TESTED |
| R2-07 | ปิดPopupด้วยX/ปิดFooter/Escape/Overlayแล้วFocusคืนปุ่ม/PickerเดิมหรือHeadingเมื่อOpenerไม่อยู่; เปิดอีกครั้งได้. Tab/ShiftTabไม่หลุดDialog, BodyยาวScrollภายใน, ไม่มีConfirmationซ้อน | NOT TESTED |
| R2-08 | เปิดAแล้วปิดระหว่างLoading→เปิดB→ResponseAไม่ทับB. Retryไม่สร้างคำขอซ้ำ; Back/ออกเมนู/Logout/Sessionเปลี่ยนยกเลิกคำขอและไม่แสดงข้อมูลบัญชีเก่า | NOT TESTED |
| R2-09 | มีScheduleDraft/ResultDraftของAในWorkflowเดิม→กลับStudentListเปิดPopupAหรือBแล้วปิด→DraftAและWorkflowSelectionเดิมไม่ถูกReset. PopupSelection/RowHighlightยังอยู่ และการปิดไม่บันทึก/ส่งEmail/สร้างนัดเอง | NOT TESTED |
| R2-10 | FooterPopupกดไปนัดนิเทศ/ผลนิเทศโดยตรง→Popupปิดก่อนเปิดเมนูเดิมและคนที่เลือกถูกต้อง; ถ้าคนเดิมมีDraftต้องไม่reloadทำลายDraft. ไม่กดFooterต้องไม่มีNavigation/Mutationเอง. เปลี่ยนเมนูระหว่างโหลดแล้วต้องไม่ถูกส่งกลับจากResponseช้า | NOT TESTED |
| R2-11 | CoopPageSizeเมื่อไม่มีPreferenceเริ่ม10; เปลี่ยน25/50→หน้า1และจำนวน/Range/Total/NextPreviousตรงBackend. ไม่มีOverfetchแล้วตัดหน้าเฉพาะFrontend และRequestIDsไม่ซ้ำ/หายข้ามหน้า | NOT TESTED |
| R2-12 | AdvisorPageSize10/25/50→พฤติกรรมเหมือนCoop; ทุกสถานะ/SpecificStatus/ชื่อ/หัวข้อ/Year/Semester/Majorทำงานร่วมกันได้. Decisionแล้วCount/หน้าว่างกลับหน้า1ตามเดิม | NOT TESTED |
| R2-13 | StudentsPageSize10/25/50→Count/Range/NextPreviousถูก, StudentIDsไม่ซ้ำ/หาย. เปลี่ยนขนาดไม่ล้างSelectedPopupStudent/WorkflowDraft/Sort/View/Filters | NOT TESTED |
| R2-14 | ทั้ง3เมนูไปหน้าที่2แล้วเปลี่ยนSize/Filter/Sort→หน้า1ตามเงื่อนไข; สลับCard/Tableอย่างเดียวไม่Fetch/ไม่เปลี่ยนPage/Size. ทั้งสองViewมีIDชุดเดียว/ลำดับเดียวกัน | NOT TESTED |
| R2-15 | ตั้งCoop10/Advisor25/Students50แล้วสลับเมนู/Reload→จำแยกเมนู ไม่ปนView/SortPreference; Storageถูกปิดหรือค่าเสียเริ่ม10และยังใช้Toolbarได้. เก็บPreferenceเฉพาะตัวเลขไม่มีข้อมูลStudent/Token | NOT TESTED |
| R2-16 | ตรวจNetworkของ3Listใช้page_size10/25/50จริง. หากตรวจAPIเองตามสิทธิ์: page_size11/0/Array/Object→400, limitที่ขัดกับpage_size→400; legacyDashboardlimit6พร้อมpendingstatusยังทำงานเดิมและไม่ถูกPagePreferenceเปลี่ยน | NOT TESTED |
| R2-17 | ตรวจMentorA/BในPopup/Card/Table→ตรงStudentIDไม่ใช้ข้อมูลคนก่อน. Unknownยังอยู่ท้ายSortทั้งคู่/ไม่ตรงปีเฉพาะ และมีข้อมูลไม่มีPeriodจริงต้องคงไม่ระบุ. หากยังซ้ำ/หายให้ส่งขั้นตอนและผลที่ปิดข้อมูลส่วนตัว; ไม่แก้DBหรือถือผลReadOnlyRound1เป็นผลใหม่ | NOT TESTED |
| R2-18 | 1280/768/390/320px: Toolbarwrap/PageSizeใช้งานได้, Tableเลื่อนเฉพาะContainer, PopupHeader/ชื่อยาว/Body/Footerไม่ล้นหน้า, FocusVisible/Labels/Loading/Error/Retryชัด | NOT TESTED |

## Regression — 7 PASS ที่ผู้ใช้ยืนยัน (ต้องกรอกผลรอบใหม่เอง)

| ID เดิม | ผลผู้ใช้Round1 / ขอบเขต | สิ่งที่สังเกตในรอบ2 | ผลใหม่ |
|---|---|---|---|
| SYS-02 | PASS — Dashboard | TaskเปิดRequestถูกคน, QueueเฉพาะPendingตามเดิมแม้ListdefaultAll, Totalsไม่ใช่PageRows | NOT TESTED |
| ADV-02 | PASS — Search | ค้นชื่อ/รหัส/หัวข้อทุกสถานะยังทำงานร่วมกับPageSize/Filters | NOT TESTED |
| DOC-01 | PASS — Entry/Preview เฉพาะบัญชีที่ทดสอบ | เปิดเอกสาร/Previewยังทำงาน; StudentPopupไม่แทรกเมนูDocuments | NOT TESTED |
| DOC-02 | PASS — Unknown Academic Filter | Documentsทุกปี/ไม่ระบุ/ปีเฉพาะยังตรงเดิม | NOT TESTED |
| DOC-03 | PASS — Sorting/Pagination Unknown | Unknownท้าย, Count/Sort/Pageเอกสารคงเดิม(ไม่เพิ่มPageSizeControlในเมนูนี้) | NOT TESTED |
| DOC-04 | PASS — Card/Table Documents ตามที่ผู้ใช้รายงาน | Toggleไม่Fetch/ไม่เปลี่ยนFilter/Page/Sort, SharedListControlไม่เพิ่มRequestให้Documents | NOT TESTED |
| DOC-16 | PASS — Upload→Readback เฉพาะบัญชีที่ทดสอบ | StudentUploadผ่านWorkflowเดิม→Teacherเห็น/เปิด/ดาวน์โหลดไฟล์ล่าสุด, Revision/SessionGuardยังอยู่ | NOT TESTED |

**Cross-TeacherAuthorization: NOT VERIFIED.** บัญชีที่ไม่ใช่Ownerต้องอ่านCoop/Advisor/StudentDetail/PrivateFilesไม่ได้; ตรวจเมื่อผู้ใช้มีบัญชีที่ได้รับอนุญาต ไม่สร้างบัญชี/ยกระดับสิทธิ์เพื่อทดสอบ. BLOCKED/รายการอื่นจากManualAcceptanceเดิมคงPendingตามหลักฐานเดิม ไม่เปลี่ยนเป็นPASSโดยเดา. Approval/Supervision1–2/Results/StudentFiles/Auth/Sessionยังต้องคงWorkflowเดิม; รอบนี้ไม่เพิ่มWorkflowหรือเริ่มSTU-08.

**NEXT TASK: User Manual Chrome Retest.**
