# Top 10 Job Matching / Contact / Coop Request — คู่มือผู้ใช้ตรวจรับ

อัปเดต 8 พฤศจิกายน 2026 (Asia/Bangkok). **PENDING USER RESULTS. Tests: NOT RUN — USER-OWNED TESTING.** เอกสารนี้เป็นขั้นตอนให้ผู้ใช้ทดสอบเอง ไม่มีผลทดสอบหรือการรับรองความแม่นยำจาก Codex.

## ก่อนตรวจ

ใช้บัญชี Student เดิมที่มีทักษะบันทึกแล้ว ไม่สร้างหรือแก้ Database เพื่อให้ได้คะแนนตามตัวอย่าง. รอบ Top10 ได้เผยแพร่เฉพาะ18Internth Development jobsตามคำสั่งผู้ใช้แล้ว โดยยังไม่verifiedอีเมล/มหาวิทยาลัยและไม่ยืนยันเปิดรับจริง; รายการเหล่านี้ร่วมคำนวณได้เฉพาะDevelopment. การ์ดที่อยู่ใน “งานแนะนำสำหรับคุณ” ต้องมาจากคะแนนจริง ส่วน “ค้นหาประกาศทั้งหมด” เป็นBrowsingแยก ไม่มีscore/rank. ทั้งสองส่วนคงป้ายข้อมูลจำลอง และไม่แสดงอีเมล/โทรศัพท์จำลองเป็นลิงก์ติดต่อ.

## ตัวอย่างที่ควรเปรียบเทียบ

- **เกี่ยวข้อง:** หาก Profile มี JavaScript และประกาศที่มีอยู่จริงระบุ JavaScript ในงาน Frontend ให้ตรวจว่าระบบรายงานชื่อ JavaScript ที่พบ พร้อมตำแหน่งหลักฐาน title/category/description. ไม่กำหนดว่าต้องได้คะแนนเท่าใดหรือเป็นอันดับ1 เพราะยังขึ้นกับข้อความและประกาศอื่นในรอบนั้น.
- **ไม่เกี่ยวข้องอย่างชัดเจน:** เปรียบเทียบกับประกาศงานดูแล Hardware ที่ไม่ได้ระบุ JavaScript หากมีอยู่จริง. ควรรายงานว่าไม่พบชื่อ JavaScript แบบตรง แต่คะแนนอาจยังมากกว่า0จากคำอื่น; ห้ามสรุปว่าไม่ผ่านคุณสมบัติหรือห้ามสมัคร.
- **ข้อจำกัดของคำ:** Java กับ JavaScript, SQL กับ MySQL และ C กับ C++ ไม่ใช่ชื่อแบบตรงเดียวกันในตัวตรวจหลักฐาน. JS กับ JavaScript หรือ HTML/CSS กับข้อความที่แยก HTML และ CSS อาจไม่ถูกนับแบบตรง; ระบบไม่เดา alias/semantic equivalents. ข้อความ “ไม่จำเป็นต้องใช้ JavaScript” ยังมีชื่อ JavaScript อยู่ จึงพบชื่อได้แต่ไม่ใช่ Required Skill.

## วิธีตรวจ Input และคะแนน

1. เปิดหน้าค้นหาสถานประกอบการ ตรวจ Computer Skills/ระดับและ Related Skills ที่บันทึกจริง. Draft ที่ยังไม่ Save ต้องไม่ปรากฏเป็น Input ใหม่.
2. กดวิเคราะห์จากทักษะ ตรวจchipsของComputer Skills/ระดับและRelated Skillsที่บันทึกแล้ว. สาขาIT/INEแสดงเป็นข้อมูลการศึกษาเท่านั้น ไม่เติมmajorเข้าcandidate.text. กรณีมีเพียงสาขาและไม่มีทักษะต้องแสดงerrorจริง ไม่คำนวณจากสาขาเพื่อให้ได้คะแนน.
3. กดวิเคราะห์จาก Resume: ใช้ข้อความไฟล์ตามเดิม ไม่แทรกmajor. รายละเอียดTechnical/Raw InputถูกถอดจากUIทั่วไปแล้ว; ผู้ตรวจด้านเทคนิคตรวจowner response matching_analysisในBrowser Networkเองได้.
4. ตรวจแต่ละJob Card: อันดับ/ตำแหน่ง/บริษัท/Internth/เปอร์เซ็นต์/แถบคะแนน/ชื่อทักษะที่พบ. “รายละเอียดงาน” แสดงข้อมูลประกาศแบบอ่านง่าย ไม่อ้างว่าเป็นRequired Skillsทั้งหมด. ส่วนคำอธิบายTechnicalเก็บในBackend/เอกสาร ไม่แสดงสูตร/raw textในหน้าปกติ.
5. เทียบUIกับ `score` จากผล `POST /api/job-matches/me` ในBrowser Networkด้วยตนเอง: UI=score×100ปัด1ตำแหน่ง เช่น0.7825→78.3%; scoreอยู่0–1 ไม่ใช่โอกาสได้งาน. NLPกรองขั้นต่ำ0.05ก่อนround4decimal เรียงscoredesc/UUIDascเมื่อเท่ากัน และคืนสูงสุด10. ถ้าได้4งานต้องแสดง4 ไม่เติมBrowsing/งานคะแนนต่ำให้ครบ10. ไม่กำหนดคะแนนคาดหวังโดยเดาหรือเทียบรอบที่Input/ชุดงานต่างกันเสมือนเป็นรอบเดียว.
6. ตรวจ `matching_source`/`matching_analysis`/`matches[].explanation` ในowner responseถ้าจำเป็น; program.used_as_text=false, ระดับไม่เพิ่มWeight, development_listings=[]เพื่อcompatibility. Browsingใช้GET `/api/job-matches/me/jobs` แยก มีsearch/category/province/page ไม่มีคะแนน; ถ้าcomputed=falseไม่มีคะแนนสำรอง.
7. Save แก้ไข/ลบทักษะแล้วกลับเมนูและวิเคราะห์ใหม่ ตรวจว่า snapshot ล่าสุดถูกใช้. ลองเปิดอีกแท็บ/Saveระหว่างรอผล/เปลี่ยนบัญชีเพื่อดูว่า responseเก่าไม่ทับข้อมูลใหม่. ทดสอบ Keyboard เปิด/ปิด details และ Desktop/Mobile โดยเฉพาะชื่อยาวและข้อความ Resume.
8. เปิด “ดูช่องทางติดต่อสถานประกอบการ”: ทั้ง12บริษัทInternthต้องแจ้งว่าไม่มีข้อมูลติดต่อจริงที่ยืนยันได้ พร้อมSource URLเดิม ห้ามมีtel:/mailto:จากข้อมูลจำลอง. รายการอื่นแสดงอีเมลได้เฉพาะที่มีemail_verified_atจริงและไม่ใช่domainจำลอง; โทรศัพท์ที่ไม่มีprovenanceยังไม่ทำลิงก์.
9. กด “เขียนคำร้องสหกิจศึกษา”: Shared Confirmationแสดงบริษัท/ตำแหน่งและคำแนะนำติดต่อ. Cancel/Escapeต้องไม่เปลี่ยนDraft/หน้าจอ/สร้างคำร้อง; Confirmเปิดฟอร์มเดิมพร้อมcompany/job IDsและcontext โดยยังไม่สร้างคำร้อง. ตรวจการกรอก/SubmitตามAdvisor/Academic/Snapshot/RBACเดิมและerrorจริง; ไม่เพิ่มcheckboxหรือหลักฐานติดต่อบังคับ.
10. ตรวจ1280/768/390/320px, score/ชิปยาวไม่ล้น, ปุ่มสัมผัสได้, focus/Tab/return focusระหว่างConfirmationกับฟอร์ม, loading/error/retry/double-click และผลไม่ปะปนกับBrowsing.

## Expected vs Actual — ผู้ใช้กรอกเอง

| กรณี | Expected ตาม Source / ข้อมูลที่ผู้ใช้ตรวจ | Actual / หลักฐานของผู้ใช้ |
| --- | --- | --- |
| งานเกี่ยวข้อง | พบชื่อทักษะที่มีอยู่จริงในข้อความประกาศ พร้อม field หลักฐาน; ไม่เดาอันดับ/คะแนน | รอผู้ใช้กรอก |
| งานไม่เกี่ยวข้อง | ไม่พบชื่อแบบตรงเมื่อข้อความไม่มีจริง; ไม่กล่าวว่าไม่ผ่านคุณสมบัติ | รอผู้ใช้กรอก |
| Profile vs Input | ใช้ saved snapshot; ระดับแสดงเพื่อให้ข้อมูล ไม่ใช้เพิ่ม Weight | รอผู้ใช้กรอก |
| Score / Ranking | ตรงAPI/สูงสุด10/แสดง1decimal; ไม่รวมBrowsing | รอผู้ใช้กรอก |
| Contact / Confirmation | Mock contactsไม่มีลิงก์ติดต่อ; Cancelไม่เปลี่ยนDraft; Confirmเปิดฟอร์ม ยังไม่สร้างคำร้อง | รอผู้ใช้กรอก |
| Resume / Freshness / Mobile | Resumeใช้ข้อความไฟล์จริง; Saveแล้วใช้ข้อมูลใหม่; ส่วนขยายอ่านได้ด้วย Keyboard/Mobile | รอผู้ใช้กรอก |

บันทึกวันเวลา/โหมด/สาขา/Job ID หรือ Source URL/Inputที่เกี่ยวข้อง/ชุดงานที่เปรียบเทียบ/Expected/Actual และภาพ UIตามจำเป็น. เก็บข้อมูล Resume ส่วนบุคคลเป็นส่วนตัวและไม่แนบ token/credentials. หากไม่เห็นงานให้ระบุว่าไม่มี published candidates หรือไม่มีผลถึงเกณฑ์ตาม APIที่เห็นจริง ไม่เติมผลแทนการทดสอบ.

## ข้อจำกัดที่ต้องคงไว้

TF-IDF + cosine similarity เป็นความคล้ายของคำหลัง lowercasing/ลบอักขระพิเศษ/ตัดคำไทยอังกฤษ/กรอง stopwords; ไม่ใช่ Semantic Model/LLM. C++/C# อาจเสียสัญลักษณ์ระหว่าง preprocessing แม้ตัวตรวจชื่อแบบตรงรักษาสัญลักษณ์. การพบชื่อไม่บอกบริบทบังคับ/ปฏิเสธหรือระดับที่บริษัทต้องการ. Skills/Work summary จากประกาศเป็นข้อความสรุป ไม่รับรองว่าเป็นข้อบังคับทั้งหมด.

แบบเลือกทักษะหรือResumeใช้cosineรอบนั้นโดยตรง; APIไม่ระบุsourceและมีทั้งsaved skills/Resumeยังใช้0.65×Profile +0.35×Resumeตามเดิม แต่Profile inputไม่เติมmajorแล้ว. TF-IDF fitกับcandidateและประกาศทั้งหมดต่อรอบ ชุดงานเปลี่ยนคะแนนได้. ยังไม่มีper-skill/token contribution/proficiency weighting/semantic alias. ข้อความtechnicalอยู่ในเอกสารนี้/Backend ไม่แสดงซ้ำบนการ์ดทั่วไป. การมีคำอธิบายไม่พิสูจน์Rankingแม่นยำ; รอผลจริงจากผู้ใช้.

**NEXT TASK: USER MANUAL RETEST — TOP 10 JOB MATCHING / CONTACT / COOP REQUEST.**
