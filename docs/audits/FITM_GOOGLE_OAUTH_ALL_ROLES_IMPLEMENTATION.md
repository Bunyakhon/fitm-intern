# FITM-INTERN — Google OAuth all roles implementation

Date: **11 October 2026 (Asia/Bangkok)**

**Final acceptance: PARTIAL / BLOCKED. Production Ready: NO.**

Migration 026 readiness was subsequently completed in the same authorized work:
the dedicated Umzug installer uses atomic DDL/ledger, installed-only discovery,
read-only status, pinned backup/target/source checks and tested orphan recovery.
See [026 installation readiness](FITM_GOOGLE_OAUTH_026_INSTALLATION_READINESS.md)
for current source hash, actual disposable installation/restore evidence and the
future Development command. Development migration and feature activation remain
unperformed. The feature/onboarding/provider acceptance below is unchanged.

## 1. Executive summary

Implemented GIS ID-token login, configurable exact email/Workspace domain policy,
explicit password ownership linking, persistent subject-to-actor mapping, replay
protection, all four Login pages, ordinary Application JWTs and existing Student
Remember Me. The runtime remains disabled in the existing environment. No live
migration, actor/profile write, credential configuration, commit or push occurred.

The prepared mapping migration passes synthetic PostgreSQL tests. New Student
onboarding is **a documented proposal and a fail-closed API gate**, not a completed
registration implementation. It requires an approved Student-ID proof source and
Google-only password/model contract. Real Google provider E2E is **NOT TESTED**.

## 2. Source and authentication architecture

Read current README, the existing main HANDOFF, Auth Phase 2 Remember Me, Profile
Phase 5 final acceptance, models, auth controllers/routes, role guards, storage,
migration discovery/ledger and actual Login HTML. No separate Phase 1 Auth audit
file was found; Phase 2 itself says that Phase 1 was supplied in conversation.
Historical handoff statements were not treated as current code verification.

Student uses `students`; Teacher and Head use `teachers` with live
`is_department_head`/department checks; Staff uses `department_staffs`. No central
user model, actor-table merge or Mentor/Company Google flow was introduced.
Student status is an internship lifecycle enum, not an active/disabled login flag;
all existing valid lifecycle states remain eligible. The model has no separate
Student account deactivation policy to infer. Teacher requires `status=active`;
Staff requires `is_active=true`. Existing protected Head middleware already checks
the current DB flag, preventing continued Head access after revocation.

## 3. Google flow and request integrity

GIS `initialize` / official `renderButton`, popup mode, nonce, no auto-selection,
and a JS callback are used because only authentication is needed. No Google API
access, OAuth refresh token or client secret is required. Verification uses the
existing `jsonwebtoken` library with Node RSA public keys from Google's fixed
HTTPS JWKS URL; no extra package was installed.

Verification checks RS256 signature, exact audience, optional authorized-party
claim, either Google issuer, exp/iat, subject, email verification and nonce.
The credential is bounded to 16 KiB. JWKS fetch has a five-second timeout, refuses
redirects and oversized responses, and caches trusted keys for bounded max-age.
Unknown key IDs fail closed until cache refresh; this may briefly delay login
after provider key rotation, but prevents arbitrary refresh-request flooding.

The challenge stores hashes of independent 256-bit browser secret and nonce,
role, purpose and five-minute expiry in PostgreSQL. The browser retains the raw
values only in memory. JSON requests require the exact configured frontend
Origin; no cookie-initiated authentication is used. Browser secret, verified
Google nonce and atomic consumed-state update bind the response to the request.
Successful consumption and identity linking happen in the same DB transaction.
No process-local replay cache is used. Failed transactions do not issue sessions.

This follows the identity and hosted-domain distinctions in Google's
[server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
and [GIS JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference).
Only the Application HS256 JWT enters existing frontend storage or protected APIs.

## 4. Domain configuration

Safe backend template defaults:

```env
GOOGLE_LOGIN_ENABLED=false
GOOGLE_ACCOUNT_LINKING_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_ALLOWED_EMAIL_DOMAINS=kmutnb.ac.th,email.kmutnb.ac.th
GOOGLE_HOSTED_DOMAIN_POLICY=required
GOOGLE_ALLOWED_HOSTED_DOMAINS=kmutnb.ac.th
```

Global and optional role allowlists use exact lowercase domain membership.
Wildcards, blank lists, malformed domains and blank role overrides fail closed.
Additional role overrides can narrow global policy, never broaden it. The four
optional keys end in `_STUDENT`, `_TEACHER`, `_DEPARTMENT_HEAD`, `_DEPARTMENT_STAFF`.
No source evidence establishes institution-specific domain differences by role;
the default is a shared allowlist, with explicit overrides available.

`required` independently checks `hd` against the hosted-domain list. Email-domain
and `hd` values need not match. `email_only` is an explicit alternative that does
not attest university-managed Workspace ownership. Default example `hd` must be
verified against actual institution accounts before rollout. Domain policy is
checked again on every login, including identities linked before policy changes.

Frontend obtains only enabled/client ID/linking state from `/config`; no new
`VITE_*` secret is introduced. Enabled configuration requires HTTPS, or HTTP on
localhost/127.0.0.1/::1 for development, and exact `FRONTEND_URL` origin.

## 5. Role-specific login

| Portal | Authorized actor | Session/destination |
| --- | --- | --- |
| Student | Explicit Student identity mapping | existing Student JWT, Student dashboard |
| Teacher | Explicit active Teacher mapping | existing Teacher JWT; DB Head flag retains the original role contract |
| Head | Teacher mapping plus active flag, Head flag and department | Head JWT/destination and live protected API guard |
| Staff | Explicit active Staff mapping | existing Staff JWT, Staff dashboard |

The same Google subject may map to one actor per actor type after separate
ownership checks. The role portal selects which actor to authenticate; the service
never searches all tables by email or selects the most privileged matching actor.
Head is an existing permission on one Teacher actor, not a second actor mapping.
A Teacher account with the Head flag retains the existing backend JWT Head role;
current Head domain policy is checked before issuance. Domains cannot assign roles.

## 6. Secure linking

There is **no email auto-linking**. Unlinked login returns a generic linking-required
message without enumerating existing internal emails. If linking is approved and
enabled, the UI explicitly asks for the existing account email/password, then
obtains a fresh Google challenge for `purpose=link`. Backend password comparison,
live actor checks, actor row lock and uniqueness authorize mapping creation.
Both account emails may differ when the user proves ownership of both accounts;
this linking policy is proposed for explicit approval before enabling it.

Unique `(subject, actor_type)`, unique actor FKs, actual FKs and an exactly-one-actor
CHECK prevent duplicate or cross-table mappings. Teacher/Head share the Teacher FK.
Repeated ownership-verified linking to the same pair is safe. Conflicts return 409;
no overwrite, unlink or reassignment endpoint exists. Accounts without a password
return ownership failure; administrator-assisted linking is proposed in the
[schema/policy proposal](../../backend/src/db/prepared/google-oauth/README.md),
with no administrator bypass exposed in runtime.

Linking modifies only identity/request tables. Existing Student UUIDs, passwords,
profiles, revisions, drafts, relationships and private files are untouched.

## 7. New Student onboarding

`POST /api/auth/google/onboard` returns 503
`GOOGLE_ONBOARDING_APPROVAL_REQUIRED`; configuration always returns
`onboardingEnabled=false`. There is no switch that bypasses this gate.
The prepared proposal specifies roster/administrator-attested Student ID and
email, subject-bound single-use proof, required real names, transaction/uniqueness,
collision handling, password-model changes and profile initialization tests.

Live `students.student_id`, `email` and `password_hash` are all NOT NULL. The
virtual password is also required, and the current Student model accepts only
`@email.kmutnb.ac.th`. Google-only creation across configured domains therefore
requires reviewed schema/model changes. No invented Student ID, random fake
password, skipped model validation or automatic personnel account was used.
New-Student success/collision/concurrency tests are **NOT TESTED**, pending policy
and implementation approval. Existing password registration remains available.

## 8. Database and migration state

Read-only Development inspection before/after confirmed `intern_system` has
**23 executed migrations**, 001–018 including 007a and Profile 022–025.
019–021 remain pending. Google identity/request tables are absent; 026 is absent
from the ledger. No personal rows were read for these inspections.
See [read-only evidence](FITM_GOOGLE_OAUTH_DATABASE_READONLY.txt).

`026_google_identity_mapping.js` is prepared outside normal migration discovery.
It changes no existing actor column. Its transactional creation, indexes, FKs and
CHECK were exercised only in a brand-new synthetic PostgreSQL 16 container.
Dependencies, backup/restore, explicit-only migration selection, rollback archive
plan and risk assessment are in the proposal. Automatic destructive down is
disabled. Do not run an unbounded pending-migrations command to install this change.

## 9. Remember Me and frontend behavior

Google Student login reuses `saveStudentSession` unchanged: checked persists the
Application JWT with tab generation binding; unchecked uses only sessionStorage.
Existing `/api/auth/me`, expiry, tab invalidation, logout and draft behavior remain
in place. Teacher/Head use `teacherToken` and Staff uses `staffToken` in
sessionStorage, matching their original policy; no arbitrary persistence was added.
JWT lifetime remains `JWT_EXPIRES_IN || 1d`.

Shared Google module mounts all four existing pages. Password login remains usable
while Google configuration/provider initializes. Popup/exchange guards prevent
concurrent password submission and repeated callbacks. Script load has a timeout;
the API uses the existing Axios timeout; popup waiting has a 60-second retry path,
late responses are ignored, challenges expire and passwords are cleared. GIS does
not provide a reliable button-popup cancellation callback here; cancellation is
handled by timeout/retry rather than a fabricated immediate cancellation event.
Linking has explicit cancel/retry, safe text and shared toast feedback. No native
alert/confirm, token console logging or user-supplied redirect was added.

## 10. Security hardening and limits

- Student register/login payloads now reject inappropriate types/unknown fields;
  both have rate limits. Google endpoints have an independent rate limit.
- New Student password registration rejects input above bcrypt's 72-byte limit;
  legacy Student login/linking preserve the existing 100-character comparison
  contract. Existing oversized hashes are not rewritten. Teacher/Staff keep their
  existing 72-byte reauthentication limits.
- Student auth controllers no longer log raw errors or return ORM diagnostics.
  Google controllers use no-store responses and generic provider/ORM failures.
- Cross-role/identity checks and a fixed backend/frontend destination map prevent
  escalation, actor switching and open redirects.
- Student status lacks a separate disable flag; no new deactivation policy was
  invented. Existing local/sessionStorage XSS exposure and lack of server-side JWT
  logout revocation remain known system limits; this change does not extend tokens.
- No change to Student Calendar, Profile writers, Teacher/Staff workflow rules,
  Mentor verification or Company capability links.

## 11. Files changed in this task

Backend: `.env.example`, `config/oauth.js`, `controllers/auth.controller.js`,
`routes/auth.routes.js`; new Google controller/router, token/auth services,
GoogleIdentity/GoogleAuthRequest models, prepared 026/proposal, three Google test
files and isolated SQL/native mock-browser runners.

Frontend: four Login HTML files, `pages/login.js` (remove placeholder handler),
`pages/staffLogin.js` (expose busy state for shared Google guard), `styles/auth.css`;
new Google API/page/session helper and Google tests. Existing Student storage/API
client/Profile/Calendar implementation was not edited in this task.

Documentation: this report, appended README/main HANDOFF notes, before/after Git
snapshots, test/build/DB text evidence and synthetic browser screenshots/results.
Pre-existing changes in other files remain the user's work.

## 12. Automated test results

| Check | Pass | Fail | Skip | Evidence scope |
| --- | ---: | ---: | ---: | --- |
| Backend full Node suite | 258 | 0 | 23 | unit/contracts plus existing opt-in integration skips |
| Frontend full Node suite | 363 | 0 | 2 | synthetic DOM/storage; includes 13 new Google tests |
| Disposable PostgreSQL Google suite | 15 | 0 | 0 | one parent + 14 subtests, real SQL/constraints/transactions, provider claims mocked |
| Frontend Vite build | PASS | 0 | — | 13 HTML entries, configLoader runner |
| Native headless Edge mock UI | 9 | 0 | 0 | four roles × desktop/mobile + disabled feature |

Evidence: [backend](FITM_GOOGLE_OAUTH_BACKEND_TESTS.txt),
[frontend](FITM_GOOGLE_OAUTH_FRONTEND_TESTS.txt),
[PostgreSQL](FITM_GOOGLE_OAUTH_POSTGRES_TESTS.txt),
[build](FITM_GOOGLE_OAUTH_BUILD.txt),
[Edge results](evidence/google-oauth/browser-results.json).

RSA tests use real synthetic signatures and mocked pinned JWKS HTTP responses;
they test invalid signature/audience/issuer/expiration/iat/nonce/subject/email/hd,
domain spoofing, config additions/removals and fail-closed provider failures.
SQL tests cover all roles, no auto-link, password ownership, browser-secret/nonce/
role/purpose/expiry/replay, current domain removal, inactive actors, revoked Head,
subject/actor collisions, two forms of concurrent linking, concurrent replay,
failed JWT signing after identity insertion and profile/account preservation.
Full existing suites cover Profile revisions/private storage/PDF/drafts and other
workflows, but their skipped database/provider scenarios are not reclassified as
passing live integration tests.

Windows sandbox initially prevented Node child spawning/default Vite config
bundling. Authorized test processes and `--configLoader runner` produced the
recorded final results. A synthetic DOM assertion was corrected to match the native
initial `inert=false` property; final suites have no failures. The browser harness's
static-file error handler was corrected; its temporary profile was cleaned and
the final native run passed. No product checks were removed to hide these failures.

## 13. Browser acceptance

Native Edge exercises the built pages with a **mock GIS object and intercepted
synthetic API**, native mouse clicks, expected safe destinations, session/persistent
storage modes, 1440/390 widths and no horizontal overflow. Screenshots are labeled
with a mock provider button; they do not validate Google's real iframe branding,
popup/CSP/FedCM or provider network behavior. No database is used in this runner.

**Real Google provider E2E: NOT TESTED / BLOCKED.** Read-only `.env` presence check
found no Google Client ID, login/linking disabled, and no real test accounts were
supplied. Real role login/linking, unauthorized domain/provider cancellation,
browser close/reopen, protected APIs and onboarding acceptance must be performed
after approved installation/configuration. Simulated multi-tab/browser restoration
tests are not claimed as physical real-provider browser restoration evidence.

## 14. Known limitations

No approved live mapping schema, real client/provider accounts, new Student-ID
proof source or Google-only Student model/schema contract. Administrator-assisted
linking and account reassignment need authority/audit policy. The default Workspace
`hd` list requires confirmation against actual institution accounts. Live Google
key retrieval, official button popup/FedCM and real browser cancellation are not
verified by synthetic tests. Existing system security/storage limits remain.

## 15. Approval gates

1. Approve prepared **026 only** and the documented backup/restore/target checks
   before applying it to Development. The user's attached request explicitly says
   **“ห้ามรัน Migration จนกว่าผู้ใช้จะอนุมัติโดยชัดเจน”**.
2. Approve explicit dual-account password reauthentication linking policy before
   setting `GOOGLE_ACCOUNT_LINKING_ENABLED=true`. No-password accounts need a
   separate approved administrator-assisted process.
3. Approve Student-ID evidence authority and Google-only password/email/model
   contract before implementing/enabling new Student onboarding.
4. Supply/configure a Web OAuth Client ID and authorized frontend origins; confirm
   allowed email/hosted domains and real test accounts, then execute provider E2E.

These are requirements of the user's request and the verified database constraints,
not an inferred skill approval gate. Work independent of them has been completed.

## 16. Git and preservation

Initial state: **22 modified / 110 untracked entries (132 total)**, recorded in
[before snapshot](FITM_GOOGLE_OAUTH_GIT_BEFORE.txt). All entries remain; no reset,
clean, stash, commit or push. [After snapshot](FITM_GOOGLE_OAUTH_GIT_AFTER.txt)
records **32 modified / 133 untracked entries (165 total)**, including pre-existing Profile work and new
OAuth source/evidence. Student Profile model and existing Profile/Calendar sources
were not edited by this task. Development ledger/password schema are unchanged;
disposable PostgreSQL containers and temporary Edge profiles were removed.

## 17. Final acceptance

**PASS:** prepared existing-account Google implementation/all-role UI, exact domain
policy, secure linking code behind approval flag, RSA/unit/DOM tests, isolated
PostgreSQL transactions/races, regression suites and build, mocked native Edge UI.

**BLOCKED:** live installation/enabling, linking-policy approval, Google-only
Student schema/model and Student-ID verification policy.

**NOT TESTED:** real Google provider E2E, approved new-Student onboarding and its
collision/concurrent-registration tests, physical real-provider browser restore.

**Overall PARTIAL / BLOCKED; not Complete and not Production Ready.**
