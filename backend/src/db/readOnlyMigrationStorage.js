const { QueryTypes } = require("sequelize");
module.exports = sequelize => ({
  executed: async () => {
    const [row] = await sequelize.query("SELECT to_regclass('public.sequelize_meta') AS ledger", { type: QueryTypes.SELECT });
    return row.ledger ? (await sequelize.query("SELECT name FROM public.sequelize_meta ORDER BY name", { type: QueryTypes.SELECT })).map(r => r.name) : [];
  },
  logMigration: async () => { throw new Error("READ_ONLY_STATUS"); },
  unlogMigration: async () => { throw new Error("READ_ONLY_STATUS"); },
});
