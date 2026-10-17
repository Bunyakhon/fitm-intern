# Account preparation — Authorized Development provisioning completed

อัปเดต 17 ตุลาคม 2026: ผู้ใช้อนุมัติ Direct Schema + Provisioning บน Local Development `intern_system` แล้ว และรันสำเร็จ Teacher 23 (Head 1), Staff 2, Website Student 5. เก็บ Student เดิม 2 คน จึงมี Student รวม 7 คน. **ไม่อนุมัติ Production**. คำสั่งนี้แทนสถานะ Preparation-only เดิมเฉพาะ Development.

เพิ่ม nullable VARCHAR(255) หก Columns: Teacher `first_name_en`/`last_name_en`; Staff `first_name_en`/`last_name_en`/`position`/`department`. DDL อยู่ `../db/developmentAccountColumns.sql` ไม่ใช่ Migration ใช้ใน Transaction ที่ Guard แล้วเท่านั้น; Models คือ Source of Truth สำหรับการสร้าง Development environment ใหม่ตาม Workflow เดิม. ห้าม Sync/Alter/Reset อัตโนมัติ.

Development runner reuse Master/Fixtures/Models/Profile service เดิมผ่าน `developmentAccountPreparation.js`. จำกัด NODE_ENV=development, Host 127.0.0.1:5432, DB intern_system, live PostgreSQL16/public/private Docker address/no recovery และ explicit Confirm. Default Preview ไม่ connect. Apply ตรวจ Duplicate/Head/Name/Code, ใช้ IDs จาก encrypted vault, table locks และ Transaction เดียวรวม DDL/DML; รันซ้ำแผนเดิมคืน Created 0 ไม่เปลี่ยนบัญชีเดิม. ไม่ใช้ Seeder เก่า `seedTeachers.js` ที่มีทาง Update หรือ `createDepartmentStaff.js` ที่ Guard ไม่ครบ.

```powershell
# จาก Repository root: Preview ไม่มี DB connection
node backend/src/seeders/prepareDevelopmentAccounts.js
# เมื่อตั้งใจรัน Development ที่อนุมัติแล้ว: ไม่ใส่ Password ใน command line
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/src/seeders/prepareDevelopmentAccounts.ps1 -Apply -Confirm intern_system
# เปิดดู Credential เฉพาะบัญชีที่เลือกในหน้าต่าง Local แบบ Masked; ไม่พิมพ์ลง Console
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/src/seeders/prepareDevelopmentAccounts.ps1 -ShowCredentials
```

ExecutionPolicy Bypass ใช้เฉพาะ Child process ของ Script ตายตัว ไม่แก้ OS policy. Password Teacher รับผ่าน Hidden Runtime Input; Staff/Students สุ่มแยก 7 ค่าและผ่าน bcrypt hooks. Credential vault อยู่ `.local-dev-accounts/intern-system-development.bin` ที่ Root, Git-ignore, Windows DPAPI CurrentUser Encrypt/Decrypt verified. Sandbox ไม่อนุญาต Set-Acl จึงเก็บ **Ciphertext เท่านั้นด้วย ACL สืบทอดเดิม**; ไม่อ้างว่าจำกัด ACL เหลือ User/SYSTEM สำเร็จ. ไม่มี plaintext file/Clipboard/Console output; ต้องใช้ Windows user/profile เดิมเพื่ออ่าน DPAPI. Viewer เป็นเครื่องมือ Local แยก ไม่เพิ่ม Auth API และไม่ได้เปิดค้างไว้โดย Agent. `--prepare-vault`/`--vault-stdin` เป็น Internal anonymous-pipe hooks ของ PS runner ห้ามใช้ Export Credential ลงไฟล์ plaintext.

Staff ใช้ `fitm.staff1@example.test`/`fitm.staff2@example.test`; Teacher ใช้ Candidate ที่ผู้ใช้อนุมัติสำหรับ Development; Student ใช้รหัส 9900000000001–5 กับ University-shaped synthetic email ตาม Validation เดิม. English/Teacher emails/Department ยังเป็นข้อเสนอสำหรับ Development ไม่ใช่ข้อมูลทางการที่ยืนยันแล้ว. Google-only simulation เดิมคงอยู่ใน isolated fixtures; Student 5 ที่สร้างจริงเป็น Website account แยก ไม่สร้าง GoogleIdentity ปลอม.

ใช้ Private Upload API จริงสำหรับรูป 4 / Supporting files 12; Student 2 คงว่างสำหรับ Empty State. Student 4 ผ่าน actual NLP `pdf_text` 4-page Preview (ไม่เขียน) → Review → explicit Commit → persisted Profile/Document readback; Metadata ไฟล์รวม 13 แถวเพราะเก็บ PDF ฉบับเก่าที่ถูกแทนไว้ตามระบบเดิม (Active 12). Student 1/3 มี Education 3 / Training 5 / Skills 8 ต่อคน; Graduation year ของ Bachelor ที่กำลังศึกษาเป็น NULL. ไม่มีเลขบัตร/เบอร์ติดต่อบุคคลจริง.

Focused verification: actual HTTP Login+Current API 9 กรณี, SQL-backed Unified Auth service 30 Credentials, Profile read-back 5, private file read-back 16, ownership/wrong-role denial, 428/409 และ Save/restore เฉพาะ Fixture ใหม่ผ่าน. CLI `-Verify -Fixtures` ทำ Login/Upload จริง; `-VerifyDatabase -PdfTest` ตรวจ SQL-backed Auth และ **แก้/คืนค่า Profile fixture / Commit PDF** จึงไม่ใช่ read-only และไม่ควรรันโดยไม่ตั้งใจ. PDF commit รอบแรก Harness คาด 200 แต่ API สำเร็จ 201; แก้ Expected status และตรวจ Persisted History/Profile/Bytes ผ่าน ไม่มีการแก้ Parser/API เพื่อให้ผ่าน.

Production ยังต้องอนุมัติข้อมูล/Schema/Credential policy แยก; TODO Force Password Change on First Login และ Secure Production Credential Delivery. Browser fixture เริ่มแล้วปิดก่อน CDP จึงยังไม่มี Rendered Responsive acceptance; ไม่อ้าง API/VM เป็น Browser E2E.

รายละเอียดโหมด Review/Disposable เดิมด้านล่างยังใช้เป็นเครื่องมือเตรียมข้อมูลและ isolated fixtures โดยมีข้อแตกต่างของ Model/Authorization ปัจจุบันตามส่วนอัปเดตนี้.

## ข้อมูลที่ต้องตรวจและยืนยัน

- `accountPreparation.data.js` เก็บรายชื่อไทยตามผู้ใช้: Teacher 23 คน, Head คือ ผศ.ดร.ขนิษฐา นามี ผ่าน `is_department_head`; Staff 2 คน แยก Inventory.
- ชื่ออังกฤษ UPPERCASE ทั้ง 25 คนเป็น **Candidate จากการถอดเสียง รอยืนยันทุกคน** ไม่ใช่ชื่อทางการ. อีเมล Teacher เป็น Candidate ตาม `firstname.surname-initial@itm.kmutnb.ac.th` ตรวจรูปแบบ/ซ้ำภายในรายการแล้ว แต่ไม่ได้ตรวจเจ้าของ/Mailbox จริง. Staff ไม่มีการเดา Email หรือ Password.
- Teacher Model ปัจจุบันเพิ่ม `first_name_en`/`last_name_en` แล้ว พร้อม Fields เดิมและ Head flag. Major ยังไม่ทราบจึง NULL.
- Staff Model ปัจจุบันเพิ่ม `first_name_en`/`last_name_en`/Position/Department แล้ว. Role ยังมาจาก Actor store ไม่ใช่ Column ใหม่. Official Email ยังรอยืนยัน แต่ Development ใช้ example.test ตามคำสั่งใหม่ข้างต้น.
- Review mode เสนอ `active`/`is_active:true`; Review/Disposable CLI เดิมไม่สร้าง Production accounts. การสร้างจริงใน Development ใช้ Runner ที่อนุมัติใหม่ข้างต้น ไม่ลด Guard ของ Disposable runner.
- Requirement รหัสผ่านเริ่มต้นร่วมของ Teacher ถูกเลื่อนตามคำสั่งผู้ใช้ ไม่เก็บค่าจริงในไฟล์นี้/Source/Logs. **Production blocker:** ต้องตกลง Password policy, Force Password Change on First Login และ Secure Credential Delivery ก่อน Go-live; งานนี้ยังไม่เพิ่ม Authentication feature เหล่านี้.

## Dry-run ที่ไม่เชื่อม Database

รันจาก Repository root:

```cmd
node backend/src/seeders/prepareAccounts.js
node backend/src/seeders/prepareAccounts.js --inventory
node backend/src/seeders/prepareAccounts.js --disposable
```

Default review: Candidates Teacher 23 / Staff 2 แต่สร้าง **0 บัญชี**. `--inventory` แสดงข้อมูลให้ผู้ใช้ตรวจ. `--disposable` เป็น Preview อีกโหมดหนึ่ง: Teacher fixture clones 23 / Head 1 / Student 5 / Staff 0, Profiles 5 / Addresses 4 / Education 6 / Training 10 / Skills 16. Digest ผูกกับแผนและข้อมูลทั้งหมด ไม่ใช่ Password. ไม่มี DB connection/DDL/DML/ไฟล์ Output/อีเมล/Provider ใน Dry-run.

## Student fixture scenarios

| Scenario | Major / Track | ขอบเขต |
| --- | --- | --- |
| student-1 complete | IT / co_op | ข้อมูลส่วนตัว/บิดามารดา/ฉุกเฉิน, ที่อยู่ 2, การศึกษา 3 ระดับ, อบรม 5, ทักษะ 8, Asset bytes สำหรับทดสอบ Upload |
| student-2 incomplete | INE / internship | Academic บางช่อง NULL, English Profile, ไม่มี Child records |
| student-3 multiple_records | IT / co_op | 2 ที่อยู่ / 3 การศึกษา / 5 อบรม / 8 ทักษะ สำหรับ CRUD หลายรายการ |
| student-4 pdf_import | INE / internship | English Profile ขั้นต้น และ TGDE 4-page Text/AcroForm fixture เพื่อ Preview/Review/Confirm ภายหลัง |
| student-5 google_only_simulation | IT / co_op | ชื่อไทย NULL / English Profile / Password hash NULL ผ่าน Model context เดิม **ไม่มี GoogleIdentity/Provider/JWT ใหม่** จึงไม่ใช่บัญชี Google ที่ Login ได้จริง |

ชื่อ/ที่อยู่/ครอบครัวเป็นข้อมูลสมมติชัดเจน โทรศัพท์ `0000000000` ไม่ใช้ติดต่อ. ทักษะมี computer/language หมวดละ 4 รายการ ครบ `very_good`, `good`, `moderate`, `fair`. การศึกษาใช้ Enums ปัจจุบันและอบรม 5 แถว × 4 ช่องตาม Mapping เดิม ไม่เพิ่มช่อง PDF ที่ขาด/เลขบัตร/ลายเซ็น/Workflow หน้า 4.

Test layer มี Alias `student01@example.test` ถึง `student05@example.test`. Actual Student Model ปฏิเสธ Domain นี้ จึงแยก **Persistence adapter สำหรับ Disposable เท่านั้น** ใช้รหัสสมมติ `9900000000001`–`9900000000005` กับ `s<code>@email.kmutnb.ac.th`. เป็นรูปแบบสังเคราะห์ ไม่ยืนยัน Mailbox/ตัวตน/สถานะนักศึกษา และไม่ส่งอีเมล. ไม่ลด Validation. Teacher clones ใช้ `teacher01@example.test`–`teacher23@example.test` และ Department `FIXTURE_TEST_DEPARTMENT`; ไม่ใช้ Candidates ของบุคลากรจริงเพื่อเปิดบัญชี.

Class advisor ใช้ ID ของ Teacher ที่สร้างสำเร็จจริงใน Transaction เดียวกันก่อนสร้าง Student; ไม่ hardcode UUID. `coop_advisor_teacher_id=NULL` ทุกคน ไม่มีการสร้าง/ยืนยัน Project Advisor request. หากฐานทดสอบมีรายชื่อเดิมอยู่แล้วให้หยุดเพราะ Duplicate ไม่อัปเดต/จับคู่ข้ามบัญชีเอง.

## Safe asset fixtures

`accountPreparation.fixtures.js` คืน Bytes ใน Memory: `fixtureAssets(studentCode)` ให้ PNG 1px ไม่มีภาพบุคคล และ PDF ทดสอบ 4 ประเภท; `fixturePdf(studentCode)` สร้าง PDF 4 หน้า A4 พร้อม TGDE marker/English anchors/allowlisted AcroForm fields และ Identity สมมติของเจ้าของเท่านั้น. รองรับเฉพาะ 5 รหัส Fixture ข้างต้น ไม่มี JavaScript/Signature/External resources หรือการคัดลอกต้นแบบที่มีข้อมูลส่วนตัว.

ไม่ใช่สำเนาหน้าตา Official Form และไม่ใช่หลักฐาน OCR accuracy. PDF-parse อ่านจำนวนหน้า/Identity ได้ แต่การยอมรับด้วย NLP Import/Receipt/Preview/Conflict/Commit จริงยังต้องทดสอบเมื่อได้รับมอบหมาย. PDF ของแต่ละคนต้องใช้ `studentCode` ตรงกับ Owner; Default เป็น student-4. Supporting PDFs มีเนื้อหาแบบ Fixture เดียวกัน ไม่ใช่ Transcript/สำเนาบัตรทางการ. ไม่สร้างเลขบัตรประชาชน.

Provisioning นี้ **ไม่เขียน FileStorage/Metadata รูปหรือเอกสาร** และไม่แก้ `profile_image` ให้ชี้ไฟล์ที่ไม่มีอยู่. นำ Bytes ไปใช้กับ Existing upload API ใน Test layer ที่แยกต่างหากภายหลัง พร้อม Revision/If-Match/Explicit confirmation เดิม. ไม่มี Auto-import/Auto-save. "complete" หมายถึงข้อมูล Scalar/Child ที่เตรียมครบตามกรณี ไม่ใช่การรับรองเอกสาร/รูปหรือ Ready-to-Apply.

## Apply เฉพาะ Disposable — รออนุมัติแยก

ยังไม่รันคำสั่งนี้ในงานเตรียม. ผู้ใช้ต้องอนุมัติการรันแผนก่อน และจัดเตรียมฐานทดสอบ/Schema เดิม/Marker แยกเอง เครื่องมือนี้ไม่สร้างฐาน/Schema/Marker ให้:

- `NODE_ENV=test` เท่านั้น, Host `127.0.0.1`, Port ระบุชัดเจน, ชื่อ DB `fitm_fixture_` ตามด้วย `[a-z0-9_]` 8–48 ตัว. `intern_system`, Production และ Development จริงถูกปฏิเสธ.
- ระบุ `FITM_FIXTURE_DB_HOST`, `FITM_FIXTURE_DB_PORT`, `FITM_FIXTURE_DB_NAME`, `FITM_FIXTURE_DB_USER`, `FITM_FIXTURE_DB_PASSWORD` ผ่าน Runtime environment แบบไม่บันทึกใน Repository. ไม่อ่าน `.env` ไม่มี Connection defaults จาก App.
- ตรวจ Connection options + live `current_database`, public schema, PostgreSQL 16/no recovery และ `current_setting('fitm.fixture_disposable',true)='on'`. ไม่เปลี่ยน Marker อัตโนมัติ.
- ใช้ `--apply-disposable --confirm=<ชื่อฐาน> --approval=<Digest จาก Dry-run ที่ผู้ใช้อนุมัติ>`; รับ Password บัญชี Fixture ผ่าน Hidden TTY เท่านั้น ไม่ผ่าน CLI argument/Environment/Pipe. Password อยู่ Memory ชั่วคราว (JavaScript strings ไม่รับประกัน Secure erase). bcrypt มาจาก Model hooks เดิม.
- Explicit table locks + Duplicate detection ทุก Actor store/Student code/Teacher name ใน Transaction เดียว; Conflict หยุดทั้งแผน ไม่มี Upsert/Skip/Update บัญชีเก่า. ใช้ Actual Profile service prepare/apply เฉพาะ New owner ที่ยังไม่ Commit; counter เริ่ม 0 และ GET แรก derive Revision จาก Snapshot จริง หลังจากนั้น Save ใช้ API/If-Match เดิม.
- Exception ทำ Rollback ตาม Transaction เดิมและแสดงเฉพาะ Error code; หาก COMMIT acknowledgement ไม่ชัดเจนให้ตรวจฐานก่อน Retry ไม่รับรอง Rollback เมื่อผล Commit ไม่ทราบ. ไม่มี Credential/SQL/Row logging และไม่มี SMTP/HTTP/Google calls.
- เครื่องมือ **ไม่สามารถให้ Production approval ด้วย Flag**; ต้องมีงานและ Implementation แยกหลังแก้ Blockers. ไม่มี Reset/Truncate/Sync/Alter/ลบบัญชี/แก้สิทธิ์เดิม.

## Focused verification

```cmd
node backend/src/seeders/accountPreparation.test.js
```

Tests ใช้ Actual model factories/validators/bcrypt/Profile service/Unified resolver ร่วมกับ Fake transaction/store; Connection ถูกแทนด้วยตัวที่ Throw เสมอ. ตรวจ Guard/Duplicates/Schema gaps/Profiles/Role/Hook/Rollback/TTY/Asset structure. Fake Rollback ไม่ใช่ PostgreSQL acceptance. Test ไม่มี DB/SMTP/Provider calls หรือไฟล์ Output. Backend/Frontend Build และ Real Login ไม่จำเป็นต่อ Code เตรียมข้อมูลนี้ และไม่ได้ใช้ยกระดับผลทดสอบ.
