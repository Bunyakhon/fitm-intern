# FITM Next development priority — 2026-10-10

ข้อเสนอหลัง audit **ยังไม่ได้แก้ application**. ลำดับนี้ยึด user-visible behavior/ขอบเขต/ความเสี่ยง ไม่ใช้จำนวนไฟล์หรือจำนวน tests เป็นเปอร์เซ็นต์ความสำเร็จ. Requirement IDs เป็น provisional เพราะ **OFFICIAL SOURCE UNAVAILABLE**.

## A. ก่อนเริ่มตรวจรับกับผู้ใช้จริง

| Order | Priority / finding | งานที่ยังไม่เสร็จ | Dependency | Proposed fix / next action | เกณฑ์ยอมรับ |
|---:|---|---|---|---|---|
| 1 | P1 — F01 | environment/readiness ของฐานข้อมูลหลัก UNKNOWN; fresh Chrome/SQL ถูกจำกัด | approved review instance + read-only ledger access | ตรวจ API origin/ledger/schema/storage โดยอ่านอย่างเดียว; เลือก disposable fixtures. Missing017–021 ให้ BLOCKED; migration rollout เป็นงานแยก | ระบุ environment/source revision/ledger จริง; ไม่มีการนับ disposable ledger เป็น primary ledger |
| 2 | P1 — F02 | ไม่มีต้นฉบับ ทก.01/templates/rubrics | PDF ที่ผู้ใช้จัดเตรียม, approved official templates, scoring/assignment policy | reconcile ทุกข้อย่อยจริงและแก้ ambiguity Staff8/Student account/transfer; แยกที่ไม่มีข้อมูลเป็น blocked | original source provenance + requirement IDs/weights ครบ; no invented rubric |
| 3 | P1 — F05/F06 | legacy Student auth input/rate-limit; public DB diagnostic; dev deployment boundary | authorized implementation task + agreed environment | typed allowlist validation and shared login limiting; safe health error; validate required config; separate deployment settings | negative input400, brute-force throttle, no SQL/provider details; existing role boundaries preserved |
| 4 | P1 — F03/F04 | missing public search page; Google/chatbot UIไม่ทำงาน | scope decision + Google/provider config or controlled unsupported state | repair/build public search path with actual API; complete OAuth/account linking when authorized; implement authenticated chatbot bridge as separate slice | no broken link; persisted eligible search; real provider/UI round trip; owner/role-scoped chatbot status |
| 5 | P2 — F07/F08 | transfer misleading success; homepage sample jobs/search/filter | confirm product scope | label mock/sample states clearly and avoid success feedback without durable change; wire eligible real jobs or hide unavailable flow per agreed design | user distinguishes prototype/real data; actions have truthful state and reload behavior |
| 6 | P2 — F09/F10 | legacy file content policy differs; matching can include expired jobs | confirmed file/eligibility policy + integration fixtures | align MIME/extension/signature/size/containment checks; add expiry eligibility/candidate-volume policy | invalid files rejected preserving old committed file; expired/nonpublished jobs excluded; live OCR/matching acceptance |

ไม่มี **confirmed P0** ในหลักฐานที่ตรวจ. หากพบ cross-role data access, lost data, unsafe privileged operation ในรอบ manual ให้ยกระดับ P0 และหยุดใช้ข้อมูลจริงใน flow นั้น. ข้อ P1 security ด้านบนเป็น source-confirmed hardening gaps ไม่ใช่การอ้างว่าพิสูจน์ exploit แล้ว

## B. UX/UI ที่ควรตรวจตอนเช้า

| Priority | Screen / flow | Test focus | Dependency / result |
|---|---|---|---|
| P2 | Student create → Class → Head → Student | real UIทุกบทบาท, required fields, saved prerequisites/reason/status, approval ownership | approved identities/fixtures; [S08/T01/H01 checklist](FITM_MORNING_UXUI_TEST_CHECKLIST_2026-10-10.md) |
| P2 | Staff cancellation / documents | reason validation, stale409, double submit, Tab/Escape/opener focus, multi-module auth revocation, HTML download/print | final feb769 historical passed; fresh UX/differentviewport still reviewable |
| P2 | Student profile/Resume/Book/Poster/evaluation | native file picker/preview/replacement, saved read-back, long inputs/error/loading | private synthetic files; SQL+DOM exist but full browser pending |
| P2 | Teacher visits/results; Mentor links | long mobile page density, two photos, history, named recipient, token expiry, completed immutability | migration019/020 review schema + actual recipient mailbox |
| P2 | Calendar | title truncation/full details, monthly/list on narrow width, publish/cancel/reload | migration021; tablet still unverified |
| P2 | All 13 HTML screens | 1440 desktop, 768/1024 tablet, 390/360 mobile; zoom200%; keyboard/error/offline/empty | no responsive PASS from CSS or DOM fixtures |
| P2 | Feedback consistency | `showConfirmModal` vs `showActionModal` Tab confinement; all custom modals/focus restoration | targeted keyboard findings; fresh interactions pending |

Record actual and screenshots in the new checklist; do not modify previous acceptance checkboxes or replace old failure evidence

## C. ขอบเขตที่ยังไม่พัฒนา / ไม่ครบ

| Scope / status | Missing work | Dependency | Suggested development order |
|---|---|---|---|
| Student1 PARTIAL | Google OAuth + agreed account operations | provider config/domain/account-link policy | after legacy auth contracts/provider setup |
| Student7/8 PARTIAL | replacement policy and explicit Student acknowledgement | official scope + advisor relationship policy | preserve Class A/Project B separation; implement confirmed slice |
| Student11 / Mentor1 PARTIAL | compiled logbook/export; numeric weekly rubric | approved format/rubric/maxima | compile/export from immutable weekly snapshots; numeric evaluation later |
| Student15 / Staff4 | product FAQ and scoped document-status chatbot | UI/Express bridge + authenticated ownership/status contract | FAQ integration first; document-status queries independently scoped |
| Staff5 PARTIAL; Company2 NOT STARTED | Company management/admin/owner capability/UI | approved Company management/verification policy | owner capability + CRUD persistence; then Staff admin UI |
| Staff7 NOT STARTED | Staff Teacher administration API/UI | explicit authorized fields/roles | do not reuse Head-only endpoint with client-side privilege shortcut |
| Teacher3 / Head1/2 PARTIAL | full scoped Student/Teacher/Company search/dashboard | exact official search scope | search APIs/UI with paging/privacy; current queues not full directory |
| Teacher12 NOT STARTED | Teacher workplace evaluation | criteria + relation/ownership | separate from Student feedback service |
| Head3 BLOCKED | Head advisor nomination/assignment | compatible policy for explicit Student/Teacher confirmation | policy first; current direct assignment409 stays until defined |
| Teacher11/13/14; Mentor6 BLOCKED | final Student/Book/work/Poster/exam assessment | rubrics/maxima + chair/two-member aggregation policy | build assessment persistence/authorized sources; test rubric validation |
| 2.3.6.1 BLOCKED | academic company50% + department50% engine/storage/display | preceding final assessments + official source | score calculation only after inputs/rubrics/aggregation are specified |
| Staff3 PARTIAL; Teacher8/10 BLOCKED | official cooperation/placement and visit1/2 PDFs | approved templates/issuance/signature policy | render from frozen persisted snapshots; separate official issue/reissue from preview |
| Teacher15 / Head5 / Student account PARTIAL | account edit/change/recovery UI/API | allowed operations/password policy/identity verification | separately scoped self-service; preserve live roles/privileges |

Status names/complete row evidence are in [traceability](FITM_SCOPE_TRACEABILITY_2026-10-10.md). Broad rows remain PARTIAL even when one nested flow has passed Chrome

## D. โค้ดมีแล้วแต่ E2E ยังไม่ครบ

| Feature | Existing evidence | Remaining acceptance |
|---|---|---|
| Student full registration/profile/academic/Class data | models/controllers/client forms/unit slices | native register→login→save→reload + invalid types/duplicates/provider paths |
| Resume upload/extraction/skills+Resume matching | native text/OCR client, NLP algorithms/contracts, Backend units | live NLP/OCR with synthetic PDFs; expired job policy; actual Chrome matching/replacement |
| Student create/own cancel and complete approval UI | disposable SQL + controlled DOM; cancellation Student readback Chrome | native Student create then Class/Head buttons across authorized accounts |
| Student request → Project Teacher accept/reject → Student acknowledgement | SQL/DOM advisor relationship/topic | full native decision/reload; explicit acknowledgement/replacement not implemented |
| Book/Poster and Student workplace feedback | private file validation + SQL/DOM | native upload/picker/preview; workplace save/edit/reload; Teacher/Mentor artifact viewer is separate missing work |
| Company public form/email/CAPTCHA/publication | validators/services/security+SQL lifecycle | real Turnstile + approved mailbox; Staff publication management UI missing |
| Staff cancellation/calendar, daily/weekly, supervision/results | historical real Chrome+SQL PASS perfeature | **not unverified overall**: need current review environment/tablet/live SMTP deployment acceptance; retain historical VERIFIED scoped status |

Do not combine current 203/253 safe unit counts with historical 426/258, focused46 or feature Chrome counts. Evidence mode/version/environment determines what was actually tested

## E. รอข้อมูล/สิทธิ์ภายนอก

- Original ทก.01 PDF, exact clause text/weights, Staff7-versus8 ambiguity and Student account numbering.
- Approved university letter/supervision PDF forms; signatory/official issuance/reissuance policies.
- Mentor/Teacher/committee rubrics, maxima, committee aggregation and any attendance scoring rules.
- Real intended-recipient mailbox/SMTP and Turnstile/provider configuration in an authorized review environment.
- Read-only primary migration ledger/schema state; deployment acceptance; Docker/Chrome availability under existing permissions. No sandbox/security-policy bypass proposed.

## F. เพิ่มเติม/technical debt

| Priority | Item | Proposed follow-up |
|---|---|---|
| P3 | source/docs not committed, including new Staff source and runner helpers | review complete working tree intentionally when implementation session resumes; **no commit/push/PR in this audit** |
| P3 | ignored package locks + npm install in image | decide reproducible lock/build policy and matched Node/Python versions; do not silently reinstall dependencies here |
| P3 | large Student module/repeated Student shape checks | consolidate after stable contract tests; no refactor during audit |
| P3 | empty env/oauth config + unused-route candidates | confirm intended entrypoints/dynamic registries; avoid deleting models/migrations/npm entrypoints by naive unused search |
| P3 | repeated historical status paragraphs | later rewrite current status around actual latest acceptance, preserve historical evidence references |
| SCOPE UNCONFIRMED | transfer / Staff8 scores / separate internship product | obtain PDF/product decision before counting as required or developing beyond scope |

Recommended next session: establish review environment → execute manual Class/Head/Student and native upload/matching gaps → fix source-confirmed auth/health/public-link/feedback issues in separately authorized implementation work → deliver missing scoped modules → official PDF/assessment/score work after prerequisite documents. Current audit does not apply any proposed fix
