// Register the current Student Profile schema. No connection or DDL on import.
const { extensionAttributes, defineRelationModels, associateRelations, preparedFileIndexes } = require("./studentProfileAggregate.factories");
const { extensions } = require("./studentProfileAggregate.schema");
const { CONTACT_FIELDS } = require("../services/studentProfileContacts");
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
  // Sequelize INSERT normally RETURNINGs every model column, even when omitted
  // from the INSERT. Legacy/onboarding creates must work before contact DDL.
  models.StudentProfile.addHook("beforeCreate", "profileContactsReturning", (_profile, options) => {
    if (options.returning === true) options.returning = Object.entries(models.StudentProfile.rawAttributes)
      .filter(([key]) => !CONTACT_FIELDS.includes(key) && key !== "english_prefix").map(([key, attr]) => attr.field || key);
  });
  const relations = defineRelationModels(sequelize);
  Object.assign(models, relations);
  associateRelations(models.Student, relations);
}
module.exports = { registerStudentProfileAggregate };
