# Teacher Card / Table / Academic Sorting — Manual Chrome Acceptance

อัปเดต 11 พฤศจิกายน 2026 (Asia/Bangkok). **ทุกข้อ PENDING USER TESTING. Tests: NOT RUN — USER-OWNED TESTING.** Checklist นี้ระบุสิ่งที่ผู้ใช้ต้องตรวจ ไม่ใช่ผลทดสอบจาก Codex. Search/Filter และ Synthetic Dataset35คนจากงานก่อนยัง PENDING USER TESTING เช่นกัน; SELECTหลังSeedในประวัติไม่ใช่UIAcceptance.

ใช้บัญชีTeacherเดิมและข้อมูลจริงจากBackendปัจจุบัน. ReloadFrontendเพื่อรับSourceใหม่. ไม่รันSeeder/แก้Schema/เพิ่มบัญชี/สิทธิ์หรือข้อมูลเพื่อให้Checklistครบ. ยอดบนหน้าจอรวมข้อมูลเดิมและsupporting requestsตามownership/status ไม่บังคับให้เท่ากับ12/11/12. หากResultSetไม่มีหน้าถัดไป ให้ระบุว่ายังไม่ได้ตรวจกรณีข้ามหน้า ไม่สร้างข้อมูลเพิ่มเอง.

## 1. คำร้องสหกิจศึกษา — #coopApprovals

- [ ] ครั้งแรกเมื่อยังไม่มีPreference เปิดเป็นรายการ(Card). Cardเดิมยังมีชื่อ/รหัส/สาขา/บริษัท/วันที่/สถานะ/วิชา/AcademicSummary/Actions และเพิ่มปี/ภาคจาก`academicPeriod`; ข้อมูลUnknownแสดงไม่ระบุ ไม่เดาจากวันที่/รหัส.
- [ ] กดตาราง: พบ7คอลัมน์ นักศึกษา(ชื่อ+รหัส),สาขา,ปี/ภาค,บริษัท,วันที่ยื่น,สถานะ,จัดการ. สลับกลับแล้วเป็นResultSetเดียวกัน ไม่มีGETเพิ่มเพียงเพราะสลับView (ตรวจNetworkด้วยตนเอง).
- [ ] ค้นชื่อ/รหัส/บริษัท/ตำแหน่งงาน ผสมปี+ภาค1หรือ2+IT/INE+สถานะ. Viewไม่เปลี่ยนคำค้น/Filters/Status/total/Page; เปลี่ยนFilterจึงกลับหน้า1. ไม่มีภาคฤดูร้อน. ตรวจliteral%/_และภาษาอังกฤษต่างตัวพิมพ์ตามSearchเดิม.
- [ ] หากมีหลายหน้า เปิดหน้าถัดไป→สลับCard/Table→ยังอยู่หน้าเดิมและแถว/totalตรงกัน; ล้างตัวกรองทำงานเดิม. ตรวจEmpty/Error/Retry/Loadingในทั้งสองViewโดยไม่เห็นรายการเก่าทับผลใหม่.
- [ ] ดูรายละเอียดจากTableเปิดModalเดิมของคำร้องที่ถูกต้อง; ปิดด้วยปุ่ม/Escape/ฉากหลังตามguardเดิม และFocusกลับปุ่มเดิม. CardยังเปิดModalเดียวกัน.
- [ ] advisor_reviewแสดงอนุมัติ/ไม่อนุมัติ; ยืนยันผ่านSharedConfirmationเดิมและguardDoubleSubmit. Approveส่งdepartment_head_review, Rejectส่งrejected. ยกเลิกModalไม่บันทึก; nonreviewไม่แสดงActionsตัดสินใจ. สำเร็จแล้วรายการ/ยอดปรับจากBackendตามFilterเดิมทั้งสองView.
- [ ] ตั้งTable→ไปเมนูอื่น→กลับ/Reload→ยังTable; Preferenceของอีกสองเมนูไม่เปลี่ยน. ตรวจ1280/768/390/320px, Tableเลื่อนเฉพาะContainer, Modal/Sidebarไม่เสีย, Tab/Shift+Tab/Enter/Space/FocusVisibleและชื่อActionsถูกคน.

## 2. คำขอเป็นที่ปรึกษา — #advisorRequests

- [ ] เริ่มCardหากยังไม่มีPreference; ข้อมูลCard/Status/วันที่confirmedหรือrejected/เหตุผลยังอยู่ และแสดงปี/ภาคเมื่อAPIมีข้อมูล.
- [ ] Tableมี7คอลัมน์ นักศึกษา(ชื่อ+รหัส),สาขา,ปี/ภาค,หัวข้อ,วันที่ส่งคำขอ,สถานะ,จัดการ. หัวข้อยาวWrapอ่านได้ครบ ไม่มีellipsisซ่อนข้อความ; แถวconfirmed/rejectedยังอ่านวันที่และเหตุผลที่เกี่ยวข้องได้.
- [ ] ค้นชื่อ/รหัส/หัวข้อและANDปี+ภาค+สาขา+สถานะ; Toggleไม่Fetchเพิ่ม ไม่เปลี่ยนคำค้น/Filters/total/Page. ตรวจล้างตัวกรอง/Unknown/หน้าแรกหลังเปลี่ยนFilterและการข้ามหน้าหากมีข้อมูลเพียงพอ.
- [ ] PendingมีAccept/Rejectในทั้งสองView ใช้SharedConfirmation/APIเดิมและเหตุผลRejectจำเป็น; Cancelไม่เขียนข้อมูล. Confirmed/rejectedไม่มีปุ่มตัดสินใจซ้ำ. หลังAcceptความสัมพันธ์CoopAdvisorและจำนวนรายการเปลี่ยนผ่านWorkflowเดิม.
- [ ] หลังตัดสินใจรายการ/totalถูกอ่านกลับตามเดิม; DoubleSubmit/StaleResponse/Sessionหมดอายุ/Empty/Error/Retry/Loadingไม่ถดถอย. FocusหลังConfirmationกลับปุ่มเดิมเมื่อยังอยู่ หรือStatusFilterเมื่อแถวถูกแทน.
- [ ] ตั้งCardต่างจากอีกสองเมนู แล้วกลับ/Reloadยังจำแยกกัน. ตรวจDesktop/Tablet/Mobile320/390, TableScrollภายใน, Keyboard/ARIApressed/StatusTextและFocusVisible.

## 3. นักศึกษาในความดูแล — #teacherStudents

- [ ] เริ่มCardและยังใช้Student Selection/Detailร่วมกับนัดนิเทศและผลนิเทศตามเดิม ไม่มีStudentList/Stateอีกชุด. Cardมีชื่อ/รหัส/สาขา/ปีภาคเมื่อมีข้อมูล/ปุ่มเดิม.
- [ ] Tableมี7คอลัมน์ นักศึกษา(ชื่อ+รหัส),สาขา,ปี/ภาค,บริษัท,พี่เลี้ยง+สถานะยืนยัน,สถานะนักศึกษา,จัดการ. รายชื่อมาจากlistAPIเดิม ไม่มีMock/เดาข้อมูลจากFiltersหรือวันที่.
- [ ] **Sourceล่าสุด11พ.ย.(Sorting):** listAPIเพิ่ม`academicPeriod`ของรอบที่ใช้เรียงจากStructuredPeriodจริงแล้ว จึงต้องแสดงปี/ภาคได้ก่อนเปิดDetailเมื่อมีข้อมูล; ไม่มีรอบที่ระบุได้ให้คงUnknown ไม่อนุมานจากรหัส/วันที่/Filter. ข้อนี้แทนข้อจำกัดปี/ภาคจากงานCard/Tableก่อนหน้า. บริษัท/พี่เลี้ยง/สถานะนักศึกษายังไม่อยู่ในlistDTO; ก่อนเปิดDetailคง“ไม่ระบุสถานะ”และข้อความเปิดรายละเอียดสำหรับบริษัท/พี่เลี้ยง. หลังเลือกนักศึกษา Detailเดิมเติมบริษัทและพี่เลี้ยง/Verifiedจริงให้แถวที่เลือก ไม่ใช้Unknownเป็นหลักฐานว่าข้อมูลในDBไม่มี.
- [ ] กดดูรายละเอียดจากCardและTableเข้าสู่Detailเดียวกัน/Studentเดียวกัน. เลือกเดิมซ้ำไม่ReloadจนDraftหาย; สลับViewอย่างเดียวไม่Fetch/clearDetail/เปลี่ยนSelection. Company/MentorของSelectedStudentตรงDetailจริง และไม่ค้างเป็นของคนอื่น.
- [ ] สร้างScheduleDraftและResultDraft/แนบภาพตามWorkflowเดิมโดยยังไม่ยืนยัน จากนั้นสลับCard/Table→Filters/Pagination→กลับเมนูเดิม: Stateที่Workflowเดิมรักษายังอยู่. การเปลี่ยนไปเลือกคนอื่นยังใช้Behaviorเดิม ไม่ย้ายDraftไปนักศึกษาอื่น.
- [ ] ค้นชื่อ/รหัส/บริษัทผสมปี+ภาค+สาขาตามBackendเดิม; Toggleคงคำค้น/total/Page ไม่Fetchเพิ่ม. ResetFilterกลับหน้า1; Empty/Error/Retry/Loading/Sessionguardคงเดิม. ตรวจหลายหน้าหากมีข้อมูลจริงเพียงพอ.
- [ ] ไปนัดนิเทศ/ผลนิเทศแล้วไม่เห็นViewToggleใหม่หรือTableในสองเมนูนั้น ใช้รายการและFormเดิม; กลับteacherStudentsคืนPreferenceโดยไม่mountDetailซ้ำหรือทำลายDraft.
- [ ] ตั้งTableแยกจากอีกสองเมนูแล้วกลับ/Reloadคืนค่า. ตรวจResponsive1280/768/390/320px, ScrollเฉพาะTableContainer, keyboardSelection/Focus, Verifiedใช้ข้อความร่วมกับสี และStudentOwnershipยังCoopAdvisorไม่ปนClassAdvisor.

## Shared preferences / accessibility / scope

- [ ] ViewKeysในlocalStorageได้แก่`fitm.teacher.list-view.coopApprovals`, `fitm.teacher.list-view.advisorRequests`, `fitm.teacher.list-view.teacherStudents`; ค่าเป็น`card`หรือ`table`เท่านั้น. SortKeysแยกตามหัวข้อSortingด้านล่าง; ทั้งสองชุดไม่เพิ่มToken/Password/StudentDataในStorage.
- [ ] ค่าPreferenceว่าง/ไม่รู้จัก/Storageอ่านไม่ได้เริ่มCardเงียบ ๆ. หากStorageเขียนไม่ได้ ยังสลับในหน่วยความจำได้สำหรับหน้าเปิดอยู่ แต่Reloadจะเริ่มCardเมื่ออ่านค่าไม่ได้; ไม่มีNativeAlert/ConfirmหรือConsoleexceptionจากPreference.
- [ ] SegmentedControlsอยู่ขวาของยอดบนDesktop มีไอคอน+รายการ/ตาราง, Active/hover/focus/disabledและaria-pressedถูกต้อง; มือถือจัดลงแถวใหม่โดยไม่ล้น. Tab/Shift+Tab/Enter/Spaceใช้ได้ และToggleยังมีFocusหลังเปลี่ยนView.
- [ ] ScreenReaderอ่านTableCaption/ColumnHeaders/RowHeaders/StatusText และLoading/Empty/Errorจากข้อความเดิมได้; RegionTableรับFocusและเลื่อนแนวนอนได้ด้วยKeyboard.
- [ ] Auth/JWT/OAuth/AdminEntry/RBAC/Sidebar9เมนู/StudentHeadStaffUIและข้อมูลเดิมไม่ถูกเปลี่ยนในงานนี้. ปัญหาSearch/Filterจากรอบก่อนยังต้องบันทึกเป็นผลผู้ใช้แยกจากผลViewToggle.

ผู้ใช้บันทึกผลพร้อมเมนู/View/Filter/Page/ขนาดหน้าจอ/ขั้นตอนและข้อความที่พบ โดยไม่ส่งTokenหรือข้อมูลส่วนบุคคล. **NEXT TASK: Manual Chrome Acceptance.**

## Academic year sorting — ทั้งสามเมนู (เพิ่ม11พ.ย.2026)

**ทุกข้อ PENDING USER TESTING.** Checklistเพิ่มนี้ไม่เปลี่ยนสถานะSearch/Filter/Card/Table/Dataset35คนเดิม และไม่อนุญาตCodexรันทดสอบ.

- [ ] เปิดแต่ละเมนูเมื่อไม่มีSortPreference→เลือก“ใหม่สุดก่อน”. ตั้งต่างกันทั้งสามเมนู→ไปกลับ/Reload→จำแยกกัน. Keys`fitm.teacher.list-sort.coopApprovals`, `.advisorRequests`, `.teacherStudents`มีเพียง`year_desc/year_asc`; ค่าว่าง/ไม่ถูกต้อง/อ่านStorageไม่ได้ใช้ใหม่สุดก่อน ไม่มีErrorหรือข้อมูลส่วนบุคคลที่เพิ่มในStorage.
- [ ] ใหม่สุด: ปีมาก→น้อย, ภายในปีภาค2→1, ปี/ภาคเดียวกันวันที่ล่าสุด→เก่าสุด, สุดท้ายIDเป็นลำดับคงที่. เก่าสุด: ปีน้อย→มาก/ภาค1→2/วันที่เก่า→ใหม่/IDคงที่. ตรวจข้ามรอยต่อหน้าเมื่อมีข้อมูลจริงเพียงพอ; ห้ามสรุปจากหน้าเดียวว่าข้ามหน้าถูกแล้ว.
- [ ] ข้อมูลไม่มีปีอยู่ท้ายทั้งสองทิศ ไม่อยู่ก่อนปี2567เมื่อเลือกเก่าสุด และไม่เดาปีจากรหัส/ชั้นปี/วันที่. Coopใช้submitted_at, Advisorใช้requested_at; Supervisedใช้submitted_atเฉพาะคำร้องที่ผูกStructuredPeriodจริง มิฉะนั้นไม่มีdatefallbackและใช้StudentID(UUID)เป็นTie-breaker.
- [ ] SupervisedStudentหลายรอบ: ปี/ภาคในCardและTableตรง`academicPeriod`ที่listDTOคืนและเป็นรอบแรกตามSortที่ตรงFilters/companysearch. เปลี่ยนSortอาจเปลี่ยนรอบที่ใช้แทนStudentนั้นได้ แต่ยังนับStudentหนึ่งคนครั้งเดียว ไม่เพิ่มResultCountหรือเปลี่ยนAssignment. ไม่มีN+1DetailRequestsเพื่อเอาปี/ภาค.
- [ ] คำค้น+ปี+ภาค+สาขา+สถานะเหมือนเดิม→เปลี่ยนSortจากหน้าถัดไป→กลับหน้า1/มีListGETใหม่หนึ่งรอบ/Queryส่งSortที่เลือก. totalเท่าเดิมเมื่อข้อมูลBackendไม่ได้เปลี่ยนระหว่างคำขอ. เปลี่ยนเฉพาะCard/Tableไม่Fetch ไม่resetPage/Sort/Filters/Total. Search/Filter/Clearยังทำงานร่วมกับSort.
- [ ] Dropdownปีมี“ทุกปี”ก่อนแล้วตัวเลขมาก→น้อยตามYearsMetadataของTeacher ไม่มีภาคฤดูร้อนหรือปีที่Frontendกำหนดเป็นชุดคงที่. หากมีปีอื่นจริงในscopeต้องเรียงถูกทั้งใหม่สุดและเก่าสุด (ทิศSortไม่เปลี่ยนลำดับDropdownปี).
- [ ] ขณะโหลดSort/Filter/PaginationและActionsถูกguardตามเดิม ป้องกันDoubleRequest/DoubleSubmit/Responseเก่าทับใหม่. ตรวจEmpty/Error/Retry/Sessionหมดอายุ และหลังActionsสำเร็จยังใช้Sortที่เลือก/Countsอ่านกลับเดิม.
- [ ] Table/Cardตรงกันทั้งสามเมนู, StudentSelection/Schedule/ResultDraft/Imagesไม่หายเมื่อเปลี่ยนSort; CoopDetailModal/AdvisorConfirmation/Approve→HeadReview/Reject/SupervisionWorkflowไม่เปลี่ยน. Scheduling/Resultsไม่มีSortControlเพิ่มจากPanelร่วม.
- [ ] Selectเรียงลำดับอยู่ใกล้Card/Table มีIcon/Label/SelectedState/Disabled/FocusVisible; Keyboardเลือกได้และFocusกลับSelectเมื่อโหลดเสร็จ. ตรวจ1280/768/390/320pxว่าToolbarไม่ล้นทั้งหน้าและTableยังเลื่อนเฉพาะContainer.

**Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: Manual Chrome Acceptance.**
