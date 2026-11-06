const { Op } = require("sequelize");

// Matches existing Staff review policy: NULL has no deadline; equality is expired.
function publishedJobWhere(now = new Date()) {
  return { status: "published", [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }] };
}
function isPublishedJobAvailable(job, now = new Date()) {
  if (!job || job.status !== "published") return false;
  if (job.expires_at == null) return true;
  const expiry = new Date(job.expires_at).getTime();
  return Number.isFinite(expiry) && expiry > now.getTime();
}
module.exports = { publishedJobWhere, isPublishedJobAvailable };
