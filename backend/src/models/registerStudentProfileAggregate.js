// Register only the schema already installed by 022-025. Never sync or migrate.
const { extensionAttributes, defineRelationModels, associateRelations, preparedFileIndexes } = require("../db/prepared/student-profile-phase2a/models");
const { extensions } = require("../db/prepared/student-profile-phase2a/schema");
function registerStudentProfileAggregate(models, sequelize) {
  for (const name of ["Student", "StudentProfile", "StudentFile"]) {
    const model = models[name];
    const table = model.getTableName();
    Object.assign(model.rawAttributes, extensionAttributes(table));
    model.refreshAttributes();
    // Legacy role/workflow includes retain their original projection. Only the
    // owner API explicitly selects these additions; encrypted ID is never a DTO.
    model.addScope("defaultScope", { attributes: { exclude: Object.keys(extensions[table].columns) } }, { override: true });
  }
  models.StudentFile.options.indexes.push(...preparedFileIndexes);
  const relations = defineRelationModels(sequelize);
  Object.assign(models, relations);
  associateRelations(models.Student, relations);
}
module.exports = { registerStudentProfileAggregate };
