# Google OAuth — proposal pending approval

Prepared source only. Ordinary Umzug discovery includes 026 **only after its
ledger entry exists**; an uninstalled 026 never enters ordinary pending/up.
No migration, sync, actor creation, password constraint change or administrator
linking has been executed on Development. The isolated test runner applies 026
only to a fresh synthetic PostgreSQL container named `fitm-google-test-*`.

## 026: persistent identity and request integrity

- `google_identities`: UUID key, Google `sub` in `subject`, actor type, exactly one
  non-null FK to `students.id`, `teachers.id` or `department_staffs.id`, timestamps.
- Unique `(subject, actor_type)` allows explicitly owned Student/Teacher/Staff
  identities for the same Google subject; Head shares the Teacher mapping.
- Unique each actor FK allows only one Google subject for each internal account.
- CHECK prevents cross-table mappings; FKs cascade on actual actor deletion.
- `google_auth_requests`: UUID key, SHA-256 browser secret and nonce hashes, selected
  role/purpose, five-minute expiration and consumed timestamp. Atomic conditional
  update in the same transaction as linking/login prevents replay across workers.
- Actor row locks and DB uniqueness protect concurrent links. Transaction rollback
  preserves both existing actors/profiles and failed request consumption.
- No Google token, profile picture, password or refresh token is stored here.
- Dependencies: existing actor base tables/007a and staff/007. No dependency on
  019–021 or modification of installed Profile 022–025. Select **only 026** after
  approval; do not use an unbounded `db:migrate up` command.
- Take `pg_dump` backup, record target/ledger/schema, verify restoration in an
  isolated target, apply 026 in a transaction, validate constraints and unchanged
  actor/profile digests. Feature activation requires separate approval. Migration
  does not backfill or auto-link existing users.
- Disable the feature before rollback. `down` deliberately refuses automatic
  deletion: archive identities and approve a target-specific rollback separately.
- Risks: feature cannot work before installation; lost mapping backup requires
  users to reauthenticate. Request rows are pruned on the next challenge after
  expiration; monitor index/table size. Original Password JWT lifetime is retained.

## Controlled installation readiness (11 October 2026)

Use `backend/scripts/installGoogleOAuth026.js`, never `npm run db:migrate` or
`up --to 026`. The dedicated Umzug runner contains exactly one migration and calls
`up({ migrations: ["026_google_identity_mapping.js"] })`.

The installer defaults to read-only preflight. An installation needs an explicit
database, pinned source SHA-256, target identity hash, a pinned backup manifest,
an independently restored backup, and `--approval migrate026:<target-hash>`.
Both Google feature flags must be false or absent. Intern_system also has a guard
inside the core installer. No flags, linking policy, onboarding policy, actor rows
or Student Profile are changed by this tooling.

It checks 007/007a ledger dependencies and actual actor UUID primary keys, table
ownership, PostgreSQL 16, public schema, exact Google columns/defaults/collations,
CHECK expressions, FK actions, uniqueness/index definitions, ownership/RLS/ACLs,
and table state. Unknown, partial, populated orphan or drifted schema stops.
Schema/status reads do not call SequelizeStorage.sync or model.sync.

DDL and the Umzug ledger INSERT use one PostgreSQL transaction. Advisory locking
serializes installers; ledger and existing-table locks prevent a changing baseline
while comparing existing row digests and schema. Installation verifies that the
only ledger delta is 026; 019–021 remain pending and are never discovered here.

`backend/scripts/backupGoogleOAuth026.js` creates a binary custom-format pg_dump,
pins its SHA-256 and restores it in a separate cluster with a generated name,
label, loopback-only port and synthetic credentials. It verifies rows, ledger,
catalog, functions, enums and sequences. CHECK SQL is reparsed on temporary tables
in that disposable restore target to account for PostgreSQL deparse differences
without removing boolean grouping. The owned container and anonymous volume are
removed after verification. Production archives must be outside the repository.

Recovery matrix:

| Observed state | Approved action |
| --- | --- |
| Neither Google table nor ledger exists | `install`, after verified backup |
| Both exact tables plus ledger exist | read-only verification; core is idempotent |
| Both exact **empty** tables, no ledger | new backup/restore, then `recover-ledger` |
| Partial tables, ledger without tables, schema/owner drift, populated orphan | stop; separate review, no automatic drop or ledger adoption |

`recover-ledger` uses the same Umzug one-name runner and transaction but validates
the existing schema instead of repeating DDL. Automatic down remains disabled.
For an uncertain commit result, rerun preflight first; never drop a table or remove
a ledger entry to retry. A destructive Development restore needs separate approval.

Final migration source SHA-256:
`f5dd964e3a2f6757fc0a879a058d015f50535d20efb1ef82153a35e806368061`.
The changes add an optional shared transaction and explicit public schema names;
column types, constraints and account policy remain the original proposal.

See [installation report](../../../../../docs/audits/FITM_GOOGLE_OAUTH_026_INSTALLATION_READINESS.md)
for actual evidence, tested command templates, remaining limits and approval gates.

## Linking policy proposed for approval

Set `GOOGLE_ACCOUNT_LINKING_ENABLED=true` only after approving this policy:
user chooses a role portal, verifies a fresh Google nonce, explicitly supplies
email/password of the existing internal account, and the backend verifies the
active actor and ownership under lock. Internal and Google emails may differ:
ownership of **both** accounts, not email equality, authorizes linking. No actor
row or Student Profile is edited. Unknown/unlinked identities never auto-create
Teacher/Head/Staff accounts and do not disclose whether an internal email exists.

No-password Teacher/Staff accounts remain blocked. Proposed administrator-assisted
process: verify university personnel records independently, use a separately
authorized administrator to issue a short-lived single-use actor-specific linking
invitation, and audit issuer/actor/subject/consumption. No admin endpoint, arbitrary
mapping write or bypass is supplied until the administrator authority and evidence
policy are approved. Reassignment/unlinking is similarly out of the current runtime.

## Current Student policy / Google-only creation — 2026-10-15

The user approved verified Google student email matching
`^s([0-9]{13})@email\.kmutnb\.ac\.th$` as registration evidence, subject to
the existing domain/hosted-domain policy. Extract the 13 digits as Student ID.
This supersedes the earlier roster/invitation proposal for registration only;
it does not attest current enrollment or internship eligibility. No domain or
personnel identity policy changed. This prepared directory is historical;
current database initialization is model-driven, without migrations.

The password schema gate is resolved in Development: only
`ALTER TABLE public.students ALTER COLUMN password_hash DROP NOT NULL` was run.
All four original Student rows were compared by server-side fingerprints and
preserved; no other Student column changed. The model now matches nullable hashes.
Ordinary creation still requires a real validated password and bcrypt hashing.
Only the server-side `googleOnlyCreation` option with a transaction permits a new
Student without a password. Null hashes return false from password comparison.

`GOOGLE_STUDENT_ONBOARDING_ENABLED` defaults to false and requires explicit
`NODE_ENV=development`; creation additionally uses the existing local-development
database guard. Local backend/.env enables it, and only Backend was recreated.
Login/linking/domain/hosted-domain values remain unchanged. Config now reports
`onboardingEnabled:true` in the authorized Development environment; Production,
test and unspecified environments cannot enable it.

`/onboard` accepts only Student login-proof fields and verifies the same Google
token/challenge as `/login`. For a new eligible subject, create Student with the
email-derived ID, Google given/family names, NULL password hash and existing
co_op/pending defaults, then create the mapping in the same transaction. Do not
invent names or Profile rows; missing names return GOOGLE_STUDENT_PROFILE_REQUIRED
without account creation. Existing mappings log in normally. Email or Student-ID
collisions require ownership linking and never adopt an existing Student row.
The subject lock, additional Student-ID lock and existing SQL unique indexes
serialize decisions; mapping/unique failures roll back the new Student.

## Student linking location / Register session update — 2026-10-15

Student linking now occurs only inside the authenticated Student Dashboard.
Anonymous Google login with an existing Student email/ID collision returns
409 GOOGLE_DASHBOARD_LINK_REQUIRED and password-login/Dashboard instructions,
without a JWT, ownership receipt, duplicate Student or linking form on Login.
Anonymous Student link/verify/confirm paths are rejected. Legacy personnel
authentication/linking backend paths retain their existing policies.

Protected `/student/status`, `/student/challenge`, `/student/link` and
`/student/link/confirm` routes use the existing signature/expiry/Student middleware.
The service loads and authorizes the live Student; the caller cannot supply a
target actor ID. A signed five-minute dashboard challenge binds that actor to
the hash of the exact session JWT. Google nonce/verified claims plus the current
website password prove fresh ownership. Preview returns the existing two-minute
confirmation receipt extended with the same actor/session binding. Explicit
confirmation rechecks password/target fingerprints and mapping conflicts under
transaction/locks. Receipt kinds cannot be interchanged, replay is rejected and
only hashes are stored in GoogleAuthRequest. Confirm returns linked status, not a
new JWT. Google-only accounts display their existing mapping and cannot link twice.

Website Register now creates the Student and ordinary Application JWT within one
transaction, then returns 201 with the safe Student session/authorized Dashboard.
Password validation and bcrypt are unchanged. No separate verification gate exists
in the current registration policy; pending is an authorized Student status.
Frontend uses the existing session adapter with remember=false and navigates to
Student Dashboard. A JWT issuance failure rolls back the new account.

Verification this update: PostgreSQL/model/controller/HTTP integration within a
rolled-back transaction covered Register session/failure rollback, Google creation
and return, NULL-hash rejection, collision guidance and Dashboard preview/confirm,
cross-account/session binding, password change, nonce/expiry/replay/conflicts and
JWT/role/origin/body-target guards. Original Student fingerprints and row counts
were preserved. Headless UI used API/Provider mocks; full role workflows were not
run. Earlier SQL unique/lock verification remains historical evidence. Provider,
real-account E2E and concurrent committed registrations remain NOT TESTED.

Rollback is a plan only: disable onboarding first; retain existing Google logins.
Under an exclusive Student table lock in a transaction, check for NULL hashes.
Restore NOT NULL/model requirements only if none exist. If any Google-only account
exists, keep nullable pending an approved account-preserving plan; never invent
passwords or delete accounts. Do not run migrations/reset/alter-sync.
