# FITM-INTERN — Auth Phase 2: Remember Me

วันที่: 11 ตุลาคม 2026 (Asia/Bangkok)

สถานะ: **PASS ในขอบเขต implementation/unit/DOM/build; Browser E2E NOT TESTED; Production Ready: NO**

## Source และ baseline

ตรวจ `frontend/login.html:156` (Checkbox เดิม), `frontend/src/pages/login.js`, `frontend/src/api/client.js`, `frontend/src/pages/student_coop.js`, `frontend/src/pages/index.js`, `frontend/src/pages/studentSupervision.js`, Shared Feedback `frontend/src/ui/feedback.js:16,109,126`, Backend `backend/src/controllers/auth.controller.js:150`, `backend/src/middlewares/auth.middleware.js:30`, auth routes/model และ tests ที่เกี่ยวข้อง

อ้างอิง `README.md:5,76`, `HANDOFF_fitm-intern.md:41,146,156` และ Auth Phase 1 Audit ในบทสนทนา ไม่สร้างหรืออ้างว่ามีไฟล์ Phase 1 Audit แยกที่ไม่ได้พบจริง

Git baseline: 18 Modified / 107 Untracked entries รวม 125 entries มีงาน Student Profile เดิมอยู่แล้ว ไม่ reset/stash/clean/checkout/commit/push

## Files ที่แก้ในงานนี้

- ใหม่: `frontend/src/auth/studentAuthStorage.js`
- แก้: `frontend/src/pages/login.js`, `frontend/src/api/client.js`, `frontend/src/pages/student_coop.js`
- แก้เฉพาะ Student auth compatibility: `frontend/src/pages/index.js`, `frontend/src/pages/studentSupervision.js`
- ใหม่: `frontend/test/studentRememberMe.test.js`
- ปรับ dependency mock ของ VM fixtures: `frontend/test/studentAdvisor.test.js`, `frontend/test/studentProfileIntegrity.test.js`, `frontend/test/studentProfileAggregateCompatibility.test.js`
- ใหม่: รายงานฉบับนี้

Checkbox HTML, CSS/Responsive, Shared Feedback, Teacher/Head/Staff login sources และ Backend ไม่เปลี่ยน ไม่เปลี่ยน Sidebar/Workflow และไม่เปิด Calendar; hidden Calendar condition เดิมยังอยู่ เพิ่มเพียง auth storage adapter ที่ call site หาก panel ถูกเปิดโดย source ที่ได้รับอนุญาตในอนาคต

## Storage / session behavior

| กรณี | พฤติกรรม |
| --- | --- |
| ไม่เลือก Remember Me | `token`/safe Student snapshot อยู่ใน sessionStorage เท่านั้น Reload อยู่ใน tab session เดิมได้ ไม่มี credential ใน localStorage |
| เลือก Remember Me | Application JWT อยู่ใน localStorage ใช้ keys เดิมเพื่อ compatibility พร้อม binding ของ token/generation แบบ atomic และ tab-bound copy ใน sessionStorage |
| Metadata | `studentAuthEvent` ใน localStorage มีเพียง version/generation/mode ไม่มี credential/ข้อมูลบุคคล; metadata ของ tab อยู่ที่ `studentAuthSession` |
| Legacy local token ไม่มี mode | JWT ที่รูปแบบ/exp ใช้ได้ถูกย้ายเป็น session ของ tab นี้ ล้าง local credentials ไม่ตีความว่าเคยเลือก Remember Me ต้องผ่าน Backend `/api/auth/me` ก่อนแสดง Dashboard |
| Token เก่าในทั้งสอง storage โดยไม่มี metadata | ยึด token ของ tab และล้าง local token เก่า ไม่เลือกบัญชีจาก local fallback |
| Metadata ใหม่ขัดกัน / persistent copies ไม่ตรง | Fail closed; block tab ด้วย tombstone ที่อยู่ข้าม Reload ไม่ adopt บัญชีอื่นแบบเงียบ ๆ |
| JWT expired/malformed | ไม่ส่ง Bearer token ล้าง credential ที่เกี่ยวข้อง ไม่ fallback ไปบัญชีอื่น |
| Backend `/me` ตอบ 401/403/404 | ล้างสถานะของ request เดิมและไป Login; delayed response ของบัญชีเก่าไม่ล้าง Login ใหม่ |
| Network/timeout/5xx | รักษา session และ Draft; ไม่แสดง cached identity ก่อน Backend ยืนยัน มี Shared Action Modal ให้ retry |
| Resource 404 หลัง auth ผ่าน | ไม่ใช้ resource failure เป็นเหตุล้าง session |
| Multiple tabs | Persistent login ใช้ใน fresh tab ได้; session-only ไม่แชร์ credential ไป fresh tab; explicit login ใหม่ invalidates Student tabs รุ่นเก่าและ Logout แจ้ง peers ผ่าน storage event |
| Logout | ล้าง token/student/persistent binding ทั้งสอง storage รักษา role keys และข้อมูลที่ไม่ใช่ auth ไม่มี storage.clear() |

`studentAuthStorage.js:12` decode JWT เพื่อ shape/exp เท่านั้น **ไม่ได้ตรวจ signature ใน Browser** Backend verification ยังเป็น authority ตามเดิม

`studentAuthStorage.js:162` subscribe storage changes และตั้ง timer ตาม `exp` ที่ Backend ออก ไม่เพิ่ม lifetime; background timer อาจถูก browser throttle แต่ทุก token read/API request ตรวจ expiry ซ้ำ

`student_coop.js:252` ตรวจ `/api/auth/me` ก่อน render; `:3910` ตรวจซ้ำเมื่อ history คืน document จาก BFCache

`client.js:50` ป้องกัน late response/401 จาก Student session รุ่นเก่า โดยคืน client-side `409 STUDENT_SESSION_CHANGED` แทนการใช้ข้อมูลบัญชีเก่าหรือล้าง Login ใหม่ ไม่เปลี่ยน Backend API contract; explicit role Bearer requests/auth:false คงเดิม

## UX / Draft preservation

`login.js:65,99` อ่าน Checkbox เดิมและ save Application session หลัง Login สำเร็จ มี loading/double-submit guard ระหว่าง request และช่วงรอ navigation; Checkbox ถูก disable ระหว่าง request คืนค่าเมื่อจบ ไม่ reset choice เมื่อ Login ล้มเหลว ไม่เขียน password ลง storage และล้าง password input หลังสำเร็จ

`student_coop.js:1784,1788` ล้างเฉพาะ auth keys; dirty Profile Logout ใช้ Shared Confirmation เดิมก่อนล้าง session/นำทาง เมื่อ session เปลี่ยนจากอีก tab หรือหมดอายุและมี Draft ใช้ Shared Action Modal ให้เก็บข้อมูลก่อนกลับ Login ไม่ส่ง Draft ไปบัญชีใหม่ การยืนยันออกจาก document ยังทิ้ง memory Draft ตามพฤติกรรมเดิม ไม่มี persistent Draft/autosave เพิ่ม

## JWT compatibility / security limits

- Backend issuing/verification/secret ไม่เปลี่ยน ใช้ `exp` จริงของ JWT ไม่ hardcode 1 วันใน Frontend; Backend fallback `JWT_EXPIRES_IN || "1d"` ยังเหมือนเดิม
- ไม่เพิ่ม refresh token, server session หรือ revocation ไม่มี migration/schema/database writes
- Persistent JWT ใน localStorage และ tab JWT ใน sessionStorage อ่านได้จาก JavaScript จึงยังมีความเสี่ยง XSS ไม่มีการอ้างว่าปลอดภัยเทียบเท่า HttpOnly cookie
- Logout/generation invalidation เป็น Frontend behavior **ไม่ใช่ server JWT revocation** สำเนา signed JWT อาจยังใช้ได้จนหมดอายุตาม Backend
- LocalStorage ไม่มี native TTL; cleanup เกิดเมื่ออ่าน token/expiry timer ทำงาน Metadata ที่ไม่มี credential อาจยังอยู่
- Page session รองรับ Reload/restore; browser ที่มี opener อาจ copy sessionStorage และ browser restore อาจคืน page session เดิม จึงไม่รับรองทุก browser close/restore policy ดู [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- Cross-tab notification ใช้ [storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event); storage-disabled/quota errors fail closed ไม่รายงาน Login สำเร็จ

## Regression results ที่รันจริง

| Check | PASS | FAIL | SKIP | ขอบเขต |
| --- | ---: | ---: | ---: | --- |
| Remember Me | 38 | 0 | 0 | Storage/actual Login module+HTML/shared feedback, Dashboard functions, actual client interceptor, mocked Backend responses |
| Frontend suite รวม Remember Me | 350 | 0 | 2 | Unit/DOM; 38 รายการข้างต้นเป็นส่วนหนึ่งของ 350 ไม่บวกซ้ำ |
| Backend roleAuth | 4 | 0 | 0 | JWT/actor guards และโหลด routes ไม่ start server/เชื่อม DB |
| Backend staffAuth | 8 | 0 | 0 | In-memory model validation/handler mocks/JWT |
| Vite build | PASS | — | — | native config loader, temporary output, 130 modules |
| Syntax / git diff --check | PASS | — | — | Source ใหม่/แก้ และ whitespace check |

คำสั่ง Frontend (จาก `frontend`):

```text
node --test --test-isolation=none --test-reporter=tap test/*.test.js
```

Backend (จาก `backend`, รันแยกไฟล์):

```text
node --test --test-isolation=none test/roleAuth.test.js
node --test --test-isolation=none test/staffAuth.test.js
```

Build: `node node_modules/vite/bin/vite.js build --configLoader native --outDir <new temporary directory>` ไม่ใช้ emptyOutDir ไม่เขียนทับ dist/evidence เดิม

Default config-bundling build attempt มี spawn EPERM และ native Tailwind dependency bundling error จึงใช้ supported native loader รันผ่าน ไม่แก้ dependencies/config เดิม ไม่อ้างว่า default npm build command ถูกแก้แล้ว

ระหว่างพัฒนาพบ FAIL 1 รายการใน VM test harness เพราะ const export ไม่เป็น context property แก้ harness ให้ประเมิน export ภายใน VM แล้ว targeted/full suite รอบสุดท้ายผ่าน ไม่มี application FAIL ค้าง

ครอบคลุมทั้ง 15 กลุ่มที่ร้องขอ: checked/unchecked login, Reload/new session, expired/invalid token, Logout สองโหมด, legacy/dual storage, failed login/double submit, Profile/Draft, API Bearer, multiple tabs และ network failure เพิ่ม expiry timer, storage event, concurrency binding, quota failure, late response และ history restoration

## Status / Git / Next phase

- **PASS:** Implementation, 38 Remember Me tests, Frontend/Backend scope ข้างต้น, native-loader build, syntax/diff checks
- **PARTIAL:** Browser lifecycle assurance จำกัดด้วย native page-session/restore policy และ Frontend-only logout; default build-loader portability ยังมีข้อจำกัดที่พบ
- **FAIL:** ไม่มี FAIL ค้างใน final test scope
- **BLOCKED:** ไม่มี blocker ของ Remember Me ที่ต้องเปลี่ยน Backend/schema
- **NOT TESTED:** Browser E2E จริง/physical close-restore/multiple physical tabs/Responsive visual acceptance, live Development authentication และ Google provider

Git หลังงาน: 22 Modified / 110 Untracked entries รวม 132; เพิ่ม tracked modifications 4 paths และ untracked entries 3 จาก baseline ส่วน source/tests ที่มีงานเดิมแก้เฉพาะจุด auth dependency ไม่ reset งานเดิม (Untracked directory entries อาจมีหลายไฟล์)

Google phase ถัดไปต้อง verify Google credential ฝั่ง Backend แล้วออก **Application JWT** รูปแบบ Student เดิม จากนั้น reuse `saveStudentSession({ token: applicationJwt, student, remember })` ไม่ส่ง Google ID token เข้า storage helper ไม่สร้าง flow/provider/linking/schema ใน Phase 2 นี้ และต้องเพิ่ม real provider/browser acceptance แยก

จบ Phase 2 หยุดรอคำสั่ง ไม่มี Commit/Push หรือ deployment
