# Development Deployment Readiness — Coop Prerequisite Catalog IT/INE + Staff RBAC

วันที่ตรวจ: **7 พฤศจิกายน 2026 (Asia/Bangkok)**. Audit แรกเป็น **READ-ONLY AUDIT + DEPLOYMENT PLANNING**; execution ที่อนุมัติภายหลังบันทึกแยกในหัวข้อ19–21 ไม่ใช่คำอนุมัติติดตั้ง Development. ใช้ Working Tree ปัจจุบันเป็น Source of Truth. ผล20/20เดิมเป็น graph ก่อน Wave A ไม่ใช่ผลรัน suite ใหม่ในรอบปัจจุบัน.

**อัปเดตรอบ Resolve NO-GO Preconditions — 7 พฤศจิกายน 2026:** เพิ่ม Security Remediation, Backup/Restore Rehearsal และการ reconcile D01–D06 ในหัวข้อ15–18ด้านล่าง. เป็นแผนที่ตรวจ metadata/constraints/CLI options แล้ว ไม่ได้อัปเดต Dependencies หรือสร้าง Backup/Restore จริง. **NO-GO คงเดิม; ไม่มี Finding ที่ RESOLVED จากการจัดทำแผนเพียงอย่างเดียว.** หัวข้อ2/14เก็บ Git และการทำงานของรอบ Audit แรก; Git/ขอบเขตรอบล่าสุดอยู่หัวข้อ18.

**ประวัติผล Security Wave A — 7 พฤศจิกายน 2026:** หัวข้อ 19 แทนสถานะ plan-only เฉพาะ Wave A. Workspace/built artifact ใช้ 9 targets ใหม่, installed tree/audit ยืนยัน **13→4 Moderate / Critical0 / High0**, focused tests **34/34**. **D03 ยัง OPEN** เพราะ residual security และ runtime rollout ยังไม่เสร็จ. Running Backend ไม่ได้ Deploy. สถานะ Backup/Restore ถัดจากรอบนี้อ้างอิงหัวข้อ 20; ผล tests/audit ของ Wave A ไม่ได้รันใหม่ในงาน Backup.

**ประวัติผล Backup/Restore — 7 พฤศจิกายน 2026 เวลา 15:52 น. Asia/Bangkok:** fresh Backup/isolated Restore/preservation/cleanup ผ่านตามหัวข้อ20; D01 RESOLVED สำหรับ snapshot นี้. ข้อความ PLAN ONLY/NOT EXECUTED ในหัวข้อ9/16เป็นประวัติ. การอนุมัติ isolated Installer ถัดจากงานนี้อยู่หัวข้อ21 ไม่รวม Development/Staff Grants/Backend restart/Security deployment.

**สถานะล่าสุด — Isolated Installer Rehearsal + Security Disposition (7 พฤศจิกายน 2026 เวลา 16:40 น. Asia/Bangkok):** Restore ใหม่ครบ3clonesและ Installer จริงบน graph หลัง WaveA **PASS**, รวม rerun/drift/post-seed rollback/51-table preservation ตามหัวข้อ **21**. Auditใหม่ยัง4Moderate (prod2), runtimeยังเก่า; **D03/D06 OPEN และ Deployment NO-GO คงเดิม**. ไม่เปลี่ยน Source/dependencies/Development records หรือให้ Grant/Restart/Deploy.

## 1. Executive Summary

**Recommendation: NO-GO สำหรับติดตั้ง/เปิดใช้งานจริง ณขณะนี้** จนได้รับอนุมัติแยกและข้อยุติด้าน dependency security/installer/acceptance ที่ยังเหลือ. Backup/isolated Restore ผ่านแล้วตามหัวข้อ 20 แต่ต้องประเมิน freshness อีกครั้งเมื่อจะติดตั้งในอนาคต. Staff grant assignment ต้องอนุมัติรายบุคคลก่อนเปิดการจัดการ; ไม่จำเป็นต้องให้ Grant พร้อม DDL หากอนุมัติเฉพาะ Schema.

| หัวข้อ | ผล | หลักฐาน/ข้อจำกัด |
| --- | --- | --- |
| Development DB Identity | VERIFIED | intern_postgres / intern_system / PostgreSQL16.15; Environment development; read_only=on |
| Catalog Schema | Isolated restored install VERIFIED / Development NOT APPLIED | 3tables/seed10/Grants0 บน test clones ตามหัวข้อ21; metadata Development ล่าสุดหัวข้อ20 ไม่มีCatalog และงานนี้ไม่เขียนฐานจริง |
| Legacy Compatibility | PARTIAL | Sourceและผลisolatedเดิมรองรับ; live requests/snapshots/reviewsอย่างละ0 จึงไม่ใช่ real legacy acceptance |
| Staff RBAC | PARTIAL | Enforcementและisolated20/20ตรวจแล้ว; live Staff active2ราย แต่ไม่มีGrant schema/ยังไม่เลือกผู้รับสิทธิ์ |
| Installer Safety | Rehearsal VERIFIED / D06 OPEN | Guard/rerun/drift/partial-input/post-seed rollback ผ่านบน restored clones; ไม่ใช่ full drift certification/postcommit undo/operational signoff |
| Backup/Restore | VERIFIED — D01 RESOLVED สำหรับ snapshot นี้ | Fresh custom Backup/TOC/SHA/isolated Restore/51-table preservation ผ่าน; scope/retention/coverage limits ดูหัวข้อ 20 |
| Dependency Security | Wave A VERIFIED / D03 OPEN | Auditใหม่0Critical/0High/4Moderate, prod2; artifact treeตรงWaveA/runtimeเดิมยังไม่Deploy ดู disposition หัวข้อ21 |
| Deployment Readiness | PARTIAL — NO-GO NOW | รอ explicit approval/security disposition/installer gates; Browser/realaccount acceptance ยัง NOT TESTED |

**Development installation: NOT APPLIED BY THIS WORK. Staff Grants: NOT ASSIGNED.** Installer รันเฉพาะ restored test containers ตามหัวข้อ21; ไม่มีSQL writes ไปDevelopment/db:init/reset/sync/force หรือBackend restart/deploy. Intentional drift DDLอยู่เฉพาะtest cloneแยก ไม่ใช่Source/Development Schema change.

## 2. Current Source / Git State

Baseline `aaebbb6`: **3modified / 1untracked / 0deleted**. งานค้างที่ต้องรักษา: `HANDOFF_fitm-intern.md`, `README.md`, `backend/src/db/coopPrerequisiteCatalog.js` modified และ `backend/test/coopPrerequisiteCatalogPostgres.test.js` untracked. Diff baselineมี91insertions/4deletionsใน3trackedfiles; ไม่รวมtestที่untracked. ไม่Restore/Reset/Clean/Stash/Commit/Push.

รอบAuditเพิ่มเฉพาะรายงานนี้ และแก้README/Handoff. เก็บ SHA-256 baseline817ไฟล์ก่อนแก้เอกสารเพื่อตรวจpreservation; Installer/Test/Models/Frontend/manifest/lockfile/Auditเดิมคงเดิม. หลังงานคาดหมายและตรวจจริง **3modified / 2untracked / 0deleted**; testเดิมยังuntracked, รายงานนี้เป็นuntrackedเพิ่มหนึ่งไฟล์.

Workflowปัจจุบันเป็นmodel-driven explicit initialization ไม่มีmigration runner/ledgerใหม่. `backend/src/db/coopPrerequisiteCatalog.js` เป็นexplicit transactional installer; `app.js` startupเรียกauthenticateเท่านั้น ไม่เรียกsyncหรือinstaller. ไม่ใช้คำสั่งmigration/UmzugจากประวัติREADMEเก่า.

### API Contract จาก Source ปัจจุบัน

| Endpoint | Contract |
| --- | --- |
| GET `/api/coop-requests/prerequisite-catalog` | live Student/co_op, ใช้savedmajor; `{success,data:{program,revision,source,grade_options,courses}}`, no-store; ไม่มีschemaใช้legacy-v1 |
| POST `/api/coop-requests` | optional `prerequisite_catalog_revision`; activecoursesครบ/ไม่ซ้ำ/programตรง; Serverเลือกcourse names/gradesเป็นsnapshot; catalogchange409มีcodeแยก |
| GET `/api/staff/coop-prerequisite-catalog/permissions` | JWT/liveactiveStaff; `{permission,programs}` ตามexactactivegrants; schemaยังไม่ติดตั้งตอบ409; หลังติดตั้งStaffไม่มีgrantได้200+programs[] |
| GET `/api/staff/coop-prerequisite-catalog?program=IT` | activeStaff+exactpermission+programgrant; `{program,revision,courses}` รวมinactive; ไม่มีgrant403 |
| POST `/api/staff/coop-prerequisite-catalog` | program/code9digits/name/optionalEnglish/booleanactive/order0–10000/expectedrevision; success200; malformed400/forbidden403/duplicateหรือstale409 |
| PATCH `/api/staff/coop-prerequisite-catalog/:id` | courseversion+sourceexpectedrevision; ต้องsourceและtargetgrantเมื่อย้าย; missing404; ไม่มีDELETE/self-grantendpoint |

Staff adapterใช้POST/PATCHตรงrouter; formส่งrevisionของสาขาที่กำลังแสดงและcourseversionเมื่อแก้, เลือกtargetได้ตามcapabilities. Student adapterและsubmitส่งrevision; callerเก่าที่ไม่ส่งยังตรวจactive-list, detailยังใช้snapshotfieldsเดิม. Source verificationเท่านั้นรอบนี้ ไม่เรียกprotectedHTTPของบัญชีจริง. UI/normal-login/save+reload/responsive **NOT TESTED**.

## 3. Isolated Integration Evidence

หลักฐานรอบก่อน: PostgreSQL16.15ในcontainerแยก Network=none/Ports={}/Mounts=[]/dataในtmpfs, finalDB `fitm_catalog_test_20261107_image`, `NODE_ENV=test`; builtimage `fitm-catalog-verified-backend:20261107` รัน **20/20 (19subtests+parent), fail0/skip0, exit0, 6.47s**. Containerทดสอบcleanupแล้ว ไม่มีการนำFixture/Grantsเข้าฐานจริง.

ตรวจSHA-256ใหม่แบบไม่รันทดสอบ: Sourceกับartifactตรงกันทั้ง3ไฟล์:

| ไฟล์ | SHA-256 |
| --- | --- |
| Installer | `20218a0cc720d4ac8e6c4cb9c9f022332b7370c63b3010e406fe54d91618ed9d` |
| Focused test | `beb48c0ee6f47dc236a444e9e919284df0d7eadc3391eb536359b72b8c98576a` |
| Backend lockfile | `94f3c2b94d1bd1296fa56b82f75fed6d5bc889073490ce6001801341486f49a5` |

Coverageเดิมรวมinstall/rerun/seeds0onrerun/DDL+seedfailure rollback/CHECKNOTVALID+drift/partial schema/PK/FK/unique/unsafe-targetguard, liveJWT+Staffrevocation/IT–INEscope, CRUD/duplicate/crossprogram/concurrent409, validgrades/F+passed400 และsnapshotเดิมรวมfree-text/Fไม่เปลี่ยน. Unsafe targetเป็นsynthetic pre-connection proof ไม่ลองเขียนฐานต้องห้ามจริง. ผลนี้เป็นprior isolated evidenceที่reviewแล้ว ไม่ใช่การรับรองliveDB/browser/securityทุกกรณี.

## 4. Development Database Identity — VERIFIED

| รายการ | ค่าที่ตรวจจริง |
| --- | --- |
| Container / ID | `intern_postgres` / `5b9efb955cf41e0890b6e669a879f98f5abcef99a0bfde82f89d7e953098c0eb` |
| Image / Docker network | `postgres:16-alpine` / `fitm-intern_default` |
| Host publication | `127.0.0.1:5432 → 5432/tcp` |
| Backend Environment / DB Host | `development` / `postgres:5432` จากrunningprocessenv เฉพาะnon-secretfields |
| Database / Version | `intern_system` / `16.15` |
| Schema / Search path | `public` / `"$user", public`; effective schemas=`pg_catalog,public` |
| Storage | namedvolume `fitm-intern_postgres_data` mounted `/var/lib/postgresql/data`; อ่านidentityเท่านั้น ไม่แก้volume |
| Connection evidence | ครั้งแรกใช้Unixsocketจึงinetaddress/portเป็นNULL; ตรวจTCPซ้ำภายในcontainerได้`127.0.0.1:5432` |
| Migration metadata | ไม่พบpublictableชื่อSequelizeMeta/migration/Umzugจากcatalogquery; ไม่ได้อ้างว่าตรวจทุกschemaทั่วcluster |

ทุกSQLsessionใช้`BEGIN READ ONLY` หรือ`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, จำกัดstatementtimeout15s และจบ`ROLLBACK`; sessionแรกเพิ่มlocktimeout3s. อ่าน`transaction_read_only=on`ทั้งต้นและท้าย. Modelcomparisonผ่านpgclientใช้transactionแบบเดียวกัน ไม่มีSequelizeinitializer/inspectorที่สร้างprobe relation. ขณะqueryพบotheropen transactions0/ungrantedlocks0 เป็นpoint-in-time ไม่รับรองdeploymentwindowในอนาคต.

## 5. Existing Schema Comparison

| ส่วน | Developmentจริง | Sourceที่เตรียมติดตั้ง |
| --- | --- | --- |
| Catalog Programs | ไม่มี | 4columns:programPK/revision/created_at/updated_at; revision>0, IT/INE |
| Catalog Courses | ไม่มี | 11columns; UUIDPK, ProgramFK+nullableStaffeditorFK(RESTRICTdelete/CASCADEupdate), unique(program,code), code9digits/name/order/versionCHECK |
| Catalog Grants | ไม่มี | 7columns; UUIDPK, Staff+ProgramFK(RESTRICTdelete/CASCADEupdate), unique(staff,permission,program), exactpermission/programCHECK |
| Snapshot program/code | legacyallowlistCHECKvalidated ครบ10codesตรงSourceCATALOG | เพิ่ม/validateformatCHECK IT/INE+9digits แล้วdropเฉพาะlegacyallowlistCHECK; ไม่มีrowrewrite |
| Snapshot status/grade | CHECKvalidated; passedต้องnonblankgrade, studying/unselectedgradeNULL | คงเดิมเพื่อlegacy; whitelistใหม่/F+passedตรวจvalidator/modelสำหรับnew/changedgrade-status |
| Snapshot identity | UUIDPK/FKrequestCASCADE/unique(request,code); ไม่มีFKไปCatalog | คงเดิม ไม่cascadeแก้snapshotตามCatalog |
| Review history | actorCHECKvalidated; reason/transitionCHECKยังNOT VALIDตามSource | Installerนี้ไม่แตะReviewSchema/Records |

อ่าน4ตารางที่เกี่ยวข้อง (`coop_requests`, snapshots, reviews, department_staffs) พบ18constraints/11indexes. เปรียบเทียบregisteredModelsกับ3ตารางคำร้อง **39column type/nullability + 8FK/actions/validation + 6declaredindexes ไม่มีmismatch**. เป็นfocusedcomparison ไม่ใช่fullschema/defaults/allconstraintcertification. คอลัมน์ชื่อpassword_hashอ่านเฉพาะmetadata ไม่มีการSELECTค่าhash/ชื่อ/Email/UUIDของบัญชีจริง.

## 6. Legacy Data Compatibility — PARTIAL

| Aggregate | จำนวนจริง |
| --- | --- |
| Coop Requests / Prerequisite snapshots / Reviews | **0 / 0 / 0** |
| Students | **7**: IT3 / INE3 / majorNULL1 / other0 |
| Snapshot invalidnewformat / blankname / nullrequired / badstatus-grade | **0** ทุกกลุ่ม เพราะsnapshottableว่าง |
| Snapshot duplicate(request,code)groups / orphan snapshots / orphan reviews | **0 / 0 / 0** |
| passed+F / passedlegacytext / passedNULLgrade | **0 / 0 / 0** เพราะไม่มีrows |
| Review reasonviolations | **0** เพราะไม่มีrows; 2NOT VALIDconstraintsยังไม่validateโดยงานนี้ |

ไม่ส่งrow-levelfields, gradefree-textจริง, accountIDsหรือตัวตนลงรายงาน. ไม่อนุมานว่าเกรดผิดไม่มีทางเกิดจากจำนวน0. ไม่มีrealhistoricalrowsให้ตรวจdisplay/compatibility; อาศัยSourceและpriorfixturesที่มีF/free-textและactualPOSTsnapshotเท่านั้น.

Snapshotreadใช้fieldsที่บันทึกไว้ ไม่มีCatalogJOINหรือFK. CatalogsaveเขียนเฉพาะCatalogcourse+Programrevision. Installerไม่มีUPDATEsnapshot/Student/Request/Reviewหรือnormalization. Formใหม่ใช้A/B+/B/C+/C/D+/D/F แต่rejectF+passed; legacyreadไม่เรียกnormalizeNewCourseGrade. Modelvalidateเฉพาะnewrecordหรือgrade/statusเปลี่ยน. APIresponsefieldsเดิมคงอยู่ โดยเพิ่มcatalogendpoint/optionalrevisionและteacherassociationเฉพาะreviewread.

นักศึกษาmajorNULL1รายจะยังไม่ได้CatalogIT/INEตามguardเดิม ต้องแก้ผ่านowner/profileหรือกระบวนการที่มีสิทธิ์เมื่อได้รับมอบหมาย ห้ามเลือกสาขาให้เองในdeployment. ไม่แก้A01/ClassAdvisorหรือacademiceligibility.

## 7. Staff RBAC Readiness — PARTIAL

LiveDevelopmentมีDepartmentStaff **2ราย active2/inactive0**. ไม่อ่านรายชื่อ/Email/UUID. ไม่มีCatalogGranttable จึงยังไม่มีpersistedCatalogprogramscopeให้ตรวจ; **ไม่ใช่การสรุปว่าIT/INEstaffแต่ละคนควรได้สิทธิ์ใด** และไม่ใช้departmenttextเดา.

Sourcechain=`authenticateToken` (signature/liveactor/accountchecks) → `createRequireDepartmentStaff` (actor/role/staffidentity/liveactive) → Catalogservice `activeStaff` + activegrantที่exactpermissionและprogram. ทั้งsource/targetต้องgrantเมื่อย้าย. Backendตรวจใหม่ทุกoperation ไม่มีself-grant/defaultgrant. Student/Teacherถูกrejectก่อนถึงmanagementrouter. InstallerseedเฉพาะPrograms/CoursesและคืนgrantsAdded0.

**PENDING USER APPROVAL:** เลือกStaffUUIDจริงผ่านช่องทางoperatorที่เหมาะสม พร้อมscopeIT/INE/ทั้งสองและผู้อนุมัติ ก่อนprovision. ไม่เก็บUUID/credentialsในAuditนี้. ไม่มีgrantทำให้management403หลังติดตั้ง; capabilitiesคืนemptyprogramsสำหรับactiveStaffตามcontract. ไม่มีschemaตอบ409ตามfail-closedguard. RealStafflogin/permissionacceptance **NOT TESTED**.

## 8. Installer Safety Review — PARTIAL

| Preconditions / Behavior | Source evidence / ขอบเขต |
| --- | --- |
| Additive | เพิ่ม3ตาราง/2Programs/10seedcourses แต่**ไม่ใช่pureadditive**: replacefixed-codeCHECKด้วยformatCHECKที่กว้างขึ้น; ไม่ลบtable/row |
| Targetbeforewrite | NODE_ENVdevelopmentหรือexplicitisolatedtestopt-in; dialectpostgres/configDB=expectedDB/localhostหรือDockerpostgres/port5432; ในtransactionตรวจcurrent_databaseและPGmajor16ก่อนDDL |
| ExistingSchema | tablepresenceต้อง0หรือ3; partialปฏิเสธ; columnset/type/nullability/PK/FK/actionsและnameduniqueindexshapeตรวจจากmetadata |
| CHECK / Index | namedwrongCHECKให้PGparse/deparseprobeเทียบexpressionแล้วrollbackเมื่อไม่ตรง; matchingNOTVALIDvalidate; uniqueindexต้องvalid/ready/fulltable/plaincolumns |
| Rerun | Programrowเป็นseedmarker; ไม่reseededited/inactivecourses; missingexpectedindex/CHECKสามารถเพิ่มในtransaction; mismatchingnameddefinitionsปฏิเสธ |
| Transaction / Locks | managedtransaction; advisoryxactlock624061106; locktimeout5s/statementtimeout60sต่อstatement; ALTERCHECKมีtablelock จึงต้องdeploymentwindowไม่มีwriteชน |
| Partialfailure | firstfailure rollback3tables/index/CHECK/seedsในtransaction; priorisolatedพิสูจน์missingtableและinjectedseedfailure |
| Legacy / Grants | ไม่มีrowUPDATElegacyหรือdefaultgrant; replacementCHECKvalidateก่อนdroplegacyCHECK |
| Postverification | ใช้read-onlymetadata/counts/fingerprints ไม่ใช้Installerเป็นread-onlyinspectorเพราะrerunยังทำprobeDDL |
| หลังCOMMIT | ไม่มีautomaticundo; rerunไม่restoreข้อมูลก่อนแก้. ต้องforwardrecoveryที่อนุมัติแยก ไม่reset/restoreทับliveทั้งฐาน |

**ข้อจำกัดที่ต้องรู้ (ไม่แก้Codeรอบนี้):** FKcomparisonอาศัยdefinitionข้อความ ไม่ตรวจFKconvalidated/deferrability/extraFKsทั้งหมด; ไม่comparedefaultsหรือทุกindexoption/trigger/schemaowner. LegacyCHECKguardตรวจว่ามี10codesครบ ไม่ใช่semanticproofของarbitraryexpression. CurrentDevelopmentไม่มีCatalogtablesและlegacydefinitionที่อ่านตรงallowlistจริง จึงไม่พบdriftกรณีเหล่านี้ในtargetปัจจุบัน. ต้องยืนยันpublic/searchpath/identity/schemaซ้ำก่อนรันในงานที่ได้รับอนุมัติ; Localalias+DBnameไม่ใช่clusterfingerprint/backupหรือauthorizationจากผู้ใช้.

## 9. ประวัติ Backup / Restore Checklist — ก่อน execution (ผลจริงหัวข้อ 20)

ตรวจแล้ว: `pg_dump`, `pg_restore`, `psql` **16.15** ตรงserver16.15. Path `.local-db-backups/` มีอยู่และGit-ignore; WindowsACLปิดinheritanceและอนุญาตFullControlเฉพาะCURRENT_USER/SYSTEM/ADMINISTRATORS ไม่มีOTHER. ไม่อ่านbackupcontents/credentials และไม่ถือว่าarchiveเก่าหรือreceiptเก่าทดแทนbackupรอบdeployนี้.

| ขั้นตอนก่อนติดตั้งที่ต้องรออนุมัติ | Acceptance / Safety |
| --- | --- |
| 1. ยืนยันTarget/Artifact/Window | containerID/database/version/searchpath/sourcehashตรงAuditหรือทบทวนใหม่, ตรวจin-flightwriters/locks; หยุดเมื่อidentityต่าง |
| 2. เตรียมprivatepath | `.local-db-backups/coop-catalog/` (ยังไม่สร้าง); ตรวจdiskspace/ACLสืบทอดprivatepermissionsก่อนเขียน |
| 3. Freshbackup | ชื่อ `intern_system_before_coop_catalog_YYYYMMDD_HHmmss_BKK_<revision>.dump`, PG16customformat/fullDBconsistentdump; เก็บidentity/sourcehash/toolversion/เวลารับรองในprivate receipt ไม่มีsecrets |
| 4. Exportbinaryอย่างปลอดภัย | ให้pg_dumpเขียนfileในprivatecontainerstagingแล้วdocker cpแบบbinaryไปprivatepath; **ไม่pipebinarydumpผ่านPowerShelltextredirection**; ไม่พิมพ์contentsออกchat/log |
| 5. Integrity | pg_dumpexit0, archiveไม่ว่าง, SHA-256, `pg_restore --list`สำเร็จ; TOCไม่ใช่restoreproof |
| 6. Restoretest | PostgreSQL16containerใหม่ แยกnetwork/nohostports/noDevelopmentvolume; freshDBชื่อtestที่อนุญาต. `pg_restore --exit-on-error --single-transaction --no-owner --no-acl` ไปฐานว่างใหม่เท่านั้น ไม่ใช้clean/createเพื่อทับฐานเดิม |
| 7. Verifyrestoredcopy | schema/constraints/indexes/countsและprivatefingerprintsเทียบกับbackupsnapshotที่สอดคล้องกัน; ถ้ามีwritersต้องจัดconsistentwindow/snapshot ไม่เทียบคนละเวลาโดยเดา |
| 8. Rehearsal | เมื่ออนุมัติทดสอบwriteเพิ่ม จึงรันInstallerบนrestoredisolatedcopy พร้อมpreservationchecks; opt-inintegrationtestปัจจุบันรับเฉพาะemptyDB จึงไม่ใช้รันทับrestoredDB |
| 9. Deployonlyaftergates | backup+restoreผ่านและoperatorอนุมัติแล้ว จึงรันexplicitCataloginstallerครั้งเดียวตามapprovedtarget; ไม่init/reset/syncหรือdeployscriptที่ทำgitpull/recreateโดยไม่จำเป็น |

**Rollback decision points:**

1. ก่อนwrite: backup/restore/identity/schema/securityapprovalไม่ผ่าน → หยุด ไม่มีการติดตั้ง.
2. ก่อนCOMMIT: CHECK/seed/timeout/schemaerror → managedtransactionROLLBACK; ตรวจmetadata/countsเท่าก่อนงานและหยุดสอบสวน ไม่retryสุ่ม/force.
3. หลังCOMMITก่อนเปิดสิทธิ์: หากverificationไม่ตรง ให้พักเฉพาะworkflowที่ได้รับผลกระทบตามmaintenanceprocedureที่อนุมัติ; เก็บCatalog/Requests/Snapshotsไว้. ไม่อ้างว่ามีfeatureflagที่Sourceไม่มี. ตรวจและอนุมัติforwardfixเฉพาะจุด.
4. หลังเริ่มมีการใช้Catalog: เก็บnewCatalog/newSnapshotทุกแถว; ไม่ลบ3ตาราง/คืนfixed-codeCHECKอัตโนมัติ เพราะคำร้องใหม่อาจมีcodeนอกallowlist. การกลับApplicationartifactต้องพิสูจน์read/writecompatibilityก่อน. หากต้องrecoveryจากbackup ให้restoreไปฐานแยกเพื่อเปรียบเทียบ/วางtargetedrepairที่อนุมัติ ไม่ทับทั้งliveDBเป็นrollbackปกติ.

**Post-deployment read-only checklist (ยังไม่ทำ):** ตรวจ3tables/22columns/3PKs/4FKs/2uniqueindexes/3CatalogCHECKs+1snapshotformatCHECKvalidated; legacyfixedCHECKถูกแทนแล้ว; Programs2/Courses10/Grants0สำหรับfirstinstallตามtargetปัจจุบัน. Comparebefore/afterbusinesscounts+privatefingerprintsทั้งrequests/snapshots/reviews/Student/Staff; ตรวจไม่มีprobeconstraints/sideeffects. จากนั้นเมื่อมีgrantapprovalจึงprovisionเฉพาะmappingที่อนุมัติและทำscopedHTTP/browseracceptance. ไม่สร้างบัญชีจริงหรือself-grantเพื่อให้ทดสอบผ่าน.

ไม่มีการสร้างBackup/Restore/Receipt/Directoryเพิ่มในรอบนี้. **NOT TESTED** ทั้งfresharchiveintegrity/restore/rehearsal/postinstall/recovery; เป็นdeploymentgatesที่ต้องดำเนินงานแยก.

## 10. Dependency Security Findings

รัน **read-only** `npm audit --json --package-lock-only --ignore-scripts` ในverificationimage; exit1เพราะadvisories ไม่ใช่network/auditfailure. SHA-256lockfileตรงSourceและrunningBackend. ไม่install/reinstall/auditfix/upgrade/ลบlockfile. Auditนี้ครอบคลุมBackendlockfile ไม่ใช่Frontend/NLP/OS/fullsecurityscan.

ผลnpmเป็น**13 vulnerable package entries** รวมinheritedmeta-vulnerabilities ไม่ใช่13Criticalหรือ13การโจมตีที่พิสูจน์แล้ว: **Critical1 / High5 / Moderate7 / Low0**. มี5direct/8transitive; ตามlockflag **10production / 3development** (prod1critical/4high/5moderate; dev1high/2moderate). รายการviaมี32uniqueadvisoryURLs; ไม่บวกseverityหลายadvisoryซ้ำเป็นpackageใหม่. CurrentDockerfileใช้npm installและCMDdev จึงติดตั้งdevtoolsด้วย; devclassificationไม่แปลว่าแพ็กเกจถูกลบจากDevelopmentimage.

| Package / Locked version | Severity | Direct/Transitive; scope | Advisory / Fix availability / Risk |
| --- | --- | --- | --- |
| body-parser2.3.0 | High | Transitive viaExpress; prod | [Compressed-bodyDoS](https://github.com/advisories/GHSA-27r3-jxmh-p828); patched2.4.0; npmfixAvailable=true; ต้องทดสอบparser/errorhandling |
| brace-expansion5.0.9 | High | Transitive viaNodemon→Minimatch; dev | [Quadraticexpansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [nestedgroups](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p); affectedbranchpatched5.0.12ครอบคลุมrangesที่รายงาน; fixAvailable=true |
| express-rate-limit8.2.1 | High | Direct; prod | [IPv4-mappedIPv6](https://github.com/advisories/GHSA-46wh-pxpv-q5gq); ownadvisorypatched8.2.2 แต่inheritedip-addressยังต้องแก้ทั้งtree ไม่อ้างว่า8.2.2ปิดครบ; fixAvailable=true |
| ip-address10.0.1 | High | Transitive viaexpress-rate-limitที่pin10.0.1; prod | [IPv4leadingzeros](https://github.com/advisories/GHSA-mwp4-54f8-5fhr), [latestreportedrange](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5); รวม6advisoriesXSS/addresschecks/DoS; ล่าสุดpatched10.7.4. Parentpinต้องตรวจด้วย; fixAvailable=true |
| minimatch10.2.6 | Moderate | Transitive viaNodemon; dev | [GlobpartsDoS](https://github.com/advisories/GHSA-g3hv-75wg-m249); patched11.0.1เป็นmajorchange. npmเสนอnodemon3.1.11พร้อมisSemVerMajor=true ไม่ใช่ยืนยันupgradesafe |
| moment2.30.1 | Moderate | Transitive viaSequelize; prod | [Non-stringlocalePathTraversal](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw); patched2.31.0; fixAvailable=true; ไม่พบcallerส่งlocalefromCatalog แต่ไม่ได้traceทุกpath |
| multer2.0.2 | High | Direct; prod | รวม9advisoriesuploadDoS/filterrace/limits; [latestasyncfilterDoS](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)patched2.5.0; fixAvailable=true; ต้องทดสอบuploadworkflowsแยก |
| nodemailer10.0.10 | Moderate | Direct; prod | รวม5advisoriesaddressparser/SMTPregex; [nestedcomment](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8)patched10.1.4ครอบคลุมreportedranges; fixAvailable=true; ต้องSMTP/addressregression |
| nodemon3.1.14 | Moderate | Direct; dev | inheritedminimatch; npmเสนอ**downgrade3.1.11** นอกdeclared`^3.1.14`, flagisSemVerMajor=trueแม้versionmajorยัง3. ไม่ทำอัตโนมัติ |
| proxy-addr2.0.7 | **Critical** | Transitive viaExpress; prod | [Trust-subnetIPspoofing](https://github.com/advisories/GHSA-jqcg-44mw-7w3h); patched2.0.8; fixAvailable=true; exploitabilityขึ้นกับtrust-proxyconfiguration |
| qs6.15.3 | Moderate | Transitive viaExpress/body-parser; prod | รวม3advisoriescommaarrays/isBuffer/stringifyDoS; [latestreportedrange](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw)patched6.16.1; fixAvailable=true |
| sequelize6.37.8 | Moderate | Direct; prod | inheriteduuid; npmเสนอ**3.30.0** (majordowngrade) ไม่ใช่safeSequelize6fix. ต้องวางcompatibleupstream/overridesplanพร้อมtestsแยก |
| uuid8.3.2 | Moderate | Transitive viaSequelize; prod | [Bufferboundsv3/v5/v6](https://github.com/advisories/GHSA-w5hq-g745-h8pq); patched11.1.1สำหรับbranchที่อ้าง; npmเสนอparentSequelize3.30.0. ไม่เปลี่ยนCJS/APIโดยไม่มีreview |

Patchedversionsเป็นข้อมูลadvisoryที่อ่าน ไม่ใช่คำสั่งupgradeหรือรับรองว่าupgradeนั้นปิดทุกissueในdependencytree. `fixAvailable=true`ไม่ได้รับรองว่าไม่มีbehaviorchange; ต้องตรวจresolvedlockfileและfocusedregressionใหม่ในงานsecurityที่อนุมัติ.

### Reachability / ข้อสรุปที่ไม่ควรเกินหลักฐาน

- Source `app.js` ไม่ตั้งtrustproxy; defaultExpressเป็นfalseจากruntimecheckแบบno-server. Criticalproxy-addradvisoryต้องอาศัยtrustsubnetconfigurationบางแบบ จึง**ไม่พบหลักฐานว่าexploitได้ในconfigurationปัจจุบัน** แต่packageยังaffectedตามlockfileและอาจเสี่ยงเมื่อเปลี่ยนproxyconfiguration. ไม่markresolvedหรือเปลี่ยนseverityเอง.
- express.jsonอยู่บนrequestpath; rate-limitใช้อยู่ในauth/role routes. จึงต้องreviewbodyparser/ratelimitเป็นพิเศษก่อนdeploymentsignoff แต่ไม่มีการยิงPoC/DoSใส่บริการจริง.
- Catalogใช้nodecrypto.randomUUID/newUUIDmodeldefault; uuidadvisoryระบุv3/v5/v6externalbuffer ขณะที่Sequelizeutilityที่อ่านเรียก`require('uuid').v4`ผ่านตัวแปรuuidv4 (และv1สำหรับUUIDV1). เป็นlimitedstaticreachabilityลดข้อสันนิษฐาน ไม่ใช่proofของทุกโมดูล/ทุกtransitivecaller.
- Multer/Nodemailerอยู่คนละbusinessworkflowแต่รวมในBackendartifact; ไม่แก้Profile/Mentor/upload/emailในงานนี้. Browser/proxy/SMTP/exploitE2Eและfullthreatmodel **NOT TESTED**.

## 11. Risks / Blockers — 6 Readiness Findings

รายการ D01–D06 เป็น readiness findings ของ Audit นี้ แยกจาก package entries และ A01–A14 เดิม. อัปเดตตามผล execution ในหัวข้อ19–21; ไม่ถือว่าได้อนุมัติ Development deployment.

| ID | Finding / Evidence | ผลต่อDeployment / ขั้นตอนที่รอ |
| --- | --- | --- |
| D01 | **RESOLVED สำหรับ rehearsal snapshot 7 พ.ย. 2026 15:48:44 น. Bangkok** — Backup/Restore/preservation/cleanup ผ่านจริง | ผลละเอียดหัวข้อ 20; ต้องประเมิน fresh backup/retention อีกครั้งก่อน DDL ในอนาคต ไม่รวม Installer rehearsal |
| D02 | ActiveStaff2 แต่CatalogGranttableยังไม่มี/ผู้รับscopeยังไม่เลือก | **Activationgate**: PENDING USER APPROVALสำหรับStaffUUID+IT/INE; ไม่บล็อกschema-onlyถ้าอนุมัติแยกชัดเจน |
| D03 | **OPEN** — fresh audit0C/0H/4M (prod2M), installed artifactตรงWaveA แต่ runtimeยังเก่า | **Security signoff gate:** dispositionหัวข้อ21เสนอ mitigation/WaveB; risk owner/acceptance/approved rolloutยังไม่ครบ ไม่ Deployในงานนี้ |
| D04 | StudentmajorNULL1/7 | จำกัดreadinessบัญชีนั้น; ยืนยันผ่านworkflowที่มีสิทธิ์ ไม่เดาสาขา/แก้บัญชีในDDL |
| D05 | Reallegacytablesว่าง, Review2CHECKNOTVALID, realaccount/browseracceptanceยังไม่ทำ | ข้อจำกัดการรับรอง; fixturecoverageไม่แทนข้อมูลจริง. ไม่validate/normalizeย้อนหลังเอง; กำหนดacceptanceก่อนเปิดใช้ |
| D06 | **OPEN — rehearsal subcriteria VERIFIED**: restored install/rerun/8drifts/post-seed rollback/51-table preservationผ่าน | ขอบเขต drift guardsยังไม่ใช่fullcertification; ต้องยืนยัน DDL lock window/forward recovery/operational signoff; ไม่มีpostcommitundo. ไม่ใช้rerunเป็นreadonlyprobe |

**BLOCKED:** ไม่มีการอ่านDevelopmentmetadataที่ติดขัดด้านconnection/permission. สิ่งที่ห้ามทำในรอบนี้จัดเป็นNOT TESTED/PENDING APPROVAL ไม่เดาผลสำเร็จ. การติดตั้งจริงเป็นNO-GOเพราะpreconditionsยังไม่ครบและยังไม่มีexplicitdeploymentauthorization.

## 12. Deployment Preconditions

- [ ] อนุมัติแยกโดยระบุ Development target/ขอบเขต DDL; Backup/Restore และ isolated Installer rehearsal ได้รับอนุมัติแล้วเฉพาะ test targets ไม่ใช้ผล Audit เป็นสิทธิ์ติดตั้งจริง.
- [x] D01: custom Backup+SHA/TOC+isolated Restore+preservation checks ผ่านจริงสำหรับ snapshot ในหัวข้อ 20; freshness ณวัน DDL ยังต้องประเมินใหม่.
- [ ] D03: dependencysecuritydispositionพร้อมผู้รับผิดชอบ; ไม่ใช้auditfixforceหรือmajordowngradeอัตโนมัติ.
- [ ] อ่านGit/sourcehash/identity/searchpath/legacyCHECK/tablepresence/locksใหม่ก่อนwrite; หยุดถ้าtargetเปลี่ยน.
- [ ] ยืนยันwindowและrecoverydecisionpoints; ห้ามreset/restoreทับliveทั้งฐานเป็นrollbackปกติ.
- [ ] สำหรับเปิดStaffmanagement: D02mappingและrealStaffacceptance/Browserได้รับอนุมัติ; แยกschema-onlyกับgrantactivation.
- [ ] รับทราบD04/D05/D06และไม่ขยายไปแก้A01/Profile/Mentor/นโยบายIdentityเอง.

## 13. Go / No-Go Recommendation

**NO-GO NOW สำหรับ Development installation/activation.** Backup/Restoreหัวข้อ20และ restored Installer rehearsalบน WaveA graphหัวข้อ21ผ่านแล้ว แต่ Security/operational/approval/acceptanceยังไม่ครบ. ไม่ได้รัน full20/20 RBAC/CRUDใหม่; ตาราง legacy ว่างยังไม่พิสูจน์ historical behavior. ไม่มีการอนุมัติติดตั้งจริงจากผลตรวจเหล่านี้.

ผลAuditแม้เปลี่ยนเป็นGOภายหลังก็ห้ามติดตั้งอัตโนมัติ. แยกคำอนุมัติSchema/Backup/Restore/Grant/Acceptanceตามขอบเขต ไม่มอบสิทธิ์บัญชีจริงเพื่อให้testผ่าน.

## 14. ประวัติ Proposed Next Steps / Final Verification — ก่อน Wave A / Backup execution

**NEXT TASK: Deployment Approval / Development Migration (explicit Catalog installer)** — ให้ผู้ใช้พิจารณารายงานนี้และกำหนดงานbackup/isolatedrestore+rehearsal/securitydispositionก่อน จากนั้นจึงงานติดตั้งและStaffmappingที่ได้รับอนุมัติแยก. BrowserCatalog/save+reload/Studentform/Headhistoryยังเป็นacceptanceงานถัดไปที่ต้องกำหนดขอบเขต; ไม่เริ่มแก้A01/Findingsอื่น.

รอบนี้สร้างรายงานนี้และอัปเดตREADME/Handoffเท่านั้น. ตรวจ`git diff --check`, strictUTF-8ของ3เอกสาร, diffpaths/Gitstatus และSHA-256preservationก่อนจบ: งานเดิมนอก2เอกสารหลักคงเดิม รวมInstaller/Testbaseline. ไม่มีApplicationLogic/UI/Models/Schema/manifest/lockfileเปลี่ยน ไม่มีDatabaseWrite/Grant/backup/restore/Commit/Push. PostgreSQLqueriesทั้งหมดอยู่ในserver-enforcedreadonlytransactions; Docker/npm auditมีเพียงephemeralcontainer/cache ไม่เปลี่ยนruntimecontainersหรือdependenciesในrepository.

## 15. ประวัติ Security Remediation Plan — ก่อนดำเนิน Wave A

### 15.1 หลักฐานล่าสุดและการจัดระดับความเสี่ยง

อ่าน Source/callers และ locked dependency graph ใหม่ พร้อม `npm audit --json --package-lock-only --ignore-scripts` ใน verification image: **13 package entries เท่าเดิม — Critical1/High5/Moderate7**, direct5/transitive8, production10/development3. Exit1คือพบ advisories ไม่ใช่ audit error. อ่าน official npm registry ด้วย GET เพื่อยืนยัน candidate version/engines/exports/dependencies และอ่าน maintainer advisories/changelogs; ไม่ติดตั้ง tarball/แพ็กเกจ ไม่ resolve lockfile ใหม่ ไม่ upgrade/audit fix/reinstall.

การจัดระดับด้านล่างเป็น **inference จากเส้นทางที่อ่าน** ไม่ลด severity ใน advisory และไม่ใช่ exploit test หรือ risk acceptance. Production หมายถึงแพ็กเกจใน dependency กลุ่ม runtime; **ไม่ได้ตรวจ environment Production จริง**. Development Docker ใช้ Node20.20.2, `npm install`, `npm run dev` จึงมี dev tools ทำงานด้วย. การสร้าง production image ที่ omit dev เป็นงานแยก ไม่ถือว่ามีอยู่แล้ว.

| Package / ต้นทาง | เส้นทางที่อาจได้รับผล / ความเสี่ยงคงเหลือตอนนี้ | Candidate / การตัดสินใจ |
| --- | --- | --- |
| proxy-addr2.0.7 ← Express5.2.1 | Advisory Critical; ใช้ trust-subnet ในการเชื่อ X-Forwarded-For. App ไม่ตั้ง trust proxy, defaultfalse และ hostport เป็น loopback จึงยังไม่พบเงื่อนไขโจมตีนี้ใน config ปัจจุบัน; **Low แบบมีเงื่อนไขใน Development**, อาจสูงมากเมื่อใช้ proxy config ที่ผิดในอนาคต | **2.0.8**, patch ใน parent range`^2.0.7`; ไม่เปลี่ยน trust proxy/Identity policy |
| body-parser2.3.0 ← Express | `app.use(express.json())` ทำงานก่อน protected routers; compressed/malformed body เป็นเส้นทางเข้าได้. **High priority ด้าน availability**, ไม่มี PoC ใส่ live | **2.4.0** ใน`^2.2.1`; ทดสอบ compressed JSON, malformed/trailing bytes, limit400/413 และ error middleware |
| express-rate-limit8.2.1 ← Backend | ใช้ใน Auth/Google/Role routes; IPv4-mapped IPv6 กระทบการแบ่ง bucket. **Medium–High availability/abuse risk**, custom student-id key บาง route ไม่แทนการตรวจ IP routes อื่น | **8.7.3** ใน`^8.2.1`; คง policy/window/limit/key เดิม ตรวจ CJS และ 429/headers/error callbacks |
| ip-address10.0.1 ← rate-limit ที่ pin version | มี6 advisories หลายวิธีใช้งาน; ไม่มี direct app import แต่ rate-limit ใช้ Address6. **Medium**, ไม่เหมาว่า HTML-emitting/SSRF methods ทุกตัวถึงจาก HTTP นี้ | **10.7.4 เป็น minimum สำหรับ6 advisoriesที่ระบุ**; parentใหม่รับ`^10.2.0`. Registryมี10.7.6ด้วย; ให้ตรวจ exact resolved version/advisory ใหม่ก่อนอนุมัติ lock diff |
| multer2.0.2 ← Backend | Memory/Disk uploads ใน Profile/CO-09/Supervision; มี guards/limits บาง route แต่ไม่ได้ปิดทุก cleanup/recursion path. **High availability priority สำหรับ upload**, ไม่ใช่ Catalog JSON handler โดยตรง | **2.5.0** ใน`^2.0.2`; ต้องตรวจ field decoding, limits boundary, skipped files, disk cleanup และabort/error paths |
| nodemailer10.0.10 ← Backend | Email serviceส่ง `to` ไปsendMail; sourceนี้ยังไม่พิสูจน์ recipient validation chain ทุกทาง และ SMTP peerมีผล. **Medium**, ไม่อ้างว่าเกิด wrong recipient จริง | **10.1.4** ใน`^10.0.10`; Node>=20/CJS require exportมี; ทดสอบ stream transport/envelope/addressparser และ SMTP errors โดยไม่ส่งเมลจริงเอง |
| qs6.15.3 ← Express/body-parser | Express default query parser=`simple`, App ไม่ลงexpress.urlencoded; CatalogรับJSON. **Low สำหรับ Catalog paths ที่อ่าน**, pathอื่น/extended parsing/stringifyยังไม่ได้พิสูจน์ | **6.16.1**, อยู่ทั้งparentrangesเดิมและbody-parser2.4.0ที่รับ`^6.16.1`; ทดสอบ query/array/error behavior |
| moment2.30.1 ← Sequelize และ moment-timezone | ไม่พบ direct source callerที่ส่ง untrusted object ไปmoment.locale. **Low แบบจำกัดการค้น**, ไม่ใช่ proofทุก transitive path | **2.31.0** ในทั้งสองparent ranges`^2.29.4`; ตรวจ Date/Timezone/Sequelize serialization |
| brace-expansion5.0.9 ← Nodemon→Minimatch | glob patternจาก watch/ignore config ไม่พบเส้นทางรับจาก publicHTTP; dev toolยังติดตั้งจริง. **Low–Medium local tooling DoS** | **5.0.12** ใน`^5.0.8`; Node20รองรับ; ปิด high entryนี้ได้ตามแผนแต่ไม่ปิด Minimatch advisory |
| minimatch10.2.6 ← Nodemon3.1.14 | Advisoryต้อง optimizationLevel>=2; Nodemon callerไม่ตั้ง optionนี้ และ implementation default1. **Low สำหรับ callerที่ตรวจ**, ไม่อ้างทุก pathปลอดภัย | Fixed **11.0.1** นอก`^10.2.1`; ห้าม force overrideโดยถือว่าเข้ากันได้แล้ว |
| nodemon3.1.14 ← Backend devDependency | เป็น inherited entry จากMinimatch ไม่ใช่ advisoryอิสระใหม่; currentDockerใช้nodemon. ความเสี่ยงตามแถวบน | latest parentในregistryยัง3.1.14และยังใช้Minimatch10. รอcompatible upstream/อนุมัติทดสอบ scoped override11.0.1 แยก; ไม่ downgrade3.1.11ตามauto-fix |
| uuid8.3.2 ← Sequelize6.37.8 | Advisory external bufferของv3/v5/v6; Sequelizeutilsที่อ่านใช้v1/v4 และ Catalogใช้crypto.randomUUID. **Low สำหรับ pathที่ตรวจ**, affected packageยังไม่หาย | Fixed **11.1.1** มีCJS require export แต่ majorข้ามparent`^8.3.2`; ไม่ force updateเพียงเพราะCJSโหลดได้ |
| sequelize6.37.8 ← Backend | inherited entry จากUUID; ไม่มีข้อสรุปว่าORM routeถูกโจมตีจาก advisoryนี้. ความเสี่ยงตามแถวบน | lateststable6ในregistryยัง6.37.8; คงSequelize6. ต้องcompatible upstream/อนุมัติ scoped UUIDoverride+DB tests แยก; ห้าม downgrade3.30.0 |

**proxy-addr GHSA-jqcg-44mw-7w3h:** maintainerระบุ affected`>=1.1.0 <2.0.8`, patched2.0.8. การตั้ง trust เป็น IPv4-mapped IPv6 subnet ด้วย prefixสั้นผิดรูปแบบอาจเชื่อ client ทุกIPv4 แล้วรับ forwarded IP ที่ปลอมได้. ปัจจุบันตรวจ Source และ Express defaultได้false แต่ **ไม่ได้ยิง spoofing/DoS กับบริการจริง**; ต้อง patch และทดสอบบน isolated HTTP หลังอนุมัติ ไม่ mark RESOLVED จาก configmitigation. อ้างอิง [maintainer advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h).

### 15.2 Proposed Minimal Dependency Fix

**Wave A — เสนออนุมัติเฉพาะ targeted lockfile refresh ภายใน ranges เดิม**, คงExpress5/Sequelize6/Node major/Auth policy และไม่เพิ่มdirect dependenciesเพื่อซ่อนtransitive issue: proxy-addr2.0.8, body-parser2.4.0, qs6.16.1, express-rate-limit8.7.3, ip-address>=10.7.4ใน10.x, multer2.5.0, nodemailer10.1.4, moment2.31.0, brace-expansion5.0.12. ทั้ง9package targetsมีอยู่ในregistryและตรวจsemver/Node20 compatibilityในระดับmetadataแล้ว; **ยังไม่ลงแพ็กเกจหรือทดสอบruntimeของรุ่นใหม่**.

- **เหตุผลที่ไม่เลือกrate-limit8.2.2เพียงตัวเดียว:** registryยืนยัน8.2.2ถึง8.5.0ยัง pinip-address10.1.0; 8.5.1เป็นตัวแรกที่เปิดrange`^10.2.0`. แต่ [upstream changelog](https://express-rate-limit.mintlify.app/reference/changelog) มีfixเพิ่มใน8.6.2/8.7.2/8.7.3 จึงเสนอ8.7.3ภายในmajorเดิมเพื่อไม่เลือกbaselineที่ทราบข้อจำกัดเพิ่มแล้ว. [GHSA-j3cq-92fq-qg5f](https://github.com/express-rate-limit/express-rate-limit/security/advisories/GHSA-j3cq-92fq-qg5f) เป็นLow ที่ใช้skipFailedRequests/skipSuccessfulRequests+MemoryStore (fixed8.7.2); Sourceไม่ตั้งskipoptionsนี้. เป็นข้อมูลเพิ่มจากupstream **นอก32URLsที่npmรายงานเดิม** ไม่เพิ่มpackagecount13หรือเปลี่ยนseveritysummaryเอง.
- Minimalในที่นี้คือจำกัดชุดpackages/คงmajorและAPIpolicies ไม่ใช่การยืนยันว่าแต่ละcandidateเป็นเวอร์ชันต่ำสุดทุกกรณี. ไม่รัน blanketnpmupdate/auditfixforce/dedupeทั้งtree. ให้ผู้ดำเนินการใช้disposable checkoutที่ไม่มีsecretsเพื่อ resolveเฉพาะapprovedtargets และreviewlockdiffก่อนนำมาใช้. อนุญาตdependency churnที่จำเป็นของ9targetsเท่านั้น; versionอื่นเปลี่ยนโดยไม่อธิบายต้องหยุดreview. `package.json` อาจคงเดิมได้เพราะrangesรองรับ; หากต้องเพิ่มfloor/overrideต้องขอขอบเขตเพิ่ม.
- **Breaking/compatibility review:** same majorไม่ใช่ guarantee. [body-parser2.4.0](https://github.com/expressjs/body-parser/releases/tag/v2.4.0) เปลี่ยนbody/parser internalsและเพิ่มzstandard; [Multer changelog](https://github.com/expressjs/multer/blob/v2.5.0/CHANGELOG.md) เปลี่ยนdecodedfieldnames, exact-limit handling, error metadata/cleanup. [Nodemailer10.1.4 changelog](https://github.com/nodemailer/nodemailer/blob/v10.1.4/CHANGELOG.md) รวมaddressparser/connection changes; registryระบุNode>=20และCJSconditionalexport. Rate-limitเพิ่มvalidation/logging/asyncstore/errorforwardingระหว่างรุ่น ต้องตรวจ429/headers/handler semantics. ไม่แก้Workflowอื่นเพื่อทำให้suiteผ่าน.
- **Wave B — ต้องอนุมัติแยก:** Minimatch11.0.1กับUUID11.1.1เป็นcandidateนอกparentrange, engines/exportsเพียงอย่างเดียวไม่รับรองbehavior. เลือกรอupstreamcompatiblefix หรือreviewscopedoverrides (`nodemon→minimatch`, `sequelize→uuid`)พร้อมtestsเฉพาะทาง. ยังไม่เสนอapplyทันที; ไม่เปลี่ยนNodemon/Sequelizeเป็นรุ่นเก่าตามresolverเพื่อทำให้auditเป็น0. ดู [Minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) และ [UUID11.1.1 backport](https://github.com/uuidjs/uuid/releases/tag/v11.1.1).

**คาดการณ์เท่านั้น:** ถ้าWaveA resolveครบและไม่มีadvisoryใหม่ 9จาก13packageentriesที่ตั้งเป้าอาจหาย เหลือ4Moderate metaentries (Minimatch/NodemonและUUID/Sequelize). **ไม่ใช่ผลauditหลังแก้หรือการลดความเสี่ยงที่เกิดขึ้นแล้ว**; ปัจจุบันยัง13เดิมและD03OPEN. หากมี risk acceptance ชั่วคราว ต้องระบุowner/ขอบเขตcaller/configที่ห้ามเปลี่ยน/reviewdate/เหตุให้เปิดreviewใหม่ ไม่อนุมัติแทนผู้ใช้.

### 15.3 Security Acceptance Criteria — ทั้งหมดยังรอการลงมือที่อนุมัติ

1. Review manifest/lock diff และ`npm ls`ได้exacttargets/parentpathsตามแผน ไม่downgradeExpress/Sequelize/Nodemon ไม่majorupdateที่ไม่ได้อนุมัติ; reproducibleinstall/buildในdisposableenvironmentด้วยlockfileใหม่.
2. npm auditใหม่แยกprod/devต้องไม่เหลือCritical/Highที่ตั้งใจแก้; ถ้าจำนวน/รายการต่างจากคาด ให้รายงานจริงและtriageใหม่. ข้อที่เหลือต้องมีfixหรือexplicitriskacceptance ไม่ใช้count0เป็นsecuritycertificationทั้งระบบ.
3. Focused isolated HTTP: compressed/malformedJSONและlimit400/413; proxy/defaulttrustและforwardedheaders; IPv4/IPv6rate-limit,429/headers/window/reset/errorcallbacks; ไม่มีPoCยิงDevelopment/Production.
4. Multer: permittedfiles/invalidMIME/field/parts/file-size boundary/abortedupload/diskcleanup; Nodemailer: CJSload+streamtransport/envelopeและerrorpathsโดยไม่ส่งเมลจริง. ใช้fixturesของtestsเดิมที่มีอยู่จริง ตรวจscriptsก่อนรัน; ไม่เปลี่ยนProfile/Mentor/นโยบายAuth.
5. RegisteredModels/Associations/Date serialization/UUIDผ่าน; CatalogPostgreSQL+RBACfocused suiteต้องรันใหม่บนisolatedPG16เพราะdependencygraphเปลี่ยน. Prior20/20ไม่แทนผลgraphใหม่.
6. WaveBเพิ่มเติม: UUIDv1/v4/modeldefault/transaction+PostgreSQLserialization และNodemonwatch/ignore/reloadบนWindows+Linuxต้องผ่านก่อนoverride; หากไม่ผ่านคงOPEN ไม่บังคับแก้sourceนอกscope.

## 16. ประวัติ Backup / Restore Rehearsal Runbook — แผนก่อน execution; ผลจริงหัวข้อ 20

แผนนี้ขยายหัวข้อ9ให้ตรวจรับได้ ตรวจCLI`--help`/toolversionsและเอกสาร [PostgreSQL16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html) แล้ว. **ไม่ได้เรียกpg_dumpเพื่อbackup, pg_restoreเพื่อrestore, exportedsnapshot, CREATE DATABASE/containerหรือcleanupใดในรอบนี้**. `--version/--help` เป็นเพียงread-onlypreflight ไม่ใช่ผลbackup/restore.

### 16.1 Source Identity / Private Storage Gate

- ระบุsourceที่อนุมัติเท่านั้น: container`intern_postgres`, IDเต็มในหัวข้อ4, DB`intern_system`, PG16.15, Backendenvdevelopment/hostpostgres/port5432/public. ตรวจDockerinspect/databaseidentity/sourcehash/DBOIDใหม่ก่อนและหลังงาน; เปลี่ยนIDได้เฉพาะเมื่อทบทวนและยืนยันtargetใหม่ ไม่fallbackไปDBจากdefaultenv.
- Read-onlyตรวจเพิ่มรอบนี้: encoding=`UTF8`, collation/ctype=`en_US.utf8`, tablespace=`pg_default`, extensionมีเพียง`plpgsql1.0`. บันทึกactualsourceimageIDจากDockerinspectในexecutionreceipt ไม่เชื่อmutabletagอย่างเดียว. Restoretargetต้องencoding/collation/extensionavailabilityสอดคล้อง; หากทำไม่ได้ให้หยุด ไม่เปลี่ยนDevelopmentlocale/ติดตั้งextensionเพื่อฝืนให้restoreผ่าน.
- ปลายทางBackup: `.local-db-backups/coop-catalog/<run-id>/intern_system_before_coop_catalog_<YYYYMMDD_HHmmss_BKK>_<revision>.dump`. Run-idใช้สุ่มเพื่อไม่ชน/ไม่overwrite. โฟลเดอร์ลูกยังไม่สร้าง; ก่อนสร้างต้องอนุมัติwriteและตรวจresolvedabsolutepathอยู่ใต้privateparent, diskspaceและACL. Parentปิดinheritanceตามผลก่อนหน้าและตรวจซ้ำรอบนี้ยังprotected/3rules; ต้องตรวจสิทธิ์ลูกใหม่ด้วย.
- Receiptเก็บในprivateGit-ignorepathเดียวกัน: sourcecontainerID/DBidentity/toolversions/Bangkoktime/sourcehash/runID/archiveSHA/bytes/exitcodes/restorecontainerID/aggregatecomparisonresult. ไม่ใส่password/hashvalues/tokens/emails/accountIDs/rawrows/TOCลงเอกสารสาธารณะ.

### 16.2 Fresh Backup ที่มี Comparison Snapshot เดียวกัน

หลังอนุมัติbackupเท่านั้น ให้เปิดkeeperconnectionเป็น`REPEATABLE READ READ ONLY`, ตรวจ`read_only=on`, exportedsnapshotด้วย`pg_export_snapshot()` และคงconnectionไว้จนdump/metadata/count/fingerprintsเสร็จ. **ไม่ได้ทำขั้นตอนนี้จริงรอบนี้**. ใช้`pg_dump`16.15โดยระบุsourceDB/Unixsocket/port/userชัดเจน, `--format=custom`, `--snapshot=<keeper-snapshot>`, `--lock-wait-timeout=5s`, `--file=<unique-private-staging-file>`; ไม่เพิ่ม`--create/--clean` ไม่dumpผ่านPowerShelltextpipeline. รหัสผ่านใช้กลไกcredentialเดิมที่ได้รับอนุมัติ ไม่ต่อในcommand/URI/log.

ให้stagingfileอยู่pathชั่วคราวเฉพาะrunที่privateภายในcontainer ไม่ใช่DBdatavolume; กำหนดprivatepermissions/umask077ก่อนเขียน. Copyไฟล์ไปprivatehostpathด้วยbinarysafe`docker cp`; ตรวจSHAของsourcearchiveและhostcopyตรงกัน/size>0 และ`pg_dumpexit0`ก่อนถือว่าcopyสำเร็จ. จบkeeperด้วยROLLBACKแม้error. หากsnapshotconnectionหลุด/dumpล้มเหลว/DDLชน/timeout ให้หยุดและทำrunใหม่ภายหลังอนุมัติ ไม่ใช้partialarchiveเป็นbackup.

Schema inventoryและrowcountsต้องอ่านจากkeeper snapshotเดียวกับdump; ไม่เทียบcountคนละเวลาขณะมีwritersแล้วเรียกmismatchว่าข้อมูลหาย. PostgreSQLsequencesมีพฤติกรรมนอกMVCC จึงตรวจค่าที่archiveเก็บกับrestore ไม่อ้างว่าlast_valueจากคนละเวลาเป็นproof; ถ้าต้องเทียบเข้มต้องapprovedquiescentwindow. หลีกเลี่ยงconcurrentDDLระหว่างbackupและจำกัดkeeperdurationเพื่อลดผลต่อระบบ.

### 16.3 Backup Integrity / Evidence Gate

Acceptance: archiveใหม่ไม่overwriteไฟล์เดิม, dump/copyexit0, size>0, sourcecopySHAตรงกัน, `pg_restore --list <archive>`exit0ในprivateoutput. **TOCอ่านได้ยังไม่เท่ากับrestoreได้**. FullDBarchiveมีข้อมูลอ่อนไหวรวมcredentialhashes จึงเก็บprivateเท่านั้น; ไม่เปิดcontentsเพื่อทำหลักฐานในChat/Git. CustomdumpครอบคลุมDBเดียว ไม่ใช่backupglobalroles/tablespaces/cluster; ห้ามอ้างว่าเป็นclusterdisasterrecoveryครบ.

### 16.4 Restore Target Gate — แยกจาก Development จริง

เมื่ออนุมัติrestore ให้สร้างPG16containerใหม่โดยบันทึกreturnedIDทันที ใช้ชื่อ`fitm_catalog_restore_<run-id>`, label`fitm.task=catalog-backup-rehearsal`/`fitm.run=<run-id>`, **Network=none, Ports={}, Mounts=[], dataในtmpfs**, และfreshDB`fitm_catalog_test_restore_<run-id>` (`run-id`ต้องเป็นlowercaseletters/digits/underscore). ห้ามใช้container/Volume/networkของDevelopmentหรือpublishhostport. หากใช้trustauthให้จำกัดเฉพาะnetwork-nonecontainerนี้ ไม่ใช้กับserviceจริง.

ก่อนrestore ตรวจexactID/labels/image/Network/Mounts/DBname/PGmajor/encoding/collation/publicempty/readinessจากภายในcontainerและยืนยันDBnameไม่ใช่`intern_system`. Initฐานทดสอบให้UTF8/en_US.utf8ตรงsourceตามoptionsที่อนุมัติ; ไม่ใช้localeอื่นโดยเงียบ. Copyarchiveเข้าcontainerใหม่แบบbinarysafeและตรวจSHAตรงhostก่อนใช้. **ตรวจdefaultdatabaseenvอย่างเดียวไม่พอ** ต้องSQLcurrent_databaseและemptyrelationsจริง.

`pg_restore`ใช้explicittargetdatabase/port/socketและ`--exit-on-error --single-transaction --no-owner --no-acl <copied-archive>` เท่านั้น; ไม่ใช้`--jobs`ร่วมsingletransaction, `--clean`, `--create`, disable-triggersหรือinit/reset. Owner/DBACLไม่restoreโดยตั้งใจเพื่อrehearsal; ตารางข้อมูลbusiness/RBACต้องคงครบ. ไม่ต่อBackendproduction/SMTP/providerกับrestoreddata.

### 16.5 Restored Schema / Constraints / Row Count Acceptance

| ตรวจจากsame-snapshot receiptเทียบrestoredcopy | เกณฑ์ตรวจรับ |
| --- | --- |
| Relation/column/type/nullability/default/enum | ตรงกันหลังnormalizeเฉพาะdatabaseidentity/OIDที่เปลี่ยน; ไม่ignoreactualtypedefaultdrift |
| PK/FK/Unique/index predicate/CHECK | definitions/actions/validationflagsตรง รวมReviewNOTVALIDเดิม; ไม่validateหรือnormalizeระหว่างrestoreเพื่อให้ผลผ่าน |
| Business counts | ทุกuser-ownedtableในDBbackupมีrowcountตรง ไม่ตรวจแค่3ตารางCatalog; ระบุinheritance/partitioncountsemanticsให้ตรงทั้งสองด้าน |
| Preservation fingerprints | canonicalorderedrowsแบบstream/keyedHMACภายในprivateverificationสำหรับtablesสำคัญและaccount/grantdata โดยไม่พิมพ์rawrows; ใช้key/encoding/timezoneเดียวกันทั้งสองฝั่ง ไม่มีsecret/HMACkeyในGit |
| Empty legacy coverage | หากrequests/snapshots/reviewsยัง0 ให้บันทึก0/0/0พร้อม **COVERAGE LIMITATION**; ไม่สร้างrecordsบนDevelopmentและไม่ถือว่าพิสูจน์historicalUI/gradesแล้ว |
| Owners/DBACL/globalroles | อยู่นอกacceptanceของrestoreด้วยno-owner/no-acl; ต้องreviewแยกหากจะใช้archiveเพื่อrecoveryจริง |

หากเทียบจำนวน/hash/constraintsไม่ตรงหรือพบunexpectedrelationsให้คงD01OPENและเก็บprivatefailuresummary ไม่restoreทับDevelopmentเพื่อแก้. เปรียบเทียบlogicaldefinitionsไม่เทียบphysicalOIDs/transactionIDs; countอย่างเดียวไม่ยืนยันข้อมูลแต่ละfieldครบ.

### 16.6 Optional Catalog Installer Rehearsal — ต้องอนุมัติเพิ่มให้ชัด

Backup/restoreapproval **ไม่รวมสิทธิ์ติดตั้งDevelopment**. หากผู้ใช้อนุมัติinstallerrehearsalด้วย จึงใช้registry/DBenvของrestoredisolatedcontainerและexplicittestguardsกับชื่อ`fitm_catalog_test_restore_<run-id>`; installerไม่มีschemaeffectsนอกtransactionที่อนุมัติ. ก่อน/หลังต้องfingerprintbusinessrows/schemaที่ต้องรักษา, ตรวจ3tables/seed10/Grants0และreplacementCHECK/rerun/rollbackตามapprovedscope. ไม่เรียกemptyDBfocusedtestทับrestoredDBเพราะguardต้องreject. DevelopmentInstallerและStaffGrantsยังห้ามจนอนุมัติอีกงานหนึ่ง.

### 16.7 Cleanup ที่ตรวจ Identity ก่อนทำ

Cleanupทำได้เฉพาะสิ่งที่runนี้สร้างใหม่เมื่อได้รับอนุมัติexecutionแล้ว: ตรวจrecordedcontainerIDตรงreturnedID, labels/run-id/database/image/network-none/noports/Mounts[]ตรงreceipt และไม่ใช่IDของ`intern_postgres`. ถ้าไม่ตรง **refusecleanup** และรายงาน ไม่เดาชื่อจากprefixอย่างเดียว.

ใช้stop/remove **exacttestcontainerID** เท่านั้นเพื่อทิ้งtmpfs; ไม่ต้องDROP DATABASEและไม่เรียกvolumeprune/volumeremove/rm-v หรือresetใด. ยืนยันsourcecontainer/volumeidentityยังอยู่และtestcontainerไม่เหลือ; คงbackup+receiptsที่privatepathตามretentionที่อนุมัติ. ลบstagingfileได้เฉพาะexactpathที่runนี้สร้างและหลังhosthashผ่าน ไม่recursivecleanupโฟลเดอร์เดิม. **ไม่cleanupฐานหรือarchiveเก่าที่ไม่ได้สร้างในrunนี้**.

## 17. ประวัติ Reconcile D01–D06 — หลังจัดทำแผน ก่อน Wave A

ผลread-onlyใหม่ยืนยันtargetIDเดิม/PG16.15/DBintern_system/public/read_only=on. ทั้ง3CatalogrelationsยังNULL; requests0/snapshots0/reviews0, activeStaff2, Students7/majorNULL1. **Cataloggrantsยังไม่มีstorageให้COUNT** จึงรายงานว่าไม่มีpersistedCataloggrantในschemaปัจจุบันและไม่มีการprovision (effectiveCatalogmanagementไม่เปิด) ไม่อ้างว่ารันCOUNTบนgranttableแล้วได้0.

RuntimeSourcecallgraphที่ตรวจมีการเรียกinstallerในCLIภายใต้`require.main===module`; startupauthenticateและpackage/Dockerdeployentryไม่เรียกinstallCatalog. Isolatedtestเรียกexportedfunctionแบบexplicitตามguard ไม่ใช่startup. `postgresIntegrity.js` importเฉพาะCHECKSไม่ใช่เรียกinstaller. ไม่ได้รันstartupเพื่อทดลองหรือใช้rerunที่มีprobeDDLเป็นreadonlycheck.

| Finding | สถานะหลัก | สิ่งที่เตรียม/ตรวจเสร็จจริง | หลักฐานที่ยังขาด/เงื่อนไขปิด |
| --- | --- | --- | --- |
| D01 Backup/Restore | **NEEDS APPROVAL** | runbookและCLIoptions/versions/identity/privateparentพร้อม | อนุมัติbackup+restoreexecution, fresharchive/isolatedrestore+comparisonจริง; แผนไม่แทนผล |
| D02 Staff mapping | **NEEDS APPROVAL** | liveactive2, noGrantstorage/noautogrant; scopepolicyคงเดิม | StaffUUIDจริง+IT/INEscope/ผู้อนุมัติ และgrant/realaccountacceptanceในงานแยก |
| D03 Security | **OPEN** | inventory13ยืนยันใหม่, reachability/candidate/compatibilityและACครบ | ยังไม่update, post-fixaudit/runtime/isolatedtestsหรือexplicitresidualriskacceptance; ต้องอนุมัติก่อนapply |
| D04 Student majorNULL | **OPEN** | count1ยืนยันใหม่; ไม่เลือกสาขาแทนผู้ใช้ | owner/profileworkflowหรือการยอมรับข้อจำกัดบัญชีนั้นโดยผู้มีอำนาจ; ไม่แก้dataในmigration |
| D05 Legacy/browser coverage | **OPEN** | coveragegapระบุชัด, priorisolated20/20ยังเป็นคนละevidence; NOTVALIDเดิมไม่แตะ | ไม่มีrealrecordsให้พิสูจน์historicalbehavior; ต้องacceptcoverageหรือกำหนดscopedfixture/browseracceptanceแยก ไม่แปลง0เป็นPASS |
| D06 Installer/recovery limits | **OPEN** | noautoinvocationตรวจแล้ว; identity/locks/rollback/forwardrecoveryrunbookพร้อม | ทบทวนmanualpreconditionsและrehearsalที่อนุมัติจริง/ยอมรับขอบเขตdriftguards; ไม่ถือว่าแผนเท่ากับpostinstallproof |

รวม **RESOLVED0 / OPEN4 / NEEDS APPROVAL2 / BLOCKED0**. ไม่มีtechnicalblockerต่อการอ่าน/จัดทำแผนครั้งนี้; ขั้นตอนที่ผู้ใช้ห้ามรันจัดเป็นรออนุมัติ/NOT TESTED ไม่อ้างว่าเครื่องมือใช้ไม่ได้. D01/D03และexplicitDeploymentauthorizationยังเป็นNO-GOconditions; D02เป็นactivationgateแยกจากschema-only.

## 18. ประวัติ Approval Boundaries / Verification / NEXT TASK — ก่อน Wave A

สิ่งที่ต้องได้รับอนุมัติก่อนทำจริง แยกให้เลือกขอบเขตได้:

1. **Security WaveA:** อัปเดตtargetedlockfile/dependenciesของ9targetsและผลต่อtests/build, โดยไม่deploy; WaveBoverridesหรือriskacceptanceต้องอนุมัติแยก ไม่ตีความรวม.
2. **Fresh Backup/Restore:** สร้างprivatefolder/archive/receipt/temporaryPGcontainer, exportedsnapshot/read-onlysourceverification, restoreเขียนเฉพาะฐานใหม่และidentity-checkedcleanupตามหัวข้อ16.
3. **Installer rehearsal:** หากต้องการเพิ่ม ต้องระบุwriteในrestoredisolatedDB; ไม่รวมDevelopmentDDL.
4. **Development installation:** explicitapprovalสำหรับ`intern_system`/installer/replacementCHECKหลังgatesผ่านเท่านั้น. **ไม่ได้รับอนุมัติในงานนี้**.
5. **Staff scope/activation, majorNULLและBrowser acceptance:** ระบุตัวตน/ขอบเขตงานที่อนุมัติโดยไม่เก็บPIIในpublicreport ไม่ยกสิทธิ์อัตโนมัติ ไม่แก้FindingsA01–A14/Workflowอื่น.

**ผลรอบนี้:** แก้เฉพาะรายงานไฟล์เดิมนี้/README/Handoff ไม่มีไฟล์ใหม่หรือลบ. Baseline818ไฟล์: Gitก่อน/หลัง **3modified/2untracked/0deleted** เท่าเดิม (Installermodifiedและfocusedtestuntrackedเป็นงานเดิม). ตรวจSHA-256คงเดิมทุกไฟล์นอก3เอกสาร รวมpackage.json/package-lock/Installer/Test; strictUTF-8และ`git diff --check`ตรวจหลังแก้. ไม่build/runtestsที่เขียนDB/installDependencies/backup/restore/createcontainerPG/DDL/Grant/Commit/Pushในงานนี้; Dockerที่สร้างชั่วคราวมีเพียงNodeอ่านregistry/audit/metadataและauto-remove.

**GO/NO-GO ล่าสุด: NO-GO คงเดิม.** ยังมี13affectedpackageentries, Backup/Restore/RehearsalจริงNOT TESTED, GrantsNOT ASSIGNED/MigrationNOT APPLIED และreallegacy/browsercoverageจำกัด. **NEXT TASK:** ผู้ใช้พิจารณาอนุมัติSecurityWaveAและ/หรือBackup/RestoreRehearsalตามขอบเขตข้างต้น แล้วตรวจผลจริงก่อนทบทวนNO-GO; ไม่เริ่มDeploymentเองเพราะแผนเสร็จ.

## 19. Security Wave A — Implemented / Focused Verification — 7 พฤศจิกายน 2026

คำสั่งผู้ใช้รอบนี้อนุมัติ9WaveAtargetsตามหัวข้อ15และFocusedTestsเท่านั้น แทนสถานะNEEDSAPPROVALของการapplyWaveAเดิม. ไม่อนุมัติWaveB, DatabaseSchema/Records/Installer, StaffGrants, Backup/RestoreหรือDeploy. อ่านWorkingTree/Handoff/README/AuditและGitDiffก่อนแก้; package.json/lockfileไม่มีการเปลี่ยนจากผู้ใช้ที่ต้องทับ. Lockfileเดิมมีอยู่จริงแต่ถูกGit-ignore จึงบันทึกbaselineจากLocal+artifactที่ตรงกันก่อนอัปเดต ไม่ใช้GitHubแทนLocalSource.

### 19.1 Dependency Versions และขอบเขตการเปลี่ยน

| Wave A target | ก่อน | หลัง — Local installed / Docker installed |
| --- | --- | --- |
| proxy-addr | 2.0.7 | **2.0.8** |
| body-parser | 2.3.0 | **2.4.0** |
| qs | 6.15.3 | **6.16.1** |
| express-rate-limit | 8.2.1 | **8.7.3** |
| ip-address | 10.0.1 | **10.7.4** |
| multer | 2.0.2 | **2.5.0** |
| nodemailer | 10.0.10 | **10.1.4** |
| moment | 2.30.1 | **2.31.0** |
| brace-expansion | 5.0.9 | **5.0.12** |

**คงเดิม:** Express5.2.1, Sequelize6.37.8, Nodemon3.1.14, Minimatch10.2.6, UUID8.3.2, pg8.23.0. ไม่มีmajorupgradeอื่น ไม่มีdirectdependencyเพิ่ม ไม่มีpersistedoverrides และ`backend/package.json`คงเดิมทุกbyte.

ใช้isolatedresolverที่รับpackage.json/lockfileจากWorkingTree โดยtemporaryexactpinsสำหรับ9targetsเท่านั้น จากนั้นคืนmanifest/rangesเดิมก่อนตรวจfinaltreeและ`npm ci`. Pinsเป็นเครื่องมือresolveในcontainerชั่วคราว **ไม่ได้อยู่ในrepository/runtime**. Localติดตั้งจากlockใหม่ด้วย`npm install --ignore-scripts --no-audit --no-fund`; ตรวจ`npm ls --all`และversionsจริงหลังติดตั้ง. Cleanisolated`npm ci --ignore-scripts --no-audit --no-fund`ผ่าน ไม่มีinvalid/missingdeps และไม่ทำให้lockเปลี่ยน. Dockerfileเดิมใช้npm installโดยไม่มีการแก้Dockerfile; artifactได้lockhashเดียวกัน.

Semanticlockcomparisonยืนยันเปลี่ยนversions **9รายการพอดี**, rootmanifestmetadataเดิม, ไม่มีpackageversionsอื่นเปลี่ยน/ไม่มีpackageเพิ่ม. Multerใหม่เลิกใช้8orphanpackagesจึงถูกนำออกจากtreeตามdependencygraph: concat-stream/buffer-from/readable-stream/string_decoder/typedarray/util-deprecate/mkdirp/minimist. ไม่พบapp/testcallerของแพ็กเกจเหล่านี้; `node:string_decoder` ที่พบเป็นNodebuiltin ไม่ใช่แพ็กเกจที่นำออก. ไม่ลบsource/businessfeatureใด.

เพิ่มข้อยกเว้นเฉพาะ`!/backend/package-lock.json`ใน`.gitignore` เพราะเดิมrulepackage-lock.jsonซ่อนBackendlock ทำให้securityresolutionตรวจรับ/ส่งต่อในGitไม่ได้. Frontendlockยังignoreตามเดิม. Backendlockเป็นไฟล์เดิมที่แก้และเริ่มมองเห็นเป็นuntracked ไม่ใช่การสร้างdependencyworkflowหรือlockfileทิ้งแล้วgenerateทั้งโปรเจกต์ใหม่.

FinalBackendlock SHA-256ทั้งLocalและbuiltartifact: **`a6ed96a03571907647d9be11e4fd810dbad10eb955883ee8719dc34d177ad818`**; ก่อนWaveAคือ`94f3c2b94d1bd1296fa56b82f75fed6d5bc889073490ce6001801341486f49a5`.

### 19.2 Audit / Installed Dependency Tree Comparison

| Scope / Severity | ก่อน Wave A | หลัง Wave A |
| --- | --- | --- |
| All — Critical | 1 | **0** |
| All — High | 5 | **0** |
| All — Moderate | 7 | **4** |
| All — Total package entries | 13 | **4** |
| Production entries | 10 (1C/4H/5M จากlockclassificationก่อนหน้า) | **2 Moderate**, ยืนยันใหม่ด้วย`npm audit --omit=dev --json` |
| Development-only entries | 3 (1H/2M) | **2 Moderate** |

Baseline`npm audit`+`npm ls`จากartifactเก่าที่lockตรงWorkingTreeยืนยัน13entriesจริงก่อนแก้. หลังแก้ **Localinstalledtree+Audit และbuiltimage`fitm-wave-a-backend:20261107`installedtree+Auditตรงกัน**: 4Moderate, npm lsfiltered/--all exit0/noinvalid/missingdeps; packageversionassertionsอ่านinstalledpackage.jsonไม่ใช่อ่านlockอย่างเดียว. Auditexit1ยังคงเพราะresidual4Moderate ไม่แปลงเป็นauditPASSทั้งระบบ. ไม่มีauditfix/force/downgrade/blanketpackageupdate.

**FixedในWorkspace/ArtifactตามAuditและtree:** 9targetsทั้ง9ไม่อยู่ในvulnerabilityentriesเดิมแล้ว รวมproxy-addrGHSA-jqcg-44mw-7w3h; ไม่อ้างว่าแพ็กเกจปราศจากช่องโหว่ทุกกรณีในอนาคต. **Remaining/Deferred WaveB:** Minimatch+Nodemon (2devmetaentriesจากglobadvisory) และUUID+Sequelize (2prodmetaentriesจากbufferboundsadvisory). ไม่forceoverrideหรือยอมรับriskแทนผู้ใช้; D03จึงยังOPEN.

**Not Applicable / NOT TESTED:** same-majorupdateไม่ได้ตัดสิทธิ์riskโดยอัตโนมัติ. เงื่อนไขshortprefixtrust/UUIDv3-v5-v6externalbuffer/Minimatchoptimization>=2ไม่พบในcallerที่ตรวจตามtriage เป็นconditionalcoverage ไม่ลบremainingentriesด้วยเหตุนี้. Frontendbuildรอบนี้ **N/A — ไม่มีFrontendSource/manifest/lockหรือbuildinputsเปลี่ยน**; ไม่ยกผลFrontendbuildเก่ามาเป็นผลใหม่. RealSMTP/GoogleProvider/normal-loginจริง/Production/dual-stackHTTPจริง/Browser/fullregression/PGwriteintegration **NOT TESTED**.

**Existingrunningserviceยังไม่patched:** อ่านpackageversionsจาก`intern_backend`หลังงานยังproxy-addr2.0.7/rate-limit8.2.1 ในnode_modulesvolumeเดิม. ไม่install/recreate/restart/Deploycontainerเพื่อเปลี่ยนruntimeภายใต้ข้อห้ามรอบนี้. ดังนั้นcounts0Critical/0Highข้างบนใช้กับ **Local+newArtifact** ไม่ใช่การประกาศว่าDevelopmentserviceที่กำลังรันหรือProductionได้รับpatchแล้ว. ต้องนำartifactไปใช้ในdeploymentที่อนุมัติแยกหลังNO-GOconditionsผ่าน.

### 19.3 Focused Tests / Smoke / Compatibility Results

คำสั่งfinalartifact: `docker run --rm --network none -e DOTENV_CONFIG_QUIET=true fitm-wave-a-backend:20261107 node --test test/securityWaveA.test.js test/phase1.test.js test/mentorVerificationEmail.test.js` → **34/34 PASS, fail0/skip0, exit0, 1.81s** (25existingcases+8newsubtests+parent). ไม่มีDBcredentials/hostmount/Provider/SMTPหรือSQLจริงในrunner.

| ตรวจ | ผล / ชนิดหลักฐาน |
| --- | --- |
| Lock consistency / Installed tree | **PASS** clean npmci+npmlsall exit0, installedversionsครบ9, Source/artifactlockSHAตรง, Express5/Sequelize6/WaveBคงเดิม |
| Security regression tests | **PASS 9/9** รวมparentบนLocalNode24และDockerNode20; จริงHTTP/Packages/JWT + syntheticactors/SQLguard |
| Trusted proxy / Forwarded IP | **PASS** actualAppdefaulttrustproxyfalse; HTTPไม่เชื่อX-Forwarded-For/Forwardedที่ปลอม. Patchedproxy-addrไม่เชื่อshortprefixผิด; testsไม่ได้เปลี่ยนtrustproxyในproductioncode |
| Rate limiting | **PASS** defaultIPkeyยังได้200/200/429/429แม้เปลี่ยนspoofedXFF, Retry-After/rateheadersถูก; configwarningยังทำงาน. SyntheticIPv4-mappedkeysแยกลูกค้าและIPv6subnetkeysคงสัญญา; asyncrejectedhandlerไปerrorMiddleware |
| Express request/response | **PASS** compressedThaiJSON200, malformed/trailingcompressedbytes400, oversized413 และserverยังตอบได้ |
| Multer | **PASS** actualMemoryStorageHTTP: MIME/field/duplicate/size/fieldlimitboundary, pendingasyncfilterหลังclientabortไม่crash; ไม่เขียนdiskfiles |
| Auth / Authorization / Catalog RBAC | **PASS** existingUnified/role/JWT/track/expiry tests; newHTTPใช้actualJWT/liveguardsกับin-memoryactors/grants: student/teacher/no-permission/inactive/revoked/cross-programถูกปฏิเสธ. ไม่มอบGrantจริง |
| Nodemailer | **PASS 8existingfocusedtests** actualnewstreamtransport+mockqueries/recipients; ไทย/escaping/envelope/contracts/errorhandling. ไม่ส่งเมลจริง |
| Models / Moment / UUID | **PASS** registeredmodels/associationsload, Bangkoktimezone/timestamp/UUIDv4defaultsโดยไม่SQL |
| Backend API smoke | **PASS** actualappsetup/routes/errorhandler; ตัดเฉพาะauthenticate/listenbootstrapในtestharness: root200, protected401, invalidlogin400, JSONerror400, CORS403; SQLcalls0 |
| Existingservicehealth | **HTTP200** `/`และ`/health/db`อ่านอย่างเดียว; ไม่ใช่ผลnewruntimeเพราะยังไม่Deploy |
| Syntax / Dockerbuild | **PASS** node--checkไฟล์testsและaffectedcallers; BackendDockerbuildจากWorkingTreeสำเร็จ. RoutertestVMมีPromise-likedeprecationwarningไม่ใช่failure |
| PostgreSQL catalog integration | **NOT TESTED / ห้ามรันwriteรอบนี้** suite20/20เดิมต้องรันใหม่เมื่ออนุมัติisolatedDBwrites; ห้ามใช้ผลเก่ารับรองdependencygraphใหม่ |

**Failed testsและการแก้:** firstcombinedrun31PASS/3FAIL เพราะ`phase1.test.js`VMfixturesไม่declare`coopPrerequisiteCatalog.service`ที่controllerimportอยู่ก่อนWaveA. ตรวจ3กรณีบนbaselineoldimageแล้วFAILด้วยเหตุเดียวกัน จึงเป็นpre-existingtestcompatibilitygap ไม่ใช่dependencyregression. เพิ่มexplicitCatalogstubเฉพาะ2fixturemapsใน`phase1.test.js` (jobsใช้emptyfixturecatalog; listfixturethrowหากอ่านcurrentCatalog) โดย **คงassertions/BusinessLogicเดิม**; final34/34ผ่าน. Hostnode--testdefaultมีspawnEPERMจากsandbox จึงใช้Node24`--test-isolation=none`สำหรับLocal9/9และstandardNode20Dockerสำหรับfinalsuite; ไม่รายงานsandboxissueเป็นappfailure. ไม่มีknownfailingtestเหลือในfocusedfinalrun.

ไม่พบbreakingchangeที่ทำให้focusedcontractsล้มเหลวหลังอัปเดต; ไม่ได้พิสูจน์ทุกอุปกรณ์/ทุกworkflow. ไม่มีApplicationLogic/StudentTeacherStaffpolicy/UI/Authsourceเปลี่ยน; error/limitbehaviorที่ตรวจเป็นผลupstreamfixและรักษาสัญญาที่assertแล้ว.

### 19.4 Finding D03 / Files / Git / Next Task

**D03 = OPEN — Wave A implemented/verified; Wave B และruntime rollout deferred.** ถือว่าWaveAapprovedworkเสร็จตามscope แต่ไม่ปิดรวมSecurityfindingหรือรับความเสี่ยงModerateแทนผู้ใช้. D01/D02ยังNEEDSAPPROVAL; D04/D05/D06ยังOPEN. **Deployment NO-GO คงเดิม** ไม่ใช้build/auditcountลดลงเป็นauthorizationสำหรับSchema/Grants/BackupRestore/Deploy.

ไฟล์รอบนี้รวม7path: `.gitignore` (unignoreเฉพาะBackendlock), `backend/package-lock.json` (ไฟล์เดิมที่อัปเดต/ใหม่ในGit), **เพิ่ม** `backend/test/securityWaveA.test.js`, **แก้testharness** `backend/test/phase1.test.js`, และ3เอกสารREADME/Handoff/Auditไฟล์นี้. `backend/package.json`ไม่เปลี่ยน. ไม่ลบไฟล์Source/Testเดิม; 8orphanpackagesเป็นdependencygraphremoval ไม่ใช่ลบฟังก์ชัน.

Gitก่อน **3modified/2untracked/0deleted** → หลัง **5modified/4untracked/0deleted**. Baseline818tracked+untrackedfiles: เปลี่ยน5ไฟล์เดิม(.gitignore/phase1test/3docs), package-lockเดิมที่เคยignoredเริ่มปรากฏและnewtestเพิ่ม รวม820ไฟล์; InstallerและCatalogPostgrestestงานค้างเดิมคงเดิมทุกbyte. ตรวจdiff/strictUTF-8/lockJSONและpreservationก่อนจบ. TemporaryresolvercontainercleanupเฉพาะIDที่สร้างรอบนี้; เก็บverifiedimageไว้สำหรับreview ไม่มีPGcontainerหรือBackupเกิดขึ้น.

**NEXT TASK: Backup/Restore Rehearsal หลังได้รับอนุมัติแยก** ตามหัวข้อ16; การรันCatalogPostgreSQLwriteverificationบนgraphใหม่, WaveB/riskacceptance, deploymentruntimeและStaffactivationต้องกำหนดscope/อนุมัติแยก. งานนี้ไม่มีDatabaseWrite/Schema/Records/Installer/StaffGrant/Backup/Restore/Commit/Push.

## 20. Backup/Restore Rehearsal — Executed / Verified — 7 พฤศจิกายน 2026

### 20.1 Authorization / Baseline / Source Identity

ผู้ใช้อนุมัติ fresh Backup จาก Development แบบไม่แก้ต้นทาง และ Restore/verify/cleanup เฉพาะ test container ใหม่เท่านั้น. การอนุมัตินี้แทน NEEDS APPROVAL เดิมของ D01 เฉพาะขอบเขตดังกล่าว ไม่รวม Catalog installer/Staff Grants/Backend restart/Security rollout. อ่าน AGENTS/Current Handoff/README/Audit และ Git diff จาก Working Tree ก่อนเริ่ม; Git **5 modified / 4 untracked / 0 deleted**, baseline SHA-256 **820 tracked+untracked files**. ไม่มีการอ้าง GitHub แทนงาน Local.

| Identity | หลักฐานจริง |
| --- | --- |
| Source container | `intern_postgres`, ID `5b9efb955cf41e0890b6e669a879f98f5abcef99a0bfde82f89d7e953098c0eb`, running |
| Immutable source/test image | `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685` (`postgres:16-alpine`) |
| Source DB / OID / tools | `intern_system` / 16384 / server, pg_dump, pg_restore, psql **16.15** |
| Environment / connection | running Backend `development`, `DB_HOST=postgres`, port 5432, `DB_NAME=intern_system`; backup/queries ระบุ Unix socket `/var/run/postgresql`, port 5432 และ DB ชัดเจน ใช้ credential mechanism เดิมภายใน container โดยไม่พิมพ์ค่า |
| Encoding / locale | UTF8 / collation และ ctype `en_US.utf8` |
| Preservation | source/Backend container IDs, StartedAt, restart counts และ source mounts/image เทียบก่อน/หลังตรงเดิม; ไม่มี restart/reset/deploy หรือคำสั่งเปลี่ยน DB ต้นทาง |

ตรวจ source gate ก่อนใช้ source ID, ใช้ `PGOPTIONS default_transaction_read_only=on` ใน source psql/pg_dump และเปิด keeper `REPEATABLE READ READ ONLY`. Statement/lock/idle timeouts จำกัดช่วงทำงาน; exported snapshot คงอยู่ประมาณ **1.42 วินาที** แล้วจบด้วย ROLLBACK. Source SQL เป็น SELECT/COPY TO STDOUT/EXPLAIN ไม่ใช้ DDL/DML, DROP/TRUNCATE/RESET/sync/alter หรือ sequence advancement.

### 20.2 Consistent Backup / SHA / TOC / Private Storage

Run ID **`20261107_084502_56f73258`** ใช้เวลา UTC ในชื่อ run/file; เวลาในรายงานต่อไปนี้เป็น **Asia/Bangkok**. Private receipt เก็บ UTC แบบมี timezone อย่างชัดเจน.

- Exported snapshot เวลา **7 พ.ย. 2026 15:48:44.412384 น.** จาก keeper read-only; `pg_dump --format=custom --snapshot=<exported-id> --lock-wait-timeout=5s` และ schema/row counts/HMAC/FK checks อ่าน snapshot เดียวกัน. ปิด keeperเวลา **15:48:45.830 น.** ไม่เทียบ source rows คนละเวลากับ archive.
- `pg_dump` เขียนลง staging `/tmp/fitm_backup_<run-id>/archive.dump` ภายใน source container ภายใต้ umask 077 นอก DB volume; ใช้ `docker cp` แบบ binary ไม่ส่ง dump ผ่าน PowerShell text pipeline.
- **Dump exit 0 / binary copy exit 0 / TOC exit 0**, ไม่มี warning/error ที่ได้รับจาก dump. Archive **204,319 bytes**, TOC **356 entries**; `pg_restore --list` เก็บเฉพาะ private output ไม่พิมพ์ TOC/ข้อมูลจริงลงรายงาน.
- SHA-256 ของ source archive, retained host copy และ test copy ตรงกันทั้งหมด:

  `a76aa129cdbe211d9bf86b0c675961e8604d664dd57daf686b30b72ecfe54bc1`

- Archive: `.local-db-backups/coop-catalog/20261107_084502_56f73258/intern_system_before_coop_catalog_20261107_084502_56f73258.dump`. โฟลเดอร์เดียวกันเก็บ `receipt.json`, `archive.toc`, private execution helper และ HMAC key. ไม่บันทึก credentials/raw rows/HMAC key/row fingerprints ใน Git หรือ Chat.
- ตรวจ resolved path อยู่ใต้ private parent, fresh path ไม่ overwrite, disk available ประมาณ **102.85 GB** ก่อน Backup. Parent และ run directory มี protected Windows ACL; run directory และทุก artifact อนุญาตเฉพาะ current user/SYSTEM/Administrators. ตรวจ `git check-ignore` ว่า path ถูก ignore และ Git status ไม่แสดง Backup.
- **Retention:** เก็บ archive/receipt/TOC/key ไว้จนเจ้าของอนุมัติ retention/expiry/deletion แยก ไม่สมมติจำนวนวันและไม่ลบ Backup อัตโนมัติ. ตรวจ SHA อีกครั้งหลัง cleanup ยังตรง. ACL เป็นหลักฐานการจำกัด access เท่านั้น; ไม่ได้ตรวจรับ encryption at rest, offsite copy หรือ disaster-recovery storage policy.

### 20.3 Isolated Restore / Write Target Gate

| Test isolation | หลักฐานจริง |
| --- | --- |
| Created container | `fitm_catalog_restore_20261107_084502_56f73258` |
| Recorded returned ID | `454652ed9dd72507d964403b09edf1cd549cd6a78b9f61318ab89d5bbfb04dfc` — ต่างจาก source ID |
| Labels | `fitm.task=catalog-backup-rehearsal`, `fitm.run=20261107_084502_56f73258` |
| Database | `fitm_catalog_test_restore_20261107_084502_56f73258` — ไม่ใช่ `intern_system` |
| Network / Ports / Mounts | **none / {} / []**, ไม่มี port bindings หรือ shared/named/bind database volume |
| Storage / image | `/var/lib/postgresql/data` เป็น tmpfs 512 MiB; image ID เดียวกับ source เพื่อใช้ PG/locale ที่ตรงกัน |
| Pre-write checks | inspect exact ID/name/labels/image/network/ports/mounts, pg_isready, SQL current_database/version/encoding/locale และ user tables=0; hash test copy ตรง host; ตรวจ identity ซ้ำก่อน restore |

Restore เฉพาะ test ID ด้วย `pg_restore --dbname=<test-db> --exit-on-error --single-transaction --no-owner --no-acl`; ไม่ใช้ clean/create/disable-triggers/parallel jobs. **Restore exit 0 เวลา 15:49:08.427 น.** จากนั้น verification เปิด read-only transaction ภายใน isolated copy. ไม่มี Backend/Frontend connection, host mounts, SMTP/provider หรือ service restart. Trust authentication ใช้เฉพาะ network-none test container นี้.

### 20.4 Verification / Logical Schema / Snapshot Preservation

| Comparison item | Snapshot → Restored | ผล |
| --- | --- | --- |
| User schemas / tables / columns | 1 / 51 / 601 → เท่าเดิม | **PASS**, schema `public`; type/nullability/default/identity/generated/collation และลำดับ live columns ตรง |
| Rows / nonempty tables | 119 / 20 → เท่าเดิม | **PASS**, count/fingerprint ครบทั้ง 51 ตาราง ไม่ใช่เฉพาะ Catalog; อ่าน ONLY แต่ละ relation จึงไม่ double count inheritance |
| Primary / Foreign / Unique constraints | 51 / 86 / 19 → เท่าเดิม | **PASS**, definitions/actions/deferrability/validation flags ตรง |
| Indexes | 132 → 132 | **PASS**, definitions/predicates/unique/primary/valid/ready ตรง |
| CHECK constraints | 123 → 123 | **PASS หลังตรวจรูปแบบ canonical ด้านล่าง**, รวม NOT VALID เดิม 2 รายการ ไม่ validate ย้อนหลัง |
| Defaults / enums | 103 defaults / 7 enum types / 32 labels → เท่าเดิม | **PASS** |
| Functions / triggers / views | 12 / 15 / 0 → เท่าเดิม | **PASS**, definitions ตรง; RLS/options/policies/inheritance/extension inventory ตรง |
| Sequences / archive SEQUENCE SET | 0 / 0 → 0 / 0 | **PASS การเทียบ inventory; nonempty sequence-state coverage N/A**, ไม่เรียก nextval หรืออ้างทดสอบ sequence recovery ที่ไม่มีตัวอย่าง |
| Large objects / pages | 0 / 0 → 0 / 0 | Inventory ตรง; nonempty LO recovery **NOT TESTED** |
| Data fingerprints | Keyed HMAC-SHA256 ตรงทุกตาราง | **PASS**, canonical `to_jsonb(row)::text`, C ordering, COPY text stream; UTC/DateStyle/IntervalStyle/float/bytea settings และ private key เดียวกัน. ไม่ใช้ unkeyed row hash ที่เผยความสัมพันธ์กับ PII |
| Referential integrity | ตรวจครบ 86 FK; source/restored orphan=0 | **PASS**, NULL/MATCH semantics แยกอย่างชัดเจน; ไม่ disable triggers หรือยกเว้น FK เพื่อ restore |
| Catalog not installed | Programs/Courses/Grants relations NULL ทั้งสองฝั่ง | **PASS**, source หลัง cleanup ยังไม่มีด้วย; ไม่มี Grant storage ให้ COUNT/ไม่มีการ provision |
| Legacy Requests / Snapshots / Reviews | 0 / 0 / 0 → 0 / 0 / 0 | Preservation ของ empty tables ผ่าน แต่ **COVERAGE LIMITATION** สำหรับ historical grades/snapshots/UI ไม่แปลงเป็น legacy acceptance PASS |

**Initial verification difference ไม่ใช่ restore error:** comparison แบบ raw inventory รอบแรกคืน `inventory=false` แต่ restore exit 0 และ data/RI/fingerprints ตรงทั้งหมด. แยกตรวจพบ:

1. `coop_requests` มี physical attribute numbers 15 รายการเลื่อนหลัง Restore เพราะ source มีช่องว่างจาก dropped column. เปรียบเทียบ relative order ของ live columns พร้อมชื่อ/type/nullability/default ครบแล้วตรง; ไม่ ignore การสลับลำดับคอลัมน์จริง.
2. CHECK 30 รายการมี array/cast text ถูก deparse คนละรูปแบบหลัง logical dump/restore. Metadata อื่น/flags ตรงทั้งหมด; นำ expressions สองรูปแบบมา `EXPLAIN (VERBOSE, FORMAT JSON, COSTS OFF)` ใน target PG16.15 transaction read-only **ไม่ ANALYZE** แล้ว planned boolean projection ตรงทั้ง 30 คู่. เก็บ original definitions/ผล raw failure/ผล planned comparison ใน private receipt ไม่เขียนทับหลักฐานเดิม. ไม่แก้ constraint หรือข้อมูลเพื่อให้ผลผ่าน.

ผลสุดท้าย inventory หลัง normalization เฉพาะสองกรณีข้างต้น, counts/HMAC, constraints/indexes, RI, Catalog absence ตรงกันทั้งหมด. ไม่พบ restore error, unexplained schema incompatibility หรือ data mismatch จาก snapshot timing. การเทียบ planned expressions ไม่ใช่การทดสอบ invalid input ทุกค่าหรือรับรอง CHECK semantics ข้าม PostgreSQL major. รายงานนี้รับรอง logical inventory ที่ระบุ ไม่ใช่ physical storage/OID equality.

**ขอบเขต recovery ที่ไม่รับรอง:** archive ครอบคลุม DB เดียว ไม่ใช่ cluster global roles/tablespaces; test ใช้ no-owner/no-acl จึงไม่รับรอง owner/ACL recovery. Sequences เป็น non-MVCC ใน PostgreSQL; run นี้ไม่มี sequences หากมีในอนาคตต้องเทียบ archived SET values กับ target ไม่ใช้ live last_value คนละเวลา. ไม่ได้หยุด writers หรือสร้าง quiescent window และไม่ได้ทดสอบ PITR/WAL/cluster failover. ใช้ consistent snapshot ตาม [PostgreSQL 16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [snapshot synchronization](https://www.postgresql.org/docs/16/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION) และ [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

### 20.5 Cleanup / Findings / Git / Next Task

ตรวจ exact recorded test ID, labels/image/network/ports/mounts และ SQL DB identity อีกครั้งก่อน `stop`/`rm` เฉพาะ ID `454652ed9dd7…`; ยืนยันไม่เหลือ container ดังกล่าวแล้ว. **Cleanup เสร็จ 15:51:34.355 น.** ไม่ใช้ DROP DATABASE/rm-v/volume prune หรือแตะ Development container/volume. หลัง retained host hash ผ่าน จึงลบเฉพาะ exact source `/tmp` staging files/directory ที่ run นี้สร้าง ไม่ลบ Backup ต้นฉบับหรือ Backup เก่า. Source/Backend IDs/start times/restart counts/mounts ตรวจคงเดิม และ source Catalog ยังไม่ติดตั้ง.

| Finding | สถานะล่าสุด | สิ่งที่ยังต้องทำ |
| --- | --- | --- |
| D01 Backup/Restore | **RESOLVED สำหรับ snapshot/rehearsal นี้** | ประเมิน backup freshness/retention เมื่อกำหนดวันติดตั้ง; ไม่รวม Installer rehearsal/global-role recovery |
| D02 Staff mapping | **NEEDS APPROVAL** | ตัวตน/program scope/activation และ real account acceptance แยก; ไม่มี Grant ในงานนี้ |
| D03 Security | **OPEN** | ผล Wave A Workspace/artifact จากหัวข้อ 19 ยังเหลือ 4 Moderate; runtime ยังไม่ patched; ไม่มี audit/rollout ใหม่ในงานนี้ |
| D04 Student major NULL | **OPEN** | เจ้าของ workflow จัดการหรือรับข้อจำกัดตามสิทธิ์ ไม่แก้บัญชีใน rehearsal |
| D05 Legacy/browser coverage | **OPEN** | ไม่มี historical records จริง; real account/browser acceptance ยังไม่ทำ |
| D06 Installer/recovery | **OPEN** | Installer บน restored copy / graph หลัง Wave A และ DDL/recovery window ยังไม่ทดสอบหรืออนุมัติ |

รวม **RESOLVED 1 / OPEN 4 / NEEDS APPROVAL 1 / BLOCKED 0**. **GO/NO-GO: NO-GO คงเดิม**; Backup ผ่านไม่ใช่ permission ให้ลง Schema, ให้ Grant หรือ Deploy Security.

ไฟล์ใน Git รอบนี้แก้เฉพาะ `HANDOFF_fitm-intern.md`, `README.md`, Audit ไฟล์เดิมนี้; private artifacts อยู่ใน Git-ignore path ที่ตรวจ ACL แล้ว ไม่เพิ่ม evidence สาธารณะหรือเก็บ sensitive data ในเอกสาร. Git ก่อน/หลัง **5 modified / 4 untracked / 0 deleted** เท่าเดิม; baseline 820 ไฟล์ต้องตรงทุกไฟล์นอก 3 เอกสาร รวม pending Installer/PostgreSQL test, Wave A lock/tests/.gitignore, Application/Frontend และ manifests. ตรวจ strict UTF-8/whitespace/`git diff --check`/SHA preservation ก่อนจบ. งานนี้ไม่มี Application Logic changes จึงไม่ build/full regression ซ้ำ และไม่ใช้ผลเก่าเป็น test ใหม่.

**NEXT TASK:** ขออนุมัติขอบเขต Installer rehearsal บน restored isolated DB เพื่อทดสอบ Catalog กับ dependency graph หลัง Wave A พร้อม Security disposition/Wave B และ acceptance ที่เหลือก่อนทบทวน Development installation. ไม่เริ่ม Installer, Staff Grants, runtime rollout, Backend restart หรือ Deploy เอง. ไม่มี Commit/Push.

## 21. Isolated Installer Rehearsal + Security Disposition — 7 พฤศจิกายน 2026

### 21.1 Scope / Preflight / Isolation Evidence

ผู้ใช้อนุมัติ Restore Backup เดิมลง test containers ใหม่และเรียก Installer จริงเฉพาะ restored copies พร้อมแยก clones สำหรับ error/drift. ไม่อนุมัติ Development installation/Staff Grants/Backend restart/dependency update/Security deployment. อ่าน Working Tree/AGENTS/Handoff/README/Installer/focused test/Backup receipt/TOC และตรวจ Git diff; baseline **820 files / 5 modified / 4 untracked / 0 deleted**. ไม่ทับ pending Installer/test/lockfile หรืองานอื่น.

Backup ที่ใช้คือ run `20261107_084502_56f73258` ในหัวข้อ20, **204,319 bytes / 356 TOC entries / SHA-256 `a76aa129cdbe211d9bf86b0c675961e8604d664dd57daf686b30b72ecfe54bc1`**. ตรวจ receipt COMPLETE/dump+restore exit0 และ hash ก่อน/หลังงาน; receipt ต้นฉบับคงเดิมทุก byte ไม่มี fresh dump หรือการแก้ต้นทางรอบนี้. Source/Backend IDs/image/start/restart/mounts เทียบก่อน/หลังตรงเดิม; ไม่มี SQL ไป Development ในงานนี้.

| Clone | PostgreSQL container ID | Node runner ID | Database |
| --- | --- | --- | --- |
| main | `321c1c82a2ea0bf3ddd78b06ac2dec2a912badcc750167d4dfe4f2e407b50940` | `55f8c6019a701dde655e6d3b58d148c2d58d2f8e699068b59ea4eb2a71b4afe6` | `fitm_catalog_test_main_20261107_093244_c57ee9` |
| drift | `74c31b1aa0d43155fcbd195341b1ca9ac9840ce63b4bd9d3392fb021eede0955` | `4f47aa8d136e8a8ac6f4d1508c1f181db33697d9e7022e924bcf654849e39150` | `fitm_catalog_test_drift_20261107_093244_c57ee9` |
| errors | `d16cdc5fff22851061b48b9a6d5bbfbc398c34b43dad17b418d48a27196b4e63` | `7cf40ccf7e9eaa1e44de17af353260a609932169ebcac5253b624b826af06a51` | `fitm_catalog_test_errors_20261107_093244_c57ee9` |

ทุก PG ใช้ immutable image `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`, PostgreSQL16.15/UTF8/en_US.utf8, **Network=none / Ports={} / PortBindings={} / Mounts=[] / data tmpfs512MiB**. ไม่มี shared Development volume. Labels ระบุ task/run/clone และบันทึก returned IDs ก่อนเขียน.

Runner ใช้ immutable WaveA image **`sha256:9b093c264478ea2304200a7e8c6fd9a7ffe29f32a94ddfd1544df7392c8b7a99`**; SHA ของ Installer/package-lock/focused PostgreSQL test ใน image ตรง Local ทุก byte. `NetworkMode=container:<exact-test-PG-ID>` แชร์เฉพาะ namespace ที่ network-none ของ PG ตนเอง, ไม่มี mounts/ports และไม่เริ่ม Backend HTTP app. Copy private harness ผ่าน docker cp; ไม่ mount `.env`/source/private Backup folder. Test environment ระบุ NODE_ENV=test, explicit PostgreSQL test opt-in, DB_NAME/FITM_CATALOG_TEST_DATABASE ตรงกัน, DB_HOST=127.0.0.1/port5432 และไม่ใช่ intern_system. ปิด dotenv discoveryเฉพาะ processทดสอบตามแนวทาง suite เดิม ไม่เปลี่ยน host/Development variables.

**Pre-install restore verification PASS ครบ3clones:** ตรวจ empty test DB identity ก่อน restore, SHA test copy ตรง host, TOC entry lines ทั้ง356ตรงเดิม, restore single-transaction/no-owner/no-acl exit0. จากนั้น read-only comparison ครบ51tables/119rows/metadata/constraints/indexes/RI/HMAC ตรง Backup snapshot ก่อนเรียก Installer. ใช้ normalization ที่ตรวจแล้วในหัวข้อ20เฉพาะ live-column order กับ30CHECK cast projections ไม่ ignore actual type/default/constraint drift. ตรวจ exact Docker identity/isolation และ SQL current_database/version/loopback ก่อน Installer และก่อน intentional mutations ทุกครั้ง.

**Guard รองรับโดยไม่แก้ Source:** Installer ยอมรับ allowlisted fitm_catalog_test_* ภายใต้ test opt-in อยู่แล้ว. Suite `coopPrerequisiteCatalogPostgres.test.js` เดิมบังคับ empty DB จึง **ไม่เรียก suite นี้กับ restored DB/ไม่ปิด guard**; ใช้ private harness เรียก exported `installCatalog` จริงพร้อม guards เดิม. ไม่ใช้ production/development mode เพื่อฝืนผ่าน.

### 21.2 Installer / Idempotence / Drift / Rollback Results

| Test group | ผลจริง |
| --- | --- |
| Positive target guard | **PASS**, actual PG16.15/test DB/loopback identity และ Docker isolation ตรงก่อนเขียน |
| Negative target guards | **PASS 7 configurations / 0 connections**: intern_system name, production environment, missing opt-in, mismatched test name/expected name, remote host, wrong port. ใช้ pre-connect stub ไม่ยิง SQL ไปฐานจริงและไม่ bypass guard |
| First install on restored main | **PASS**, returned installed=true/seeded10/grantsAdded0/existingSnapshotsUpdated0 |
| Catalog schema | **PASS**, Programs/Courses/Grants3tables/22columns/3PK/4FK/2uniqueindexes/3CHECK ตรง models; FK validated/RESTRICT delete/CASCADE update, indexes unique/valid/ready/nonpartial; 4 Catalog+snapshot CHECKs validated ไม่มี probe ค้าง |
| Seed correctness | **PASS**, Programs IT/INE revision1, active Courses IT5/INE5 รวม10; code/name/English/order/version ตรง Source CATALOG; Grant rows0 |
| Rerun | **PASS**, seeded0/Grants0; schema+keyed fingerprints/dataทั้ง54tablesหลังรันครั้งที่2ตรงครั้งแรก ไม่สร้าง UUID/course rows ซ้ำ |
| Drift clone | **PASS 8 cases**, unexpected column/type/nullability/missingFK/nonunique index/partial unique index/wrongCHECK/missingPK ถูก reject; fingerprintก่อน–หลัง failed installer ตรง malformed state เดิม ไม่มี side effects. คืนเฉพาะ mutation ของ clone ก่อนกรณีถัดไป |
| DB constraint enforcement on drift clone | **PASS 9 rejections**, duplicate PK/course code, malformed code, blank name, negative order, version0, missing staff-editor FK, program revision0, invalid grant permission. Failed statementsไม่เปลี่ยนข้อมูล/ไม่สร้าง Grant |
| Matching NOT VALID | **PASS**, Catalog3+snapshot1 ที่ทำ NOT VALID เฉพาะ clone ถูก validate โดย Installer; Review NOT VALID เดิม2ข้อยังคงเดิม |
| Post-seed error clone | **PASS**, test wrapper throw หลัง actual bulkCreate IT5+INE5ใน transaction เดียว; attempted inserts10 จากนั้น rollback DDL/seeds/snapshot CHECK จน full schema/data fingerprintตรง restored baseline และ Catalog tables0 |
| Partial-input prevention on error clone | **PASS**, intentional Programs-only schemaถูก rejectเป็น Partial Catalog schema; ไม่เติมตาราง/seedหรือเปลี่ยน partial input เอง |
| Autogrants | **PASS**, main install/rerun/drift contract Grant rows0; ไม่มี Staff account provisioning/grant assignment |

ทั้ง4 harness modes (install/rerun/drift/errors) exit0/PASS; ไม่มี failed case ค้าง. Error injection ใช้ model bulkCreate wrapperเฉพาะ process error clone หลัง actual SQL inserts ไม่แก้ Installer/guard/Source หรือใช้ failure hook ใน Development. Metadata และ data fingerprintของ negative clone ครอบคลุมทุกตาราง ไม่ใช่เฉพาะ Catalog. โปรแกรม intentionally malformed clone ไม่ถูกนำกลับไปใช้จริงและ cleanup หมดแล้ว. คำสั่ง postflight ครั้งแรกถูก private helper ปฏิเสธเพราะยังไม่ประกาศโหมด (ไม่มี DB/container mutation); เพิ่มโหมดอ่านอย่างเดียวแล้วตรวจ IDs/Backup/receipt/results ผ่าน เก็บ diagnostic เดิมใน private receipt ไม่ลบหลักฐาน.

Syntax private Node helpers ผ่าน, actual models/associations/Sequelize6 loading และ Installer บน dependency graph หลังWaveAผ่าน. **ไม่ได้รัน full20/20 PostgreSQL+RBAC/CRUD suite หรือ34/34 HTTP/Auth WaveA suite ใหม่**; ผลสองชุดนั้นยังมีขอบเขตเดิม. ไม่ buildซ้ำ/Frontend test/full regression เพราะไม่มี Application Source/dependency changes.

### 21.3 Before/After Preservation / Allowed Schema Differences

| Inventory on main | Restored before | After first install | After rerun |
| --- | --- | --- | --- |
| Tables / columns | 51 / 601 | 54 / 623 | เท่าครั้งแรก |
| Rows | 119 | 131 (เพิ่ม2programs+10courses) | 131 |
| Primary / foreign keys | 51 / 86 | 54 / 90 | เท่าครั้งแรก |
| Indexes / CHECKs | 132 / 123 | 137 / 126 | เท่าครั้งแรก |
| Review CHECK NOT VALID | 2 | 2 | 2 |
| Catalog Grants | ไม่มีtable | 0 | 0 |

**Original51tables preservation PASS:** row counts และ keyed HMAC จาก Backup key/canonical COPY streamตรงก่อน–หลังทั้ง51ตาราง รวม Student/Profile/Staff/account data/Coop Requests/Reviews/Prerequisite Snapshots. Original columns/defaults/PK/FK/indexes/functions/triggers และ inventoryอื่นตรงกับ restored baseline. Orphan checksของทุก FKหลังติดตั้งเป็น0. ไม่พิมพ์ data/hash fields/account IDs/keys ลงเอกสารหรือ Chat.

Allowed delta ที่ตรวจพบมีเพียง3Catalogtables/22columns/3PK/4FK/5indexes(รวม3PKindexes+2unique)/3CatalogCHECK และแทน snapshot `coop_prerequisites_program_code_check` (fixed10codes) ด้วย validated `coop_prerequisites_program_code_format_check` (IT/INE+9digits). ไม่มี schema deltaอื่นบน51ตารางเดิม. Snapshot/Request/Review rowsไม่ถูก update โดย Installer.

**Legacy coverage limitation คงเดิม:** Requests/Snapshots/Reviews0/0/0ทั้งก่อน–หลัง. HMACตรงพิสูจน์ preservationของข้อมูลที่มี แต่ไม่มี real historical rows ให้รับรอง old grades/F/free-text/display/legacy compatibility. ไม่สร้าง legacy records หรือให้ Grantแก่บัญชีจริงเพื่อให้ผลผ่าน. ไม่ claim legacy coverage PASS ทั้งหมด.

### 21.4 Security Disposition — Evidence / Recommendation / Approval

**Fresh Local installed audit:** `npm audit --json` = **Critical0/High0/Moderate4**, `--omit=dev` = **Moderate2**; ทั้งคู่ exit1เพราะ residual จริง. `npm ls --all --json` exit0/noinvalid. Installed pathsคือ Nodemon3.1.14→Minimatch10.2.6 และ Sequelize6.37.8→UUID8.3.2. Runner installed treeยืนยัน9WaveAtargetsตรงเวอร์ชันหัวข้อ19 รวม proxy-addr2.0.8/rate-limit8.7.3/ip-address10.7.4. ไม่มี dependency/package-lock/manifest/override เปลี่ยนในงานนี้.

| Finding / scope | Disposition ที่เสนอ | หลักฐาน / mitigation / remaining decision |
| --- | --- | --- |
| Running intern_backend ยังไม่ Deploy Wave A | **FIX REQUIRED + NEEDS APPROVAL สำหรับ rollout** | อ่าน installed versionsจริงยังproxy-addr2.0.7/body-parser2.3.0/rate-limit8.2.1/ip-address10.0.1/Multer2.0.2ฯลฯ. จึงยังมี known affected versionsรวมCritical/Highจากtriage; ห้ามใช้0C/0HของWorkspaceรับรองruntime. Source/default trust proxy=false ลดเงื่อนไขproxy-subnet advisoryแต่ไม่แก้ compressed-body/upload availability bugs. ต้องapproved rollout/verificationแยกก่อนเปิดgate ไม่Restart/Deployรอบนี้ |
| Minimatch/Nodemon | **DEFER WITH MITIGATION ที่เสนอ — NEEDS APPROVAL** | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) ต้อง attacker-controlled glob + optimizationLevel>=2. Nodemon installed callerส่งdot=trueและWindows nocase/windowsPathsNoEscape ไม่ตั้งoptimizationLevel; installed Minimatch default1. ไม่พบapp/src/test importMinimatchหรือHTTP glob-config pathในส่วนที่ค้น. จำกัด config/patternให้trusted, ห้ามเพิ่มlevel2/untrusted patternโดยไม่review. Runtime Cmdยังnpm run dev จึงมีNodemonจริง ไม่จัดdev-only packageเป็นN/Aเพราะ--omit=devอย่างเดียว |
| UUID/Sequelize | **DEFER WITH MITIGATION ที่เสนอ — NEEDS APPROVAL** | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) เกี่ยวv3/v5/v6 external output buffers/offsets. Installed Sequelize utilsใช้v1()/v4()ไม่มีargs; Catalogใช้crypto.randomUUID; ไม่พบdirect UUID library importในapp/src/testที่ค้น. ห้ามเพิ่มexposed v3/v5 buffer/offset callersโดยไม่review. Moderate2prodentriesยังคงอยู่ ไม่มีการรับriskแทนowner |
| NOT APPLICABLE | **ไม่มี affected package ใดเป็นN/Aทั้งแพ็กเกจ** | เงื่อนไขexploitบางข้อไม่พบในobserved callersเป็นเพียง scoped reachability evidence ไม่ลบadvisory/countและไม่รับรองทุกdynamic/transitive callerหรือProduction |

เป็น **ข้อเสนอ disposition ไม่ใช่ risk acceptance ที่อนุมัติแล้ว**. ต้องระบุ risk owner/operator, environment/reachability boundaries, review deadline และเหตุเปิดreviewใหม่ก่อนยอมdefer. เสนอ reviewก่อนdeploymentครั้งถัดไปหรือเมื่อwatch config/optimizationLevel/UUIDcallersเปลี่ยน โดยownerต้องกำหนดวันหมดอายุชัดเจน; ปัจจุบันowner signoff/expiryยังNEEDS APPROVAL. ไม่รายงาน Security PASS/RESOLVED จากmitigationหรือbuild/testsผ่าน.

Runtime package evidenceอ่านจาก container จริงและ Cmd โดยไม่Restart/Deploy; ไม่รันPoC/DoSต่อservice. ไม่ใช้ `npm audit` ที่อาจอ่านlockใหม่บนmounted sourceแทนruntime installed treeเดิม และไม่ได้อ้างfresh runtime full-audit counts. [Proxy-addr maintainer advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h) ยืนยัน2.0.8เป็นfix; 2.0.7ที่runtimeยังไม่ใช่fixedversion.

### 21.5 Proposed Minimal Wave B — NOT APPLIED / NEEDS APPROVAL

ตรวจregistryด้วยread-only `npm view`ใหม่: latest Nodemonยัง3.1.14/Minimatch range`^10.2.1`; latest Sequelizeยัง6.37.8/UUID range`^8.3.2`. ไม่มีcompatible parent releaseในmetadataที่ตรวจซึ่งทำให้สอง fixesเข้ามาเอง. ไม่ทำauto-downgrade Nodemon3.1.11/Sequelize3.30.0ตามauditresolver.

1. **Nodemon→Minimatch11.0.1 แบบscoped child overrideเท่านั้น** โดยคงNodemon3.1.14และExpress5/Sequelize6. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) ระบุpatched11.0.1; registry engines`18 || 20 || >=22`ครอบคลุมNode20/24ที่ใช้ และมีCommonJS `require` export/namedminimatch. เพิ่มdependency`@isaacs/nonrecursive-glob-match`และใช้brace-expansion`^5.0.12`; ต้องreviewexactlockdelta/newdependency. **CompatibilityยังNOT TESTED:** major glob behavior/default optimization/watch patternsอาจเปลี่ยน ต้องLinuxDocker+Windows watch/ignore/negation/braces/dotfiles/extensions/paths/nocase/windowsPathsNoEscape/reload/graceful restartกับlegacy-watchผ่าน.
2. **Sequelize6→UUID11.1.1 แบบscoped child overrideเท่านั้น** คงSequelize6.37.8. [UUID11.1.1 release](https://github.com/uuidjs/uuid/releases/tag/v11.1.1) เป็นsecuritybackportและregistryยังมีNodeCommonJSrequireexport. Version11อยู่นอกparent`^8.3.2`; ต้องทบทวนv1/state/options/buffer bounds/exports changesระหว่างmajorแม้callerที่อ่านใช้v1/v4noargs. **CompatibilityยังNOT TESTED:** requireAPI/v1/v4/validity/defaultUUID/timestamps/modelassociations/transactions/PostgreSQLserialization/Cataloginstaller/RBAC/CRUDและrollbackต้องผ่านบนgraphหลังoverride ไม่อ้างrehearsalปัจจุบันรับรองUUID11.
3. หากอนุมัติ ให้ทดลองresolutionในisolatedartifactจากLocalmanifest/lock, จำกัดoverrideเฉพาะสองparentpaths, clean npmci/npmls/auditใหม่ทั้งall/prodและreviewทุกdelta. ห้ามglobalUUID/Minimatchoverrideหรือmajorupgradeparentอื่น/Sequelize7เพียงเพื่อให้audit0. ถ้าresolver/exports/behaviorเข้ากันไม่ได้ให้ **BLOCKEDเฉพาะtarget** รอcompatibleupstreamหรือexplicitriskacceptance ไม่force. ห้ามใช้temporaryoverrideผลทดสอบเป็นการDeployโดยปริยาย.

ทางเลือกเมื่อไม่อนุมัติoverrideคือรอcompatibleupstreamพร้อมboundedriskacceptanceที่ownerอนุมัติ; ไม่มีautomaticindefinitedeferral. การเปลี่ยนproduction start command/omitdevเพื่อเอาNodemonออกต้องเป็นงานdeploymentที่อนุมัติแยก ไม่ได้ทำรอบนี้. Metadata/CJS checksเป็นเพียงcandidate compatibility ไม่ใช่WaveB runtime PASS.

### 21.6 Cleanup / D01–D06 / Verification / Next Task

Cleanupสำเร็จเวลา **7 พ.ย. 2026 16:40:14.183 น. Bangkok**. ตรวจ exact recorded PG+runner IDs/labels/images/network/mountsและSQL DBidentity ก่อนcleanup, stop/remove runnerก่อน PGเฉพาะ6containersในหัวข้อ21.1 แล้วตรวจไม่เหลือIDsเหล่านั้น. ไม่ใช้drop/reset/rm-v/volumeprune/SharedDevelopmentvolume. Development/Backend inspect identitiesคงเดิม; originalBackup SHAและreceipt SHAคงเดิมทุกbyteและยังอยู่ ไม่มีการลบหรือoverwrite. Private harness/receipt/audit/installed-tree/security evidenceอยู่ `.local-db-backups/catalog-installer/20261107_093244_c57ee9/` ภายใต้protectedprivateACL/Git-ignore; ไม่มีrawrows/credentials/keyในเอกสาร.

| Finding | สถานะล่าสุดหลัง rehearsal | เหตุผล / Remaining work |
| --- | --- | --- |
| D01 | **RESOLVED สำหรับ Backup snapshot นี้** | originalarchive/receiptยังverified; deploymentfreshness/retentionยังต้องประเมินเมื่อจะใช้จริง |
| D02 | **NEEDS APPROVAL** | StaffUUID/program mapping/activation/realaccountacceptanceยังไม่อนุมัติ ไม่มีGrantจริง |
| D03 | **OPEN** | dispositionพร้อม แต่riskowner/acceptance/WaveBcompatibilityและapprovedWaveAruntime rolloutยังค้าง |
| D04 | **OPEN** | StudentmajorNULLเดิมไม่แก้ในงานนี้ |
| D05 | **OPEN** | Emptyreallegacy0/0/0และBrowser/realaccountacceptanceยังจำกัด; ไม่อ้างfull20/20ใหม่ |
| D06 | **OPEN — rehearsal subcriteria VERIFIED** | actualrestored install/rerun/drift/rollback/preservationผ่าน แต่ต้องoperational signoffเรื่องDDLlocks/window/forwardrecovery/ไม่มีpostcommitundoและขอบเขตguards; defaults/extraFK/validationdrift/lockcontention/concurrentinstallationไม่ได้รับรองครบจาก8casesนี้ |

**RESOLVED1 / OPEN4 / NEEDS APPROVAL1 / BLOCKED0. NO-GO คงเดิม**. ไม่มีtechnicalblockerให้testguardทำงานในisolatedenvironment แต่ไม่มีDevelopment DDL/Grant/Restart/Deploymentauthorization.

ไฟล์ในGitรอบนี้แก้เฉพาะ `HANDOFF_fitm-intern.md`, `README.md`, Auditเดิมนี้; ไม่มีApplication/Installer/test/Model/Frontend/.env/package.json/package-lock/.gitignorechanges. Privateartifactsไม่อยู่ในGit. ตรวจ SHA-256baseline820ไฟล์ว่าคงเดิมทุกไฟล์นอก3เอกสาร, strictUTF-8/whitespace/`git diff --check`; Gitก่อน/หลัง **5modified/4untracked/0deleted** เท่าเดิม. ไม่มีCommit/Pushหรือแก้A01–A14/Profile/Mentor/Auth/identitypolicy.

**NEXT TASK:** ผู้มีอำนาจพิจารณาและอนุมัติSecurityWaveBcompatibilityworkหรือboundedresidualriskacceptanceพร้อมowner/expiry และ approvedWaveAruntime rolloutแยก จากนั้นกำหนดD06operationalsignoff/D04/D05acceptanceก่อนขอDevelopmentDDLapproval. ไม่เริ่มupdate/deploy/Grantหรือเปลี่ยนNO-GOเองเพราะrehearsalผ่าน.
