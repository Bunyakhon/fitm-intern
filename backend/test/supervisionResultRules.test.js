const test = require('node:test'), assert = require('node:assert/strict');
const { resultInput, validateImage, MAX_IMAGE_SIZE } = require('../src/services/supervisionResultRules');
const png = Buffer.from([137,80,78,71,13,10,26,10]);
test('result draft accepts incomplete descriptive data and multipart versions', () => { assert.equal(resultInput({ version: '0', appointment_version: '2' }, true).summary, ''); assert.equal(resultInput({ version: 1, appointment_version: 2, visited_on: '2026-10-08', summary: ' ผล ' }).summary, 'ผล'); });
test('result rejects invented identity/rubric fields, stale-shaped version and invalid date', () => { for (const patch of [{ teacher_id: 'x' }, { score: 10 }, { version: -1 }, { version: 'x' }, { visited_on: '2026-02-30' }, { summary: 'x'.repeat(5001) }]) assert.throws(() => resultInput({ version: 0, appointment_version: 2, ...patch }), e => e.status === 400); });
test('result images require agreement of extension, MIME, signature and actual size', () => {
  const file = { originalname: 'evidence.png', mimetype: 'image/png', size: png.length, buffer: png }; assert.equal(validateImage(file).mime_type, 'image/png');
  for (const patch of [{ originalname: 'evidence.jpg' }, { mimetype: 'image/svg+xml' }, { buffer: Buffer.from('notimage'), size: 8 }, { size: MAX_IMAGE_SIZE + 1 }, { originalname: '../evidence.png' }, { size: 0 }]) assert.throws(() => validateImage({ ...file, ...patch }), e => e.status === 400);
  assert.equal(validateImage({ originalname: 'evidence.jpeg', mimetype: 'image/jpeg', size: 3, buffer: Buffer.from([255,216,255]) }).mime_type, 'image/jpeg');
});
