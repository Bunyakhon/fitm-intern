const { tables } = require("../schema");
const { createTable, runPrepared, down } = require("../migrationSupport");
const statements = Object.keys(tables).flatMap(createTable);
module.exports = { statements, up: ({ context }) => runPrepared(context, statements), down };
