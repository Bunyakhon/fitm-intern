# FITM-INTERN Developer Environment Manager

เครื่องมือแยกจาก Application หลัก ใช้ Node.js built-ins เท่านั้น ไม่มี dependencies เพิ่ม, ไม่ import Backend runtime และไม่เชื่อม PostgreSQL. จัดการเฉพาะ `backend/.env`, `frontend/.env`, `nlp-service/.env` ผ่าน Service ID แบบตายตัว. ไม่เปิดผ่าน Vite/Compose และไม่มี Terminal, Database Console, Docker API หรือ File Download.

## เริ่มใช้บน Windows

ต้องมี Node.js 20.20 ขึ้นไป และ Backend `.env` ต้องมี `NODE_ENV=development`. จาก Repository root เปิด PowerShell ของผู้ใช้ปกติ:

```powershell
$env:NODE_ENV = 'development'
cd dev-env-manager
npm.cmd run bootstrap
npm.cmd start
```

Bootstrap ถาม Password สองครั้งแบบ Interactive โดยไม่ echo รับ 14–256 ตัวอักษร ไม่รับผ่าน command arguments/pipe; ไม่มี default password และไม่สร้างบัญชีใน Database. หากมี Root อยู่แล้วจะไม่เขียนทับ. บัญชีคือ `root` ของเครื่องมือนี้เท่านั้น ไม่ใช่ OS/Database root. งานพัฒนาไม่ได้ Bootstrap บัญชีจริงให้ผู้ใช้.

เปิด **http://127.0.0.1:5379/** และใช้ Password ที่ตั้ง. Host `localhost`, LAN, Proxy และ Origin อื่นถูกปฏิเสธโดยตั้งใจ. Stop ด้วย **Ctrl+C** ใน Terminal ที่ Start; Sessions ในหน่วยความจำถูกล้าง ต้อง Login ใหม่หลัง Start อีกครั้ง. ไม่มี automatic startup หรือ production mode. บน Linux/macOS ใช้ `NODE_ENV=development npm run bootstrap` แล้ว `NODE_ENV=development npm start` ภายใต้ผู้ใช้ปกติ.

## Root / Session / Network

- Server bind IPv4 `127.0.0.1` เท่านั้น. ตรวจ remote address, exact Host รวม port, Origin, Fetch Metadata และปฏิเสธ forwarded headers; ไม่มี CORS header หรือ wildcard.
- เก็บ Root hash แบบ scrypt (`N=32768, r=8, p=3`, random salt 32 bytes) ตาม [Node crypto API](https://nodejs.org/docs/latest-v20.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). ไม่มี Student JWT หรือ Role จากเว็บหลักใช้เข้าถึงได้.
- Credential และ encryption key อยู่ใน OS user data นอก Repository: Windows `%LOCALAPPDATA%\FITM-INTERN\dev-env-manager\<repository-id>\`; POSIX `~/.local/share/FITM-INTERN/dev-env-manager/<repository-id>/`. ไม่เก็บ Root Password ใน `.env`. ห้ามย้าย Credential Store เข้า Web root หรือ Git.
- Windows สร้าง directory ACL เฉพาะ SID เจ้าของ (ยอมรับ SYSTEM ใน inherited file ACL); POSIX directory 0700/file 0600. Existing state ที่สิทธิ์ไม่ผ่านจะ BLOCKED ไม่ลดการป้องกัน. ใช้ PowerShell helper คำสั่งตายตัว `windows-io.ps1`, ซ่อนหน้าต่าง, `-NoProfile -NonInteractive -ExecutionPolicy Bypass` เฉพาะ child process; ไม่เปลี่ยน Execution Policy ของ OS และไม่รับ shell text/path จาก Browser. [Microsoft ACL protection](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.objectsecurity.setaccessruleprotection) เป็นฐานของการปิด inheritance.
- Cookie HttpOnly, SameSite=Strict, host-only, อายุสูงสุด 4 ชั่วโมง; idle 20 นาที. HTTP loopback ไม่ใช้ Secure attribute เพื่อให้ Browser ส่ง cookie ได้; โค้ดเพิ่ม Secure เมื่อ connection เป็น TLS แต่รุ่นนี้ไม่เปิด HTTPS listener. ห้ามนำไปเผยแพร่หรือ Proxy เป็น HTTPS service.
- Session ID สุ่ม 256 bits เปลี่ยนหลัง Login, เก็บ hash ในหน่วยความจำ, Logout revoke ฝั่ง Server. CSRF token ผูก Session สำหรับทุก POST รวม Login/Logout. Login และ reauthentication ใช้ failed-attempt budget ร่วม 5 ครั้ง/15 นาที. Preview มีอายุ 5 นาทีและใช้ได้ครั้งเดียว; Preview ใหม่แทนอันเก่าใน Session เดียวกัน.
- Responses no-store, CSP จำกัด self, frame-ancestors none, nosniff; ไม่มี request/secret/error-stack logs. Root/Secret ไม่เก็บใน localStorage/sessionStorage.

## Editor / Save / Restore

เลือก Backend, Frontend หรือ NLP Service; ค้นหาชื่อ Variable หรือกรอง Secret/Changed. รุ่นนี้แก้เฉพาะ Keys ที่มีอยู่แล้วเพื่อรักษา parser/schema ของแต่ละ Service; ไม่เพิ่ม/ลบ keys ผ่าน Editor. Keys ที่ไม่รู้จักถือเป็น Secret โดยปริยาย ไม่เดากฎธุรกิจหรือปรับค่าเดิมเอง.

ค่า Secret เดิมไม่ส่ง Browser แสดงเพียงมีค่า/ไม่มีค่า. ช่องว่างหมายถึงไม่เปลี่ยน; การล้างต้องติ๊กยืนยันชัดเจนและยังต้องผ่าน required-field validation/Preview/Password. Preview ไม่ส่ง Secret เดิมหรือใหม่กลับ. Variables ชื่อบ่งชี้ Secret ใน `VITE_` ถูกปฏิเสธและมีคำเตือนเรื่อง public bundle. Client ID และ Turnstile site key เป็น public configuration ตามระบบเดิม.

Save Changes → ตรวจ Validation/Change Preview และคำเตือน → กรอก Password อีกครั้ง → ติ๊กยืนยัน → Backup พร้อมตรวจ Integrity → temporary file ใน directory เดียวกับ target → flush/ตรวจเนื้อหาและ permissions → ตรวจ version ซ้ำ → atomic replacement → ตรวจ bytes/permissions หลัง Save. Windows ใช้ .NET File.Replace และรักษา target ACL; POSIX ใช้ [same-filesystem rename](https://nodejs.org/docs/latest-v20.x/api/fs.html#fspromisesrenameoldpath-newpath). ไม่มี delete-target fallback. ไฟล์ที่หาย/invalid UTF-8/duplicate keys/unsupported syntax/symlink/junction/hardlink จะถูกปฏิเสธ ไม่สร้าง `.env` ขึ้นเอง.

รักษา comments, blank lines, key order, unchanged raw values, BOM และ line endings; เปลี่ยนเฉพาะ value span. Input ใหม่รองรับข้อความบรรทัดเดียวพร้อม quoting ที่ตรวจได้ ไม่รองรับ multiline secret/private key ใหม่หรือ syntax ที่ encode ข้าม parser ไม่ได้อย่างปลอดภัย. Multiline เดิมที่อ่านได้ยังรักษา raw bytes เมื่อแก้ key อื่น. ตรวจรูปแบบของ port, boolean, URL/origin, required DB/JWT values, Google configuration, NLP timeouts/scores โดยไม่เปลี่ยน Identity Policy. Validation ไม่ยืนยัน credentials/Provider/DB connection.

Backup ของแต่ละ Service เข้ารหัส AES-256-GCM พร้อม authenticated metadata และตรวจ content digest, มี UUID ที่ระบบสร้างเอง; เก็บใน `backups/` ใต้ private state. History แสดง Service/วันเวลา/ID เท่านั้น. Restore รับ UUID เท่านั้น ตรวจชนิด/ACL/Integrity/Service, Preview ทั้งไฟล์และยืนยัน Password แล้ว Backup ไฟล์ปัจจุบันก่อน restore. ไม่มี Upload/Download/backup deletion. หาก Backup หรือ ACL ใช้ไม่ได้ Save/Restore จะหยุด. ต้องเก็บ Credential Store และ encryption key ไว้ด้วย มิฉะนั้นอ่าน Backup เก่าไม่ได้.

Version ผูกเนื้อหา/file identity/mtime/permissions และตรวจซ้ำก่อน replace; การแก้จาก VS Code อีกหน้าต่างปกติจะได้ 409 และต้องโหลดใหม่. การเขียนใน Tool ถูก serialize. **ไม่มี OS primitive สำหรับ compare-and-swap กับ editor ภายนอกทุกชนิด**: ไม่รับประกันการชนกับ non-cooperating writer ในช่วงสั้นระหว่าง final check และ replace; หลีกเลี่ยง Save `.env` พร้อมกันจากโปรแกรมอื่น. เครื่องมือนี้ไม่ป้องกัน malware/process ของ OS user เดียวกันหรือผู้ดูแลเครื่อง; Cookie บน loopback ไม่แยกตาม port ที่ระดับ Browser จึงต้องเชื่อถือโปรแกรม local อื่นด้วย. ไม่อ้าง Production Security ผ่านจากการทดสอบนี้.

## เมื่อบันทึกแล้ว

Console แสดง Saved Successfully / Pending Restart พร้อม Service ที่ได้รับผลกระทบ; สถานะการรันจริงแสดง Unknown เพราะไม่เชื่อม Docker socket/สั่ง shell ตรวจบริการ. Pending เป็นสถานะใน process นี้; หลัง Start Console ใหม่ให้ถือสถานะ Unknown. เครื่องมือไม่รันคำสั่ง restart ต่อไปนี้ให้เอง:

- Backend: Compose inject `backend/.env` ตอนสร้าง Container; dotenv ไม่ override inherited environment. เมื่อพร้อมให้ผู้ใช้ทำ `docker compose up -d --no-deps --force-recreate backend` จาก repository root. Nodemon reload อย่างเดียวไม่รับประกันรับค่าใหม่.
- Frontend: Vite อ่าน env ตอนเริ่ม; Compose inject `frontend/.env` จึงใช้ `docker compose up -d --no-deps --force-recreate frontend` เมื่อพร้อม. Port mappings เดิมคงเดิม; การเปลี่ยน PORT อาจต้องมีงาน configuration แยก.
- NLP: pydantic-settings อ่าน `.env` ตาม working directory บน host. **Compose ปัจจุบันไม่ได้ส่ง/mount `nlp-service/.env` และกำหนด PORT=8000 เอง**. Save/Restart Container ไม่ทำให้ไฟล์นี้มีผล; ต้องได้รับงานเชื่อม Environment แยก. ไม่มี `.env.example` ของ NLP ณ วันที่พัฒนา จึงไม่ได้สร้างเอง.

ไม่ restart PostgreSQL, ไม่ rebuild/recreate Container อัตโนมัติ และไม่แก้ Compose, Google flags/policy หรือค่าจริงในงานพัฒนานี้.

## ทดสอบ

```powershell
cd dev-env-manager
npm.cmd test
```

ใช้ Node test runner กับ fixture tree ที่สร้างด้วย mkdtemp ใต้ OS Temp, synthetic Password/Secret สุ่ม, Root Store จำลองแยกจากของจริง. ทดสอบ actual Windows ACL/Atomic Replace, Save/Restore/Integrity/conflict และ HTTP Auth/CSRF/Host/Origin; ไม่อ่าน/เขียน `.env` จริงในชุดทดสอบและไม่ใช้ PostgreSQL. ลบเฉพาะ fixture tree ของรอบนั้นเมื่อจบ. Sandbox ที่ไม่ให้ spawn PowerShell จะ BLOCKED; ห้ามแทนด้วย permissions mock แล้วอ้างว่า Windows ACL ผ่าน.

Optional rendered-browser smoke ใช้ Node.js 24+ และ Chrome ที่ติดตั้งอยู่แล้วบน Windows: `node test/browser-smoke.js`. ใช้ Root/ไฟล์จำลองเท่านั้น, ตรวจ UI/Save/Restore และ responsive 1280/768/390/320 px; ไม่เรียก Google Provider หรือเปิดเว็บหลัก.

ข้อจำกัด: ต้อง Bootstrap Root จริงด้วยตนเอง; ไม่ทดสอบ Save/Restore `.env` จริงโดยไม่มีอนุญาตเพิ่ม. ไม่มี Password reset/rotation CLI ในรุ่นนี้ และไม่ลบ Backup/Credential เดิมเมื่อ Bootstrap ซ้ำ. POSIX path มี permission checks แต่ต้องยืนยัน OS/filesystem จริงแยกจากผล Windows. ไม่รองรับ remote hosting, Production, reverse proxy, key addition, bulk multi-service transaction หรือ automatic service activation.
