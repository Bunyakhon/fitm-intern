const test = require('node:test');
const assert = require('node:assert/strict');
const { companyResponseFixtureDate } = require('../scripts/staffBrowserFixtureDate');
const { responseValues } = require('../src/services/companyResponseRules');

// Exercise the fixture against the real API validator; no database or browser.
for (const [instant, date] of [
  ['2026-10-09T16:43:19.017Z', '2026-10-09'], // Previous successful K.
  ['2026-10-09T16:59:59.999Z', '2026-10-09'],
  ['2026-10-09T17:00:00.000Z', '2026-10-09'], // Bangkok midnight.
  ['2026-10-09T17:17:09.046Z', '2026-10-09'], // Latest failed K.
  ['2026-10-10T00:00:00.000Z', '2026-10-10'], // UTC midnight.
  ['2026-12-31T17:00:00.000Z', '2026-12-31'], // Bangkok year rollover.
  ['2028-02-29T17:00:00.000Z', '2028-02-29'], // Bangkok leap-day rollover.
]) test(`Company Response browser fixture is accepted at ${instant}`, () => {
  const now = new Date(instant), stamp = companyResponseFixtureDate(now);
  assert.equal(stamp, date);
  const result = responseValues({ status: 'accepted', responded_at: stamp }, false, now.getTime());
  assert.equal(result.responded_at.toISOString(), `${date}T00:00:00.000Z`);
  assert.ok(result.responded_at.getTime() <= now.getTime());
});

test('Latest K reproduces the old Bangkok fixture rejection; future-date validation remains enforced', () => {
  const now = new Date('2026-10-09T17:17:09.046Z');
  const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  assert.equal(bangkokDate, '2026-10-10');
  assert.throws(() => responseValues({ status: 'accepted', responded_at: bangkokDate }, false, now.getTime()),
    { status: 400, code: 'INVALID_COMPANY_RESPONSE_DATE' });
});
