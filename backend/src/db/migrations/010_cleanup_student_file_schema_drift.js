const { QueryTypes } = require("sequelize");

const SCHEMA = "public";
const TABLE = "student_files";
const CANONICAL = "student_files_storage_path_key";

// PostgreSQL 16 catalogs: use actual keys/semantics, never numbered names.
// https://www.postgresql.org/docs/16/catalog-pg-constraint.html
// https://www.postgresql.org/docs/16/catalog-pg-index.html
const TABLE_SQL = `
  SELECT c.oid, c.relkind, c.relispartition,
         EXISTS (SELECT 1 FROM pg_catalog.pg_inherits h
                 WHERE h.inhrelid = c.oid OR h.inhparent = c.oid) AS inherited,
         a.attnum, a.attnotnull
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_catalog.pg_attribute a
    ON a.attrelid = c.oid AND a.attname = 'storage_path'
   AND a.attnum > 0 AND NOT a.attisdropped
  WHERE n.nspname = :schema AND c.relname = :table
`;

const CONSTRAINTS_SQL = `
  SELECT c.oid, c.conname, c.conindid, ix.relname AS index_name,
         c.convalidated, c.conislocal, c.coninhcount, c.conparentid,
         i.indisunique, i.indisvalid, i.indisready, i.indislive,
         i.indisprimary, i.indisexclusion, i.indisreplident, i.indisclustered,
         ix.relkind AS index_kind,
         EXISTS (
           SELECT 1 FROM pg_catalog.pg_depend d
           WHERE d.classid = 'pg_catalog.pg_class'::regclass
             AND d.objid = c.conindid AND d.objsubid = 0
             AND d.refclassid = 'pg_catalog.pg_constraint'::regclass
             AND d.refobjid = c.oid AND d.deptype = 'i'
         ) AS owned_index,
         jsonb_build_object(
           'columns', c.conkey::text,
           'deferrable', c.condeferrable, 'deferred', c.condeferred,
           'access_method', am.amname,
           'key_count', i.indnkeyatts, 'attribute_count', i.indnatts,
           'index_keys', i.indkey::text,
           'opclasses', i.indclass::text, 'collations', i.indcollation::text,
           'options', i.indoption::text,
           'nulls_not_distinct', i.indnullsnotdistinct,
           'immediate', i.indimmediate,
           'expression', pg_catalog.pg_get_expr(i.indexprs, i.indrelid),
           'predicate', pg_catalog.pg_get_expr(i.indpred, i.indrelid)
         ) AS signature
  FROM pg_catalog.pg_constraint c
  LEFT JOIN pg_catalog.pg_index i
    ON i.indexrelid = c.conindid AND i.indrelid = c.conrelid
  LEFT JOIN pg_catalog.pg_class ix ON ix.oid = c.conindid
  LEFT JOIN pg_catalog.pg_am am ON am.oid = ix.relam
  WHERE c.conrelid = :tableOid AND c.contype = 'u'
    AND c.conkey = ARRAY[CAST(:attnum AS smallint)]
`;

function fail(message) {
  throw new Error(`010 storage_path cleanup: ${message}`);
}

function validKeeper(constraint) {
  return constraint.indisvalid && constraint.indisready && constraint.indislive;
}

module.exports = {
  async up({ context: queryInterface }) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== "postgres") {
      fail("PostgreSQL is required");
    }
    const quote = (name) => queryInterface.queryGenerator.quoteIdentifier(name);
    const tableName = `${quote(SCHEMA)}.${quote(TABLE)}`;

    await sequelize.transaction(async (transaction) => {
      const select = (sql, replacements = {}) =>
        sequelize.query(sql, {
          replacements,
          transaction,
          type: QueryTypes.SELECT,
        });
      await sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await sequelize.query("SET LOCAL statement_timeout = '60s'", {
        transaction,
      });

      const [beforeLock] = await select(TABLE_SQL, {
        schema: SCHEMA,
        table: TABLE,
      });
      if (
        !beforeLock ||
        beforeLock.relkind !== "r" ||
        beforeLock.relispartition ||
        beforeLock.inherited
      ) {
        fail("expected a regular, non-inherited public.student_files table");
      }
      // Keep the existing UNIQUE enforced and prevent concurrent DDL/writes
      // while checking dependencies and removing only redundant constraints.
      await sequelize.query(
        `LOCK TABLE ${tableName} IN ACCESS EXCLUSIVE MODE`,
        { transaction },
      );
      const [table] = await select(TABLE_SQL, { schema: SCHEMA, table: TABLE });
      if (
        !table ||
        table.oid !== beforeLock.oid ||
        table.relkind !== "r" ||
        table.relispartition ||
        table.inherited ||
        !table.attnum ||
        !table.attnotnull
      ) {
        fail("table identity or NOT NULL storage_path assumption changed");
      }

      const inspect = () =>
        select(CONSTRAINTS_SQL, { tableOid: table.oid, attnum: table.attnum });
      const constraints = await inspect();
      if (!constraints.length)
        fail("no storage_path UNIQUE constraint; manual review required");

      for (const constraint of constraints) {
        const s = constraint.signature;
        if (
          !constraint.convalidated ||
          !constraint.conislocal ||
          constraint.coninhcount !== 0 ||
          constraint.conparentid !== 0 ||
          !constraint.owned_index ||
          !constraint.indisunique ||
          !constraint.indislive ||
          constraint.indisprimary ||
          constraint.indisexclusion ||
          constraint.index_kind !== "i" ||
          s.access_method !== "btree" ||
          s.deferrable ||
          s.deferred ||
          !s.immediate ||
          s.nulls_not_distinct ||
          s.key_count !== 1 ||
          s.attribute_count !== 1 ||
          s.index_keys !== String(table.attnum) ||
          s.expression !== null ||
          s.predicate !== null
        ) {
          fail(`unexpected constraint/index shape: ${constraint.conname}`);
        }
      }
      const signature = JSON.stringify(constraints[0].signature);
      if (constraints.some((c) => JSON.stringify(c.signature) !== signature)) {
        fail("storage_path UNIQUE signatures differ; nothing removed");
      }

      const eligible = constraints
        .filter(validKeeper)
        .sort((a, b) =>
          a.conname < b.conname ? -1 : a.conname > b.conname ? 1 : 0,
        );
      const keeper =
        eligible.find((c) => c.conname === CANONICAL) || eligible[0];
      if (!keeper) fail("no valid/ready UNIQUE keeper; nothing removed");
      const duplicates = constraints.filter((c) => c.oid !== keeper.oid);

      // Reject dependencies on either the duplicate constraint or its index.
      // Its own internal index ownership is the only expected dependency.
      // RESTRICT below remains a second guard against unexpected dependents.
      for (const duplicate of duplicates) {
        if (duplicate.indisreplident || duplicate.indisclustered) {
          fail(
            `duplicate index has replica identity/cluster role: ${duplicate.conname}`,
          );
        }
        const dependencies = await select(
          `
          SELECT d.classid, d.objid, d.deptype
          FROM pg_catalog.pg_depend d
          WHERE (
            (d.refclassid = 'pg_catalog.pg_constraint'::regclass AND d.refobjid = :constraintOid)
            OR (d.refclassid = 'pg_catalog.pg_class'::regclass AND d.refobjid = :indexOid)
          ) AND NOT (
            d.classid = 'pg_catalog.pg_class'::regclass AND d.objid = :indexOid
            AND d.objsubid = 0 AND d.refclassid = 'pg_catalog.pg_constraint'::regclass
            AND d.refobjid = :constraintOid AND d.deptype = 'i'
          )
        `,
          { constraintOid: duplicate.oid, indexOid: duplicate.conindid },
        );
        if (dependencies.length)
          fail(`external dependency on ${duplicate.conname}; nothing removed`);
      }

      for (const duplicate of duplicates) {
        await sequelize.query(
          `ALTER TABLE ${tableName} DROP CONSTRAINT ${quote(duplicate.conname)} RESTRICT`,
          { transaction },
        );
      }
      const remaining = await inspect();
      if (
        remaining.length !== 1 ||
        remaining[0].oid !== keeper.oid ||
        !validKeeper(remaining[0]) ||
        JSON.stringify(remaining[0].signature) !== signature
      ) {
        fail("postcondition failed; transaction will roll back");
      }
      console.info(
        `[010] kept ${keeper.conname} (index ${keeper.index_name}); removed ${duplicates.length} redundant UNIQUE constraints`,
      );
    });
  },

  async down() {
    // Like 007a's non-destructive down: cleanup does not change data or the
    // intended schema contract. Keep uniqueness; do not restore duplication.
    // Umzug may remove the ledger entry; rerunning up safely checks again.
    console.info(
      "[010] non-destructive rollback: canonical uniqueness retained; duplicates are not recreated",
    );
  },
};
