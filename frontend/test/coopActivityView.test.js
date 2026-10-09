import test from 'node:test';
import assert from 'node:assert/strict';
import { bangkokLocal, monthRange, calendarDays, activityDate } from '../src/pages/coopActivityView.js';
test('Activity date inputs and display use Bangkok regardless of host timezone',()=>{
  assert.equal(bangkokLocal('2026-10-31T18:30:00.000Z'),'2026-11-01T01:30'); assert.match(activityDate('2026-11-01T02:00:00Z'),/09:00/);
});
test('Month boundaries handle December rollover and leap February',()=>{
  assert.deepEqual(monthRange('2026-12'),{from:'2026-12-01T00:00+07:00',to:'2027-01-01T00:00+07:00'}); assert.equal(calendarDays('2028-02',[]).length,29);
});
test('Monthly grid includes all days of spanning events and excludes exclusive midnight end',()=>{
  const row={id:'a',starts_at:'2026-10-31T23:30+07:00',ends_at:'2026-11-03T00:00+07:00'}, days=calendarDays('2026-11',[row]);
  assert.equal(days[0].activities.length,1); assert.equal(days[1].activities.length,1); assert.equal(days[2].activities.length,0);
});
