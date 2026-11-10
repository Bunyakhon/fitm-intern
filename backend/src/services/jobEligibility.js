const { Op } = require("sequelize");
const { JOB_IDS, isDevelopmentDatabase } = require("./internthDevelopmentData");

// Matches existing Staff review policy: NULL has no deadline; equality is expired.
function publishedJobWhere(now = new Date(), database = require("../config/database")) {
  return { status: "published", ...(!isDevelopmentDatabase(database) ? { [Op.and]: [{ id: { [Op.notIn]: JOB_IDS } }] } : {}),
    [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }] };
}
function isPublishedJobAvailable(job, now = new Date(), database = require("../config/database")) {
  if (!job || job.status !== "published" || (JOB_IDS.includes(job.id) && !isDevelopmentDatabase(database))) return false;
  if (job.expires_at == null) return true;
  const expiry = new Date(job.expires_at).getTime();
  return Number.isFinite(expiry) && expiry > now.getTime();
}
module.exports = { publishedJobWhere, isPublishedJobAvailable };
