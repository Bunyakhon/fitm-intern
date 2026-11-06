// Readiness is derived from actual PostgreSQL metadata, never a frontend flag.
function englishTitleColumnReady(column) {
  return !!column && /^(?:CHARACTER VARYING|VARCHAR)\(255\)$/i.test(column.type || "")
    && column.allowNull === true && column.defaultValue == null;
}
module.exports = { englishTitleColumnReady };
