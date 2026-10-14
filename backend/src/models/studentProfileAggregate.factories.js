// Explicit factories only: never import the live models/index.js or database config.
const { DataTypes, literal, Op } = require("sequelize");
const { extensions, tables, existingFileTypes, newFileTypes } = require("./studentProfileAggregate.schema");
function attribute(spec) {
  const types = {
    varchar: () => DataTypes.STRING(spec.length), char: () => DataTypes.CHAR(spec.length),
    numeric: () => DataTypes.DECIMAL(spec.precision, spec.scale), uuid: () => DataTypes.UUID,
    bytea: () => DataTypes.BLOB, date: () => DataTypes.DATEONLY, timestamptz: () => DataTypes.DATE,
    boolean: () => DataTypes.BOOLEAN, bigint: () => DataTypes.BIGINT, integer: () => DataTypes.INTEGER,
    smallint: () => DataTypes.SMALLINT, text: () => DataTypes.TEXT,
  };
  const result = { type: types[spec.type](), allowNull: spec.nullable };
  if (spec.length) result.validate = { len: [0, spec.length] };
  if (spec.primaryKey) Object.assign(result, { primaryKey: true, defaultValue: DataTypes.UUIDV4 });
  if (spec.defaultSql) result.defaultValue = spec.type === "bigint" ? "0" :
    spec.type === "integer" ? 0 : spec.type === "boolean" ? true : literal(spec.defaultSql);
  if (spec.references) Object.assign(result, {
    references: { model: spec.references, key: "id" }, onDelete: spec.deleteBehavior, onUpdate: "RESTRICT",
  });
  return result;
}
const attributes = spec => Object.fromEntries(Object.entries(spec.columns).map(([key, value]) => [key, attribute(value)]));
function extensionAttributes(tableName) {
  if (!extensions[tableName]) throw new Error("UNKNOWN_PROFILE_EXTENSION");
  const result = attributes(extensions[tableName]);
  if (tableName === "student_files") result.file_type = {
    type: DataTypes.ENUM(...existingFileTypes, ...newFileTypes), allowNull: false,
  };
  return result;
}
function defineRelationModels(sequelize) {
  const models = {};
  for (const [tableName, spec] of Object.entries(tables)) {
    models[spec.modelName] = sequelize.define(spec.modelName, attributes(spec), {
      tableName, underscored: true, timestamps: true, createdAt: "created_at", updatedAt: "updated_at",
      validate: {
        validDraftValues() {
          // Mirror stable DB constraints. Nullable draft fields remain nullable.
          const allowed = {
            address_type: ["registered", "current"],
            education_level: ["bachelor", "high_vocational", "high_school_vocational"],
            category: ["computer", "language"], proficiency: ["very_good", "good", "moderate", "fair"],
          };
          for (const [field, values] of Object.entries(allowed)) {
            const value = this.get(field);
            if (value != null && !values.includes(value)) throw new Error("INVALID_" + field);
          }
          const gpa = this.get("gpa");
          if (gpa != null && (!/^\d(?:\.\d{1,2})?$/.test(String(gpa)) || Number(gpa) < 0 || Number(gpa) > 4)) throw new Error("INVALID_gpa");
          for (const [field, min, max] of [["graduation_year", 1, 9999], ["display_order", 0, 2147483647]]) {
            const value = this.get(field);
            if (value != null && (!Number.isInteger(value) || value < min || value > max)) throw new Error("INVALID_" + field);
          }
        },
      },
      indexes: [
        ...(spec.unique || []).map((fields, index) => ({ name: `${tableName}_unique_${index}`, unique: true, fields })),
        ...(spec.indexes || []).map((fields, index) => ({ name: `${tableName}_owner_${index}`, fields })),
      ],
    });
  }
  return models;
}
function associateRelations(existingStudent, relationModels) {
  for (const spec of Object.values(tables)) {
    const model = relationModels[spec.modelName];
    existingStudent.hasMany(model, { foreignKey: "student_id", as: spec.association, onDelete: "CASCADE", onUpdate: "RESTRICT" });
    model.belongsTo(existingStudent, { foreignKey: "student_id", as: "student", onDelete: "CASCADE", onUpdate: "RESTRICT" });
  }
}
const preparedFileIndexes = [
  { name: "phase2a_profile_document_current", unique: true, fields: ["student_id", "file_type"],
    where: { is_current: true, file_type: { [Op.in]: newFileTypes.filter(value => value !== "supporting_other") } } },
  { name: "phase2a_profile_documents_owner", fields: ["student_id", "file_type", "created_at", "id"],
    where: { file_type: { [Op.in]: newFileTypes } } },
];
module.exports = { extensionAttributes, defineRelationModels, associateRelations, preparedFileIndexes };
