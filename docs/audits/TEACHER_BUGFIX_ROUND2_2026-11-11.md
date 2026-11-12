# Teacher Bugfix Round 2 — Source Findings / Implementation

11 พฤศจิกายน 2569 (Asia/Bangkok). ที่มา: คำสั่งผู้ใช้ Teacher Bugfix Round 2 พร้อมผล Retest Round 1 **PASS7 / FAIL3**. ผู้ใช้ยืนยัน SYS-02, ADV-02, DOC-01, DOC-02, DOC-03, DOC-04, DOC-16; DOC-01/16ครอบคลุมเฉพาะบัญชีที่ทดสอบ และการเข้าถึงข้ามTeacherยังไม่ยืนยัน. ผลเก่าคงที่มา/ขอบเขต ไม่ถือ SourceUpdate รอบนี้เป็น Manual PASS และไม่จับคู่ FAIL3 ที่ไม่ได้แจกแจงเอง.

BaselineLocalGit **25 Modified / 19 Untracked**. อ่านAGENTS/ProjectSkill/Handoff/README/Round1Audit+Retest และ Source/Diff เฉพาะจุดเกี่ยวข้อง. รอบนี้ไม่มี DB connection/read/write/API/Browser/Automated Checks; สิทธิ์ Targeted STU-01 รอบก่อนใช้แทนไม่ได้. **Tests: NOT RUN — USER-OWNED TESTING. Database/Schema/Seed Changes: NONE.**

## Findings and UX changes

| Requirement | Source evidence / cause | Implementation |
|---|---|---|
| Coopค้นหาข้ามสถานะ | เดิม `teacherCoopRequests.js` เริ่มadvisor_review, HTMLไม่มีall, `roleWorkflow.service.js:listRequests` defaultTeacherเป็นStage และไม่รับall; Searchอยู่ใต้StatusPredicate | TeacherUIเริ่มทุกสถานะ(ไม่กรอง), Adapterละstatusเมื่อall, BackendTeacherdefaultall/รับallผ่านAllowlistและไม่ใช้StatusPredicateจำกัด. SpecificStatus9ค่าตรงModel/REQUEST_STATUSESเดิม; ScopeยังStudent.advisor_teacher_id. Statusเปลี่ยนresetoffset0คงFilters/Sort/View. DepartmentHead/Staff default/allowlistไม่เปลี่ยน |
| Advisor superseded | Model/ServiceรองรับsupersededและHistoricalReadตั้งแต่Round1แล้ว; Labelเดิม“ถูกแทนที่”ไม่อธิบายความหมาย | Filter/Badge/Detailแสดง“คำขอเดิม (มีคำขอใหม่แทน)”เป็นข้อความจริงที่ScreenReaderอ่านได้; Timestampใช้“มีคำขอใหม่แทนเมื่อ”. ค่าBackend/Constraints/Transitionsคงsuperseded, Actionsยังเฉพาะpending. ทุกสถานะคงSearchทุกสถานะในrequested_advisor_teacher_idเดิม |
| StudentPopup | `teacherSupervision.js:detail` เดิมmountAppointment/ResultWidgetsแล้วscrollIntoViewจากปุ่มCard/Table. `teacherStudents`, scheduling, resultsใช้`supervisionDetail`/Stateเดียวกัน | เพิ่มRead-onlySharedModalแยกDOM/State/AbortControllerจากFormเดิมใน`teacherSupervision.js`และHTML. Cardพื้นว่าง/ปุ่มCard/ปุ่มTable/PickerเปิดPopupเมื่ออยู่teacherStudents; ไม่มีdetail()หรือscrollIntoViewจากเส้นทางนี้. InlineWorkflowซ่อนเฉพาะteacherStudents และใช้เดิมในสองเมนูนิเทศ |
| Popupdata | Detailเดิมมีชื่อ/รหัส/Mentor/Requests/Appointment/History แต่ไม่มีMajor/ProjectTopic/StructuredPeriodในRequestDTO | เพิ่มTeacher-onlystudent.major/topicและrequests[].academicPeriodจากModelsจริงในDetail APIเดิม. Project1queryและPeriods1bulkqueryเมื่อเลือกคน ไม่N+1ListDetail. StudentOwnerResponseเดิมไม่เพิ่มFields/Queries. ModalเลือกPeriodจากRequestIDเดียวกับListProjection ไม่ใช้วันที่/รหัส/ชั้นปีหรือค่าปีคงที่ |
| Popupclose/drafts | ย้ายหรือremountFormเข้าDialogจะเสี่ยงล้างSchedule/ResultDrafts | Popupreadไม่เปลี่ยนcurrent/StudentIDของWorkflow, ไม่clearResults/edit/resetform. Close/X/Escape/OverlayabortคำขอและคืนFocusโดยคงPopupSelection/WorkflowDrafts; ไม่มีConfirmationActionsในDialog. FooterปิดPopupก่อนเปิดWorkflowเดิมจากClickผู้ใช้เท่านั้น; คนเดิมไม่reloadDetailทำลายDraft. เลือกคนอื่นไปWorkflowใช้Detailเดิมตามการเลือกผู้ใช้ ไม่มีการสร้าง/บันทึก/ส่งอีเมลอัตโนมัติ |
| PageSizeทั้ง3 | Coop/AdvisorเดิมFix25+Overfetch26; StudentsRound1มี10/25/50เฉพาะLocalControlและไม่จำค่า | `teacherListView.js`เพิ่มonPageSizeแบบOpt-in, getter/Select10,25,50, default10 และPreferenceแยกเมนู. ทั้ง3Pageส่งpage_sizeจริงไปBackend ไม่slice/overfetch. ใช้TotalหาNext, offset±PageSize, resetหน้า1เมื่อSizeเปลี่ยน คงSearch/Filters/Sort/View. SharedToolbarRangeอ่านPageSizeGetterเดิม. Documentsไม่Opt-inและคงPage25เดิม |
| STU-05 | ListเลือกStudentIDจากScopedQueryแล้วhydrate/MapตามID; ClientตรวจUniqueIDs. Mentorมาจาก`Mentor.findOne({student_id:student.id})`; Detailต้องidตรง, rowContextต้องidตรง; ไม่มีMentorJOINในList. AcademicPeriodมาจากFKจริงของEligiblePlacement | คงIDGuards/Unknown ไม่แก้ชื่อหรือBackfill. Popupใช้FreshScopedDetailและGuardID/Sequence/Token, Mentorไม่ใช้ArrayIndex/ค่าจากคนก่อน. ยังไม่ยืนยันMentorซ้ำ/UnknownหายจากRuntimeรอบนี้. ผลDB18unique/Mentor18/known12/unknown6ในRound1เป็นหลักฐานเก่าคนละขั้นตอน ไม่ใช่ผลตรวจใหม่ |

## Backend / pagination contracts

- Teacher GET `/api/teachers/coop-requests`: ไม่ส่งstatusหรือstatus=allหมายถึงไม่จำกัดสถานะ; SpecificStatusตามREQUEST_STATUSES9ค่าเดิม. TeacherScope/Detail/ApprovalStageเดิม. Shared`teacherSearch.service.js`ใช้nullableboundstatusเฉพาะQuery ไม่เปลี่ยนDBเป็นNULL. Dashboardยังส่งadvisor_reviewหรือpendingและlimit6แบบชัดเจน; ไม่แก้DashboardSource/TaskQueue/TaskSelection.
- ทั้ง3Listเพิ่ม **page_size=10|25|50** ผ่าน`teacherListPagination`; Array/Object/ค่าอื่น400. หากส่งlimitร่วมต้องตรงpage_size มิฉะนั้น400. Default10สำหรับ3TeacherLists. OFFSET/LIMIT/Count/Search/Period/SortยังทำในDBก่อนHydrationและคืนตามOrderedIDเดิม; APIResponseShapeเดิมพร้อมmetadata1.
- **Legacy limit compatibility:** Coop/Advisorยังรับboundedlimitเดิม1–100สำหรับcallersเดิม รวมDashboardlimit6; ไม่เปลี่ยนQueueให้เป็นหน้า10. InteractiveUIใหม่ใช้page_sizeAllowlistเสมอ. SupervisionคงLegacylimitเฉพาะ10/25/50ตามRound1. Documents/DepartmentHead/StaffPaginationไม่ขยายContractใหม่.
- Metadataเดิมคืนlimitเป็นEffectivePageSize, offset,total,years และrows (Coopอยู่ในdata); Supervisionใช้students. ไม่มีpage_sizefieldใหม่ที่ต้องบังคับCallerเดิมอ่าน. Countไม่ขึ้นกับSize/Sort.
- Teacher GET `/api/supervision/teacher/students/:id`ยังใช้Teacher/liveactor/ActiveTeacher+CoopAdvisorOwnershipเดิม; เพิ่มstudent.major/topic, requests[].academicPeriodตามFKจริง. Project/Periodsอ่านในDetailtransactionเดิมหลังOwnerCheck; ไม่เปลี่ยนcontext()/Appointment/Token/Result mutation logic หรือStudentOwnerDTO.

## Modal / state lifecycle

`teacherStudentDetailOverlay`/`teacherStudentDetailDialog`ใช้mountContentModalเดิมและTeacherDetailCSS: Headerชื่อ+รหัส+X, BodyDL/Loading/Error/Retry/ScrollRegion, FooterClose+ไปScheduling/Results. ไม่ย้ายAppointment/Result DOM. Modalข้อความทั้งหมดใช้textContent/DOMNodes; ไม่มีStudentHTMLInterpolation/FileURL/Tokenใหม่.

Popupใช้popupId/popupRow/popupDataแยกWorkflowcurrent/studentId. เปลี่ยนคน/ปิด/HashExit/Pagehide/LogoutabortControllerและเพิ่มVersion; Responseต้องตรงStudentID/RequestTicket/TeacherToken/ModalOpen. SessionChangeล้างข้อมูลที่แสดงโดยไม่ลบTokenของบัญชีใหม่; มีเฉพาะLocalSessionTimerขณะDialogเปิด ไม่เพิ่มPollingAPI. No nativePopup/Confirmation/Alertใหม่. Guardไม่เปิดPopupบนDialogอื่นและmutationไม่เปิดConfirmationจากPopup. FooterNavigationต้องเป็นClickจริงและไม่เขียนHashหลังผู้ใช้เปลี่ยนเมนูไปแล้ว.

Modalไม่เปิดอัตโนมัติเมื่อกลับเมนู และไม่ส่งWorkflowMutationเอง. Closeไม่ลบPopupSelection/เปลี่ยนWorkflowStudent/Drafts. การส่งต่อไปWorkflowคนอื่นเป็นการเลือกใหม่ผ่านFooterตามผู้ใช้กด; ไม่ยกDraftของอีกคนไปแสดงใต้คนใหม่. Card/TableViewยังrenderจากRowsเดิมโดยไม่Fetch.

Preference `fitm.teacher.list-page-size.<coopApprovals|advisorRequests|teacherStudents>`เก็บเฉพาะ10/25/50; ค่าเสีย/อ่านStorageไม่ได้เริ่ม10, บันทึกไม่ได้ใช้ค่าชั่วคราวในMemory. View/SortKeysเดิมและSessionStorageไม่เปลี่ยน. PageSize/Sort/Viewใช้FocusVisible/Label/Disabled/FocusReturnและResponsiveWrapเดิม; CSSเพิ่มเฉพาะStudentPopupข้อความ/ActionsและCardPointer.

## Files and preserved areas

แก้Backend3ไฟล์: `services/teacherSearch.service.js`, `services/roleWorkflow.service.js`, `services/supervision.service.js`.

แก้Frontend8ไฟล์: `api/teacherProjectAdvisor.api.js`, `api/supervision.api.js`, `pages/teacherListView.js`, `pages/teacherCoop.js`, `pages/teacherCoopRequests.js`, `pages/teacherSupervision.js`, `styles/teacher_list_view.css`, `teacher_coop/teacher_coop.html`.

แก้README/Handoff; เพิ่มAuditนี้และ[Round2FocusedRetest](../testing/TEACHER_BUGFIX_ROUND2_MANUAL_RETEST.md). ไม่มีไฟล์ลบ/Commit/Push/Reset/Stash/Checkoutทับ. BaselineModels/DB/Seeders/DocumentModules/PDFViewer/Auth/Sidebar/Navigationไม่แก้ในรอบนี้. คงApproval/AdvisorTransitions/Supervision1–2/ResultDrafts/StudentUpload/CO09/ProviderLinksและDataset35/Demo15.

## Remaining / evidence boundary

UserRound1PASS7ยังคงเป็นผลผู้ใช้วันที่11พฤศจิกายน2569เฉพาะขอบเขตที่รายงาน; Round2ทุกRetestเริ่มNOT TESTED. CrossTeacherAuthorizationยังNOT VERIFIED. BrowserFocus/320px/Responsive/Abort/Session/DraftPreservation/Pagination/ใหม่ทุกสถานะและMentor/Unknownต้องผู้ใช้ทดสอบต่อ. ไม่อ่านDBเพื่อยืนยันซ้ำ ไม่สร้างMentor/AcademicPeriodหรือDataเพื่อให้Checklistผ่าน. ไม่มีPendingPolicyDecision/SchemaBlockerที่จำเป็นจากSourceนี้.

**Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: User Manual Chrome Retest.**
