# Student Profile Phase 2A — prepared source only

This directory is outside the active Umzug migrations glob and model loader.
Importing its specifications/factories does not connect to PostgreSQL. Nothing here
is installed, registered with the application, or added to the API allowlist.

Review the Thai implementation report and generated field/schema dictionary:

- [Implementation and rollout plan](../../../../../docs/audits/FITM_STUDENT_PROFILE_PHASE2A_PREPARATION.md)
- [148-point coverage and dictionary](../../../../../docs/audits/FITM_STUDENT_PROFILE_PHASE2A_FIELD_COVERAGE.md)

Planned order (filenames are reserved proposals; recheck collisions in Phase 2B):

1. 022: nullable extensions to existing students/student_profiles; revision metadata.
2. 023: four owner-scoped relations, without converting existing text.
3. 024: append document enum values; **commit separately**.
4. 025: nullable file metadata, same-owner FK and indexes for new document types.

Every up handler refuses the ordinary QueryInterface unless a future, explicitly
approved Phase 2B runner supplies studentProfilePhase2BApproved = true.
No such runner or executable activation command is provided in this phase.
Never place these files directly in the active directory: keep their helper/spec
dependency paths intact and review the targeted Umzug resolver/storage first.
The normal db:migrate command currently also installs unrelated pending 019–021.

models.js exports extensionAttributes for merging into existing model definitions,
plus defineRelationModels/associateRelations for the four new relations.
It does not define another Student/Account. preparedFileIndexes must be appended
to existing file indexes. DB CHECK/composite FK definitions live in schema/migrations;
Sequelize validators alone do not express every constraint. Do not use sync().

profile_data_revision is reserved metadata, **not active concurrency protection**.
No writer increments it yet. Revision activation must include all affected readers,
writers, If-Match clients and transaction rules in the report; enabling new relation
writes before that would permit lost updates.

Acknowledgement/snapshot/retention design is a separate Pending Policy proposal
in schema.js. There is deliberately no acknowledgement migration or signature model.
No legal signature mechanism, retention duration or statement text has been assumed.

All down handlers refuse destructive rollback. Roll back application code and retain
additive schema/data/enum labels. Removing data or schema needs a separately approved,
backed-up plan. Tests use mock transactions and disconnected Sequelize models;
they do not establish that DDL passes PostgreSQL.
