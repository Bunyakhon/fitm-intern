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

## New Student onboarding — separate policy/schema gate

Currently `/api/auth/google/onboard` returns 503
`GOOGLE_ONBOARDING_APPROVAL_REQUIRED` with no writes. `onboardingEnabled` is always
false and cannot be switched on by an environment flag. Existing password
registration remains available.

Proposed reviewable design (not an installed schema):

1. University roster or approved administrator invitation attests Student ID and
   verified university email. The backend checks this attestation; user-entered
   Student ID or an email-derived ID is never sufficient proof.
2. Issue a distinct five-minute `onboard` nonce and bind proof to Google subject,
   verified email, Student ID, request and expiry. Store/consume proof once.
3. Student submits confirmed Student ID, first/last names and approved proof.
   Validate exact current domain/hd policy again. Reject email/Student-ID collision
   without adopting an existing Student account; direct it to ownership linking.
4. Under a transaction, lock the approved roster/invitation, consume proof/request,
   create the real Student with `track=co_op`, `status=pending`, and identity. DB
   email/Student-ID/subject uniqueness gives one concurrent-registration winner.
5. A separate approved migration must make `students.password_hash` nullable for
   Google-only accounts. The Student virtual-password validator and hash hook must
   distinguish Google-only creation, and password login must return ordinary 401
   for null hashes. Do not generate a fake/random account password.
6. The Student model's current `@email.kmutnb.ac.th` rule also needs an approved
   Google-creation validation context so configured domains can onboard without
   broadening existing password registration. Do not skip model validation.
7. Preserve all existing IDs/hashes, Profile rows/revisions/files/relationships.
   After commit, return the ordinary Application JWT and reuse Student Remember Me.
8. Test real disposable SQL: proof tampering/expiry/replay, email and Student-ID
   collisions, concurrent registration, required fields, rollback after identity
   insert, null-password login, and backward-compatible profile creation.

Approvals needed: source of Student-ID evidence, invitation/roster authority,
Google-only password schema/model contract and profile initialization policy.
This proposal is preparation, not a tested onboarding implementation.
