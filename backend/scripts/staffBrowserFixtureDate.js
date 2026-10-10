// The Company Response API parses a date-only payload as midnight UTC.
// Keep positive browser fixtures at or before now across local day boundaries.
function companyResponseFixtureDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

module.exports = { companyResponseFixtureDate };
