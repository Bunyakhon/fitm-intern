const path = require("node:path");
const { Umzug } = require("umzug");
const { QueryTypes: SequelizeQueryTypes } = require("sequelize");
const { NAME: googleName, SOURCE: googleSource } = require("./googleOAuth026");

const preparedNames = Object.freeze([
  "022_prepare_student_profile_scalars.js",
  "023_prepare_student_profile_relations.js",
  "024_prepare_student_profile_file_types.js",
  "025_prepare_student_profile_document_metadata.js",
]);
const preparedDirectory = path.join(__dirname, "prepared/student-profile-phase2a/migrations");

// Keep the original glob/default resolver. Ordinary CLI discovery adds ONLY
// already-installed prepared sources, so status/down never silently omit them.
// Uninstalled prepared sources remain available solely to the controlled runner.
function withStudentProfileMigrations(sequelize, activeSpecification, { includeUninstalled = false } = {}) {
  const activeResolver = new Umzug({
    migrations: activeSpecification,
    context: sequelize.getQueryInterface(),
    storage: {
      executed: async () => [],
      logMigration: async () => { throw new Error("DISCOVERY_ONLY"); },
      unlogMigration: async () => { throw new Error("DISCOVERY_ONLY"); },
    },
    logger: undefined,
  }).migrations;
  return async context => {
    const active = await activeResolver(context);
    if (active.some(migration => [...preparedNames, googleName].includes(migration.name))) {
      throw new Error("PREPARED_MIGRATION_NAME_COLLISION");
    }
    // 026 is installed-only EVEN for the controlled Profile 022-025 runner.
    // It must never enter an ordinary pending list or change its installation order.
    const [table] = await sequelize.query("SELECT to_regclass('public.sequelize_meta') AS ledger", {
      type: SequelizeQueryTypes.SELECT,
    });
    const installed = table.ledger ? await sequelize.query("SELECT name FROM public.sequelize_meta ORDER BY name", {
      type: SequelizeQueryTypes.SELECT,
    }) : [];
    const selected = includeUninstalled ? preparedNames : preparedNames.filter(name => installed.some(row => row.name === name));
    const google = installed.some(row => row.name === googleName) ? [Umzug.defaultResolver({ name: googleName, path: googleSource })] : [];
    return [...active, ...google, ...selected.map(name => Umzug.defaultResolver({
      name, path: path.join(preparedDirectory, name),
    }))].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  };
}
module.exports = { preparedNames, preparedDirectory, withStudentProfileMigrations };
