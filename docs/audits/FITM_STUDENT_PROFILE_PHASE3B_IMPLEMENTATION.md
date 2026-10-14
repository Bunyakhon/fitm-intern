# FITM-INTERN — Student Profile Phase 3B Implementation

วันที่ตรวจ: 11 ตุลาคม 2026 (Asia/Bangkok)

สถานะ **PASS สำหรับการกรอกเองผ่าน 5 Tabs** บน Backend/API/Schema เดิมจาก Phase 3A; ส่วนเลขบัตรประชาชน การรับรอง และลายเซ็น **BLOCKED ตามนโยบายเดิม** ไม่ได้สร้างการบันทึกจำลอง

อ่าน `docs/requirements/profile.pdf` ทั้ง 4 หน้าและรายงาน Field Mapping, Missing Fields, UX/UI Plan, Phase 1, Phase 2A, Phase 2B.2 และ Phase 3A ก่อนพัฒนา ใช้ชื่อ Property/Endpoint/Enum/ข้อจำกัดจาก Source ที่ติดตั้งจริงเป็นหลัก ส่วนข้อความไทยใน PDF ที่อ่านออกมาไม่สมบูรณ์ไม่ได้ใช้แทน Contract

ตรวจ Git Status/Diff ก่อนแก้ไขและเก็บ SHA-256 ของไฟล์เดิม 420 ไฟล์ไว้เทียบหลังทำงาน งาน Uncommitted จาก Phase ก่อนหน้า รวมถึง Internship Logs และหน้าอื่นยังอยู่ครบ ใน Phase นี้แก้ไฟล์เดิมเพียง 4 ไฟล์ของ Student Profile และเพิ่มไฟล์เฉพาะ UI/Regression/หลักฐาน ไม่มีการเปลี่ยน Backend business source หรือ Migration

## 1. รูปแบบ 5 Horizontal Tabs

Sidebar ยังคงเมนู “ประวัตินักศึกษา” เพียงรายการเดียว ภายในมี:

| แท็บ | พฤติกรรม |
|---|---|
| ประวัตินักศึกษา | แท็บเริ่มต้น แสดงข้อมูลนักศึกษา สุขภาพ และแบบฟอร์มเพิ่มเติม |
| ติดต่อ / ครอบครัว / ฉุกเฉิน | ที่อยู่สองประเภท ข้อมูลติดต่อ ครอบครัว และผู้ติดต่อฉุกเฉิน |
| การศึกษา / ทักษะ | Dynamic Cards สำหรับ Education, Training, Computer/Language Skills |
| เอกสารประกอบ | เอกสารส่วนบุคคล 5 ประเภท อัปโหลด/ดาวน์โหลด/แก้ชื่อกำกับ/นำออก |
| บัญชีผู้ใช้ | บัญชีเดิมแบบ Read-only |

ใช้ Tab controller เดิมเพิ่มอีกสองแท็บ ไม่ Reload หรือ GET ซ้ำขณะสลับแท็บ เก็บ Form node และ Draft ไว้ใน DOM มี `role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, roving tabindex, ArrowLeft/ArrowRight/Home/End และ Focus/Scroll ตามแท็บ WeakMap ป้องกัน Mount/Event listeners ซ้ำ

## 2. ฟิลด์ที่กรอกได้

| แท็บ | ฟิลด์และการทำงาน |
|---|---|
| ประวัตินักศึกษา | รูปโปรไฟล์เดิม; สาขา ชั้นปี GPA สะสม และอาจารย์ที่ปรึกษาตามสิทธิ์/รายชื่อที่ระบบเดิมอนุญาต; ภาควิชา คณะ GPA ภาคเรียนที่ผ่านมา; คำนำหน้า ชื่อภาษาอังกฤษ นามสกุลภาษาอังกฤษ วันเกิด เพศ ส่วนสูง น้ำหนัก ศาสนา เชื้อชาติ สัญชาติ; กรุ๊ปเลือด โรคประจำตัว; วันที่ออก/หมดอายุบัตร; มี/ไม่มีใบขับขี่ เลขที่ ประเภท วันหมดอายุ; ภาวะทหาร |
| ติดต่อ / ครอบครัว / ฉุกเฉิน | ที่อยู่ทะเบียนบ้านและปัจจุบันแบบมีโครงสร้าง: บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์; ที่อยู่/โทรศัพท์เดิมยังอยู่; บิดา/มารดา: ชื่อ อายุ อาชีพ ที่อยู่ โทรศัพท์; ผู้ปกครองเดิม: ที่อยู่และโทรศัพท์; ผู้ติดต่อฉุกเฉิน: ชื่อ ความเกี่ยวข้อง อาชีพ สถานที่ทำงาน ที่อยู่ โทรศัพท์ |
| การศึกษา / ทักษะ | Education: ระดับ สถานศึกษา วุฒิ วิชาเอก GPA ปีสำเร็จการศึกษา ค.ศ.; Training: ชื่อหลักสูตร/ดูงาน/ฝึกงาน สถาบัน วุฒิ/ประกาศนียบัตร ระยะเวลา; Skills: ประเภท ชื่อ ระดับ; ข้อความความสามารถพิเศษ/ทักษะเดิมยังอ่านและแก้ผ่าน Modal เดิมได้ |
| เอกสารประกอบ | เลือกไฟล์ต่อประเภทและชื่อกำกับ (`label`); เอกสารอื่นต้องมีชื่อกำกับ; ชื่อไฟล์ต้นฉบับ วันที่ รุ่น และสถานะจาก DTO; ไม่มีการแก้ path หรือ byte content ผ่าน metadata |
| บัญชีผู้ใช้ | แสดงอย่างเดียว ไม่มี Form mutation |

เก็บ Profile Edit Modal เดิมสำหรับ 28 ฟิลด์พร้อม Dirty Fields แยกแท็บภายใน เพื่อรักษาข้อมูลสุขภาพ/ข้อความ/ครอบครัวที่มีอยู่แล้ว แบบฟอร์มใหม่ส่งเฉพาะฟิลด์จริงที่เพิ่มใน Phase 2A/3A ไม่สร้าง Profile fields เพิ่ม

อายุคำนวณจากวันเกิดเดิม ไม่มีคอลัมน์อายุใหม่ ที่อยู่แบบมีโครงสร้างไม่แทนที่ legacy address TEXT อัตโนมัติ ตารางที่อยู่ไม่มีคอลัมน์โทรศัพท์ จึงแสดง/แก้เบอร์จากฟิลด์เดิม

“ใช้ที่อยู่เดียวกับทะเบียนบ้าน” แสดง Custom Confirmation และคัดลอกค่าที่เห็นในแบบฟอร์มไปเป็น Draft ของที่อยู่ปัจจุบันเท่านั้น ไม่บันทึกอัตโนมัติและไม่เปลี่ยนที่อยู่ข้อความเดิม

เลือกไม่มีใบขับขี่จะซ่อนรายละเอียด หากมีค่าเก่าจะขอคำยืนยันการล้างใน Draft ก่อน ผู้ใช้ยกเลิกได้โดยค่าเก่ายังอยู่ ต้องบันทึกอีกครั้งจึงส่ง null; Server ป้องกันสถานะไม่มีแต่ยังมีรายละเอียดไม่สอดคล้องกัน

## 3. Read-only และสิทธิ์

ชื่อไทยของเจ้าของบัญชี รหัสนักศึกษา Email บัญชี/ติดต่อ วิธีเข้าสู่ระบบ และสถานะ/ข้อมูลระบบยัง Read-only อายุเป็นค่าคำนวณจากวันเกิด ข้อมูลบัญชีมาจาก `/api/auth/me` และ Profile DTO เดิม ไม่มี Password/Google OAuth management ใหม่

การเลือกอาจารย์ที่ปรึกษาคงกระบวนการ/รายชื่อเดิม ไม่เปิดให้ส่ง identity/owner/status หรือแก้บัญชีอื่น แบบฟอร์มสร้าง Payload ผ่าน Field allowlist ไม่ส่ง DTO ทั้งก้อนกลับไปบันทึก Backend ยังเป็นผู้ตรวจ Authentication, Authorization, Ownership และ Mass Assignment ตาม Phase 3A

ไม่มี Sensitive Profile Draft ใหม่ใน Local Storage ข้อมูลที่ผู้ใช้กรอกเก็บในหน่วยความจำของหน้าเท่านั้น การ cache ข้อมูล Student พื้นฐานที่ระบบ Auth เดิมมีอยู่ไม่ได้ถูกขยายใน Phase นี้

## 4. ฟิลด์ BLOCKED

- **BLOCKED — เลขบัตรประชาชน:** ไม่สร้าง input เลขบัตรหรือส่ง `national_id`, ciphertext/key version รอนโยบายการจัดการข้อมูลดังกล่าว วันที่ออก/หมดอายุและสำเนาบัตรใช้ API ที่ได้รับการรองรับแล้ว
- **BLOCKED — การรับรอง/ลายเซ็น:** แสดงข้อความสถานะเท่านั้น ไม่มี Checkbox “รับรองแล้ว” ไม่มีการเซ็น ไม่มีการสร้างข้อมูลซ้ำกับคำร้อง/Approval Workflow
- **ไม่ได้พัฒนา — PDF Import/OCR:** Profile PDF เป็นการเก็บไฟล์ต้นฉบับเท่านั้น ไม่มี Extract/Import/Apply fields

## 5. API ที่เชื่อมต่อและ Contract

Prefix: `/api/student-profile` ใช้ Endpoint เดิมทั้งหมด ไม่มี Backend Contract change

| Endpoint | การใช้ใน Frontend |
|---|---|
| GET `/me` | โหลด Aggregate snapshot: student/profile, addresses, education, training, skills, documents, profile_revision; ใช้ครั้งเดียวสำหรับหลายแท็บ |
| PUT `/me` | Partial update scalar Profile ผ่าน Modal/แบบฟอร์มส่วนตัวและครอบครัว |
| PUT `/student-info` | Partial update ข้อมูลนักศึกษาเดิมและ department/faculty/last_semester_gpa |
| GET `/{addresses,education,training,skills}` | API adapter อ่าน collection ตาม Contract; หน้าใช้ array ที่มากับ Aggregate แทนการ GET ซ้ำทุกแท็บ |
| POST `/{addresses,education,training,skills}` | เพิ่ม child record |
| PATCH `/{addresses,education,training,skills}/:id` | แก้เฉพาะฟิลด์ของ record |
| DELETE `/{addresses,education,training,skills}/:id` | ลบตาม Ownership/Revision; UI ที่อยู่สองประเภทใช้ Create/Update ส่วน Education/Training/Skills มีปุ่มลบ |
| GET `/documents` | Adapter อ่าน metadata; หน้าใช้ documents จาก Aggregate |
| POST `/documents/:fileType` | Multipart: `document`, `label`; If-Match และ progress จาก transport จริง |
| PATCH `/documents/:id` | แก้ `label` ของไฟล์ |
| DELETE `/documents/:id` | นำเอกสารออกตาม logical removal ของ Backend ไม่ลบข้อมูล/bytes เอง |
| GET `/documents/:id/download` | Authenticated blob download; private response ไม่มี Public URL |
| GET/POST `/profile-image` | รูปโปรไฟล์เดิม; POST ส่ง If-Match ตาม Phase 3A |
| GET `/api/auth/me` | ข้อมูลบัญชี Read-only เดิม |

Resume endpoint/workflow แยกเดิม ไม่ถูกนำเข้ามาใน Aggregate หรือแก้ไข

ทุก Profile mutation ส่งค่า `profile_revision` ที่ได้จาก Server เป็น `If-Match` ตามรูปแบบ opaque quoted token เดิม ไม่แปลงเป็นเลขหรือคำนวณ token เอง JSON ส่งเฉพาะ Dirty Fields; ฟิลด์ที่ไม่ได้ส่งไม่เปลี่ยน ส่วนล้างค่าที่อนุญาตส่ง null เอกสารส่ง FormData ผ่านระบบ private storage เดิม

Enum ตาม Source: Education = `bachelor/high_vocational/high_school_vocational`; Skill category = `computer/language`; proficiency = `very_good/good/moderate/fair` หรือ null; military = `served/not_yet_served` หรือ null

เอกสาร: `transcript/national_id_copy/student_id_copy/supporting_other/external_profile_pdf` ไม่เพิ่มชนิดใหม่

## 6. CRUD ที่ใช้งานได้

**PASS — Actual Browser + production API + isolated PostgreSQL:** บันทึก Personal/Family/Emergency เพิ่มเติม, Create/Update ที่อยู่สองประเภท, Create/Update/Delete Education และ Training, CRUD Skills ทั้งสองหมวด, อ่านค่าหลังบันทึก, อัปโหลดเอกสารทั้ง 5 ประเภท, เปลี่ยนชื่อกำกับเอกสาร และนำเอกสารออก

ทดสอบปุ่มดาวน์โหลดจริงจาก Browser ผ่าน private blob และตรวจว่า bytes ที่ดาวน์โหลดเท่ากับ private download endpoint พร้อม `Cache-Control: no-store` Metadata ไม่มี storage_path/public URL

Dynamic Cards ไม่ล็อกจำนวน Training ไว้ 5 รายการ ไม่มี Full Array Replace การลบรายการและการทิ้งรายการใหม่ใช้ Shared Custom Confirmation ไม่ใช้ window.alert/window.confirm

## 7. Dirty Fields, Draft และ If-Match

แต่ละ Section/Child/Document label editor มี Baseline, Draft และ Revision แยกกัน สลับแท็บหรือ Refresh จาก API ไม่ล้างค่าที่แก้ไว้ ผลบันทึกของตัวเอง advance Revision ให้ Draft อื่นเฉพาะเมื่อ token เดิมตรงกับฉบับที่เพิ่งบันทึก ไม่ rebase Draft เก่าจากอีก Browser โดยเงียบ ๆ

Capture ค่าอีกครั้งเมื่อ Response กลับมาเพื่อรักษาการพิมพ์ระหว่างรอ API ฟิลด์ที่พิมพ์หลังส่งยัง Dirty และบันทึกครั้งต่อไปได้ ผล GET เก่าที่กลับมาหลัง mutation ถูกยกเลิกด้วย load sequence ปรับ Loading/status ให้สะท้อนฉบับที่บันทึกล่าสุด ไม่มีข้อความกำลังโหลดค้างจาก GET ที่ถูกแทนแล้ว

ใช้ global save guard ร่วมกับ photo/academic/Modal writers เดิม ป้องกัน duplicate click และ mutation พร้อมกันจากหน้าเดียว Button Loading + inline status + Shared Toast มีผลจริง ไม่แสดง Success ก่อน API ยืนยันผล

ออกจากหน้า Profile/Logout ขณะมี Draft ใช้ Custom Confirmation; ปิด Browser/Hard Reload มี beforeunload และข้อความชัดเจนว่าไม่มี Auto-save **Draft ที่ยังไม่บันทึกไม่คงอยู่หลัง Hard Reload** ไม่อ้างว่ารักษาข้อมูลผ่าน storage ที่ไม่ได้อนุมัติ

## 8. Conflict, Validation และ Error Handling

- **409:** เก็บ Draft/token เดิม แสดงค่าที่แก้เทียบกับฉบับ Server ให้เลือก Custom Confirmation “โหลดล่าสุดและเก็บค่าที่แก้” หรือ “ทิ้งการแก้ไขหมวดนี้” แล้วตรวจและกดบันทึกเอง ไม่ auto retry/overwrite; child ที่ Server ลบแล้วไม่ถูกสร้างกลับอัตโนมัติ
- **428:** เก็บ Draft แจ้งโหลดข้อมูลล่าสุด ไม่มีการเดา Revision; เอกสารยังเก็บ file selection และเปิดทางให้ตรวจข้อมูลก่อนอัปโหลดอีกครั้ง
- **Network/5xx/ผล commit ไม่ชัดเจน:** แจ้งว่ายังยืนยันไม่ได้ ให้โหลดและตรวจค่าก่อนลองอีกครั้ง ไม่กล่าวว่า transaction ไม่เคย commit; Backend rollback/cleanup handling จาก Phase 3A ไม่ถูกแก้
- **401/403:** ใช้การยกเลิก session/redirect เดิม ไม่เปิดเผยเอกสารให้ session ที่หมดสิทธิ์
- วันเกิดใช้ Calendar validation เดิม; วันที่เอกสาร/ใบขับขี่ตรวจวัน เดือน ปีจริง รวม leap year และวันหมดอายุบัตรไม่ก่อนวันออกบัตร
- GPA 0–4 ไม่เกิน 2 ทศนิยม; graduation year เป็น Safe Integer 1–9999 ค.ศ.; ชั้นปีเดิม 1–4; อายุบิดา/มารดาตรวจ Safe Integer และช่วง INT PostgreSQL; Text length/control characters/โทรศัพท์/Enum ตามข้อกำหนด Server
- Optional fields อนุญาต null และ Draft ไม่บังคับครบทุกช่อง; Required discriminator เช่น education_level/category คงตาม Backend
- เอกสาร Frontend ตรวจ MIME+extension, nonempty, ไม่เกิน 10MB, Profile PDF เป็น PDF เท่านั้น และชื่อกำกับเอกสารอื่น; Backend เดิมตรวจ signature/ขนาดจริง/ownership เพิ่มเติม
- Upload Progress แสดงจาก onUploadProgress ของ transport รวมข้อความรอระบบยืนยันหลัง bytes ส่งครบ ไม่มีเปอร์เซ็นต์จำลอง

## 9. Responsive / UI จริง

**PASS — Microsoft Edge headless จริง:** ตรวจทุกแท็บที่ 1440/1366/768/390px รวม 20 screenshots ไม่มี horizontal overflow ของหน้าหลัก แถบแท็บและ sidebar มือถือเลื่อนตามโครงสร้างเดิม แบบฟอร์มใหม่ 2 คอลัมน์ Desktop และ 1 คอลัมน์จอเล็ก มี focus indicator และ touch controls ขั้นต่ำ 44px

CSS ใหม่ scope ใต้ `#panel-profile` ใช้สี/ตัวแปรจาก main.css และ Shared Feedback เดิม ไม่แก้ shared stylesheet/Sidebar layout ของหน้าอื่น ภาพใช้ Synthetic Student เท่านั้น เป็น viewport screenshots ไม่ใช่ภาพทุกส่วนของหน้าเต็มความยาว

ตัวอย่างหลักฐาน: [Desktop](evidence/student-profile-phase3b/1440-personal.png), [Tablet](evidence/student-profile-phase3b/768-education.png), [Mobile](evidence/student-profile-phase3b/390-documents.png); ภาพครบทั้ง 20 อยู่ในโฟลเดอร์เดียวกัน

## 10. Tests / Build / PostgreSQL

| การตรวจรอบสุดท้าย | จำนวนทั้งหมด | PASS | SKIP | FAIL | สถานะ |
|---|---:|---:|---:|---:|---|
| Frontend `node --test test/*.test.js` | 296 | 294 | 2 | 0 | PASS |
| Backend `node --test` | 259 | 239 | 20 | 0 | PASS |
| Edge + production API + isolated PostgreSQL | 16 | 16 | 0 | 0 | PASS |
| Frontend production build | — | — | — | 0 | PASS |
| JavaScript syntax 8 files / HTML parse + unique 349 IDs | — | — | — | 0 | PASS |
| git diff --check | — | — | — | 0 | PASS |

เพิ่ม 13 Frontend regression tests ครอบคลุม Tab contract/default, partial update/intentional null, own/foreign revision, draft ขณะรอ Response, Calendar/leap centuries, Safe Integer/GPA, nullable levels, document validation และ exact API adapter paths/methods/If-Match/blob/progress

Browser 16 กรณีครอบคลุม actual full dashboard bootstrapping, keyboard/switch/no extra GET, Draft สองหมวด, ที่อยู่/copy/leading zero, Education/Training/Skills CRUD, สอง Browser Tabs กับ 409, 428 UI, เอกสารทุกประเภทและ label/private download/removal, stale GET/late typing/save guard, ใบขับขี่ null confirmation, idempotent mount/unsaved departure, Read-only/Policy/hidden calendar/Resume เดิม และ Responsive ไม่พบ Runtime.exceptionThrown ในรอบสุดท้าย

**ข้อแยกแยะ:** 428 UI case ใช้ test-only middleware บังคับสถานะเพื่อพิสูจน์ข้อความ/การรักษา Draft; 409, CRUD, Upload, revision และ persistence ใช้ production route/controller/Sequelize จริง การ hold Response สำหรับ stale GET/PUT เกิดหลัง Query/Commit จริง ไม่ใช่ fake save

Backend opt-in integration 20 tests ถูกข้ามในชุดทั่วไปโดยไม่ใช้ฐานข้อมูลจริง Browser runner รัน opt-in ของ Phase 3B แยกต่างหากแล้วผ่าน 16 กรณี จำนวน SKIP จึงไม่ได้หมายความว่ากรณี Browser นี้ไม่ถูกทดสอบ Frontend 2 SKIP เป็น Browser/PG ของ Co-op prerequisite/approval acceptance เดิม ไม่ได้รันเพิ่มเติมกับข้อมูลจริง

Schema-only pg_dump/pg_restore ไปยังฐานข้อมูล Synthetic แยก ไม่มีการรัน Migration ไม่มีการ copy rows นักศึกษาจริง ทดสอบด้วย production API ใน isolated server และ Edge profile ชั่วคราว พร้อม JWT สำหรับ Synthetic owner เท่านั้น

อ่าน `intern_system` แบบ READ ONLY เทียบ baseline Phase 2B.2:
- **PASS:** Schema SHA-256 `635c6050d74f89511d9698cd32e8a81423b1a50d652f88fe1cc8380686601a6f`
- **PASS:** 33 tables, 398 columns, 169 constraints, 83 indexes, 32 enums, 5 triggers, 23 ledger entries
- **PASS:** 022–025 Executed, 019–021 Pending
- **PASS:** checksum/count ทุก 28 ตารางเดิมเทียบ recovery manifest; ทุก 32 ตารางข้อมูลก่อน/หลัง Browser runner ไม่เปลี่ยน
- **PASS:** students 4, profiles 2, student_files 3; ตารางใหม่ address/education/training/skills ยัง 0 ใน Development
- **PASS:** prepared schema/models/migrations 7 ไฟล์ SHA เดิม; Backend source เดิมไม่ถูกแก้ใน Phase นี้
- ไม่มี migration/reset/drop/truncate/real-account writes; ฐาน Synthetic จากการทดสอบ 7 ฐานเก็บไว้ตามข้อห้าม Drop และปิด Role ด้วย NOLOGIN/PASSWORD NULL หลังทุกครั้ง เก็บ synthetic private files/Edge profiles ใน OS temp แยกจากบัญชีจริง ไม่มี token/password/ข้อมูลจริงในภาพหรือรายงาน

รอบก่อนหน้ามี FAIL จาก native click ตอน Custom Confirmation กำลังปิด/Toast บัง, document form ซ้อนกัน และ Loading/status ของ stale GET แก้ source/form structure และปรับ Browser harness ให้รอ animation/geometry จริง แล้วรันทดสอบซ้ำจน PASS หลักฐานรอบก่อนหน้าเก็บไว้ใน evidence JSON ไม่ลบประวัติ FAIL

หลักฐานรอบสุดท้าย:
- [Browser Results](FITM_STUDENT_PROFILE_PHASE3B_BROWSER_RESULTS.json)
- [Read-only Database Verification](FITM_STUDENT_PROFILE_PHASE3B_DATABASE_VERIFICATION.json)
- [Test/Build/Syntax/Preservation Results](FITM_STUDENT_PROFILE_PHASE3B_CHECK_RESULTS.json)

## 11. ไฟล์ที่แก้ไข/เพิ่มใน Phase นี้

ไฟล์เดิมที่แก้:
- `frontend/src/student_coop/student_coop.html` — 5 Tabs/containers/draft notice/contact Email/policy messages
- `frontend/src/pages/student_coop.js` — bridge revision/snapshot/draft writers, nullable academic validation, unsaved confirmation และสถานะ Reload
- `frontend/src/pages/studentProfileDraft.js` — Safe Integer ฝั่ง Client สำหรับอายุบิดา/มารดาใน Modal เดิม
- `frontend/src/api/studentProfile.api.js` — adapters สำหรับ child CRUD/documents/private blob ตาม Contract เดิม

ไฟล์ใหม่:
- `frontend/src/pages/studentProfileWorkspace.js` — sections/dynamic records/documents/conflict UI
- `frontend/src/pages/studentProfileWorkspaceDraft.js` — field specs, canonical validation และ section draft
- `frontend/src/styles/student_profile.css` — styles scope Profile
- `frontend/test/studentProfileWorkspace.test.js` — 13 regression tests
- `backend/test/studentProfilePhase3BBrowser.test.js` — guarded actual Browser/production API/PG tests
- `backend/scripts/runStudentProfilePhase3BIntegration.js` — schema-only isolated harness และ development preservation checks (QA เท่านั้น)
- `docs/audits/FITM_STUDENT_PROFILE_PHASE3B_IMPLEMENTATION.md`
- `docs/audits/FITM_STUDENT_PROFILE_PHASE3B_BROWSER_RESULTS.json`
- `docs/audits/FITM_STUDENT_PROFILE_PHASE3B_DATABASE_VERIFICATION.json`
- `docs/audits/FITM_STUDENT_PROFILE_PHASE3B_CHECK_RESULTS.json`
- `docs/audits/evidence/student-profile-phase3b/` — 20 screenshots และผลรอบทดสอบก่อนหน้า

ไม่แตะ Backend business source/API contract/schema, main.css, student_coop.css, Internship Logs, Calendar, Resume, โครงการสหกิจ, Approval Workflow, dashboard ของบทบาทอื่น, Google OAuth หรือ Uncommitted audit/source เดิม ไม่มี Commit/Push

## 12. NOT TESTED และข้อจำกัด

- **NOT TESTED:** เขียน Profile ด้วยบัญชีนักศึกษาจริง/Production Database — ไม่มีการอนุญาตแก้ข้อมูลจริง และไม่ได้ทำ
- **NOT TESTED:** Password/Google OAuth login flow ใน Browser รอบนี้ — ใช้ Synthetic JWT แต่ GET /api/auth/me และ authorization ของ production middleware ทำงานจริง
- **NOT TESTED:** manual acceptance โดยผู้ใช้จริง, Safari/Firefox/อุปกรณ์มือถือจริง, Screen Reader/การรับรอง WCAG เต็มรูปแบบ — Edge headless/geometry/ARIA keyboard เท่านั้น
- **NOT TESTED:** Browser end-to-end ของทุกเมนู/ทุกบทบาท — ชุด Existing tests ผ่านและ Source ที่ไม่เกี่ยวข้องไม่เปลี่ยน แต่ไม่กล่าวว่าได้เปิดทุก workflow จริง
- **NOT TESTED ใน Phase 3B:** PostgreSQL integration ชุด Phase 3A 31 กรณี/ชุด rollback injection เดิมซ้ำทั้งหมด — หลักฐาน Phase 3A ระบุ PASS; Backend services ไม่เปลี่ยน และ existing offline regression ผ่าน การบันทึก/ไฟล์หลายประเภทใน Phase 3B ผ่าน PG จริง
- **NOT TESTED:** Network failure จริงหลัง commit/slow mobile network และ actual storage failure injection จาก Browser — UI แสดงผลยังไม่ยืนยันและรักษา Draft; ไม่อ้างว่าทดสอบ fault injection ทุกชนิด
- **NOT TESTED:** Antivirus, PDF content parsing/viewer compatibility และ PDF Import/OCR — เก็บ/ดาวน์โหลดไฟล์เท่านั้น test PDF ใช้ fixture signature สำหรับ storage contract ไม่ใช่เอกสารแบบฟอร์มจริง
- Draft ระหว่างสลับแท็บ/Refresh API ผ่าน แต่ Hard Reload ไม่ persist draft; แสดงข้อจำกัดและก่อนออกจากหน้า ไม่เพิ่ม sensitive Local Storage

ไม่มี FAIL ที่ยังค้างในชุดที่รันจริง ส่วน BLOCKED policy และ NOT TESTED ข้างต้นเป็นข้อจำกัดที่ยังเหลือ

## 13. ความพร้อมสำหรับ Phase 4

Frontend manual entry พร้อมใช้ Aggregate API และ Private File Storage เดิมเพื่อกรอก/แก้ไข/เพิ่ม/ลบข้อมูลที่ได้รับการรองรับแล้ว มี partial payload/revision/conflict review และ UI รองรับการตรวจค่าก่อนบันทึก

Phase 4 ยังไม่เริ่ม ต้องได้รับคำสั่งแยกก่อนออกแบบ PDF Import/OCR, confidence/field matching และการยืนยันค่าจากเอกสารก่อนส่งเข้า API รวมถึง policy สำหรับเลขบัตรประชาชน การรับรอง และลายเซ็นที่ยัง BLOCKED หยุดหลัง Phase 3B นี้
