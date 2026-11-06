import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { workspaceFields, ProfileSectionDraft, canonicalWorkspaceValue, validateProfileDocument, safeFriendFacebookUrl } from '../src/pages/studentProfileWorkspaceDraft.js';
import { pdfFieldSpecs, buildProfilePdfChanges } from '../src/pages/studentProfilePdfDraft.js';
import { renderProfileAdvisors } from '../src/pages/studentProfileAdvisors.js';
import { StudentProfileDraft, readProfileInputs, writeProfileInputs, PROFILE_INPUTS } from '../src/pages/studentProfileDraft.js';
import { mountProfileBirthCalendar, profileCalendarToday } from '../src/pages/studentProfileBirthCalendar.js';
const require = createRequire(import.meta.url);
const rules = require('../../backend/src/services/studentProfileValidation');
const friend = { nickname: 'ฟ้า', phone: '0810000000', line_id: 'friend.fixture', facebook_url: 'https://www.facebook.com/fixture' };
const fields = [...workspaceFields.contacts, ...workspaceFields.close_friends];

function dom() {
  const nodes = new Map();
  let document;
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.events = {}; this.value = ''; this.attributes = {}; this.textContent = ''; this.ownerDocument = document; this.classList = { add() {}, remove() {} }; this.validity = {}; }
    set id(id) { this._id = id; nodes.set(id, this); } get id() { return this._id; }
    set value(value) { this._value = String(value); } get value() { return this.tagName === 'SELECT' && !this.children.some(child => child.value === this._value) ? '' : this._value; }
    append(...children) { for (const child of children) { if (child.parentElement) child.remove(); child.parentElement = this; this.children.push(child); } }
    prepend(child) { child.parentElement = this; this.children.unshift(child); }
    before(child) { child.parentElement = this.parentElement; this.parentElement.children.splice(this.parentElement.children.indexOf(this), 0, child); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(key, value) { this.attributes[key] = value; } getAttribute(key) { return this.attributes[key] ?? null; }
    addEventListener(type, listener) { this.events[type] = listener; }
    closest() { return this.parentElement; } focus() { document.activeElement = this; this.events.focus?.({ target: this }); }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    dispatchEvent(event) { event.target ||= this; this.events[event.type]?.(event); if (event.bubbles) this.parentElement?.dispatchEvent(event); }
    remove() { if (this.parentElement) { this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; } }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(selector === child.tagName.toLowerCase() ? [child] : []), ...child.querySelectorAll(selector)]); }
  }
  document = { getElementById: id => nodes.get(id), createElement: tag => new Element(tag), events: {}, addEventListener(type, listener) { this.events[type] = listener; },
    defaultView: { Event: class { constructor(type, options) { this.type = type; Object.assign(this, options); } } } };
  for (const id of ['panel-profile', 'profileThaiPrefixSlot', 'profileThaiGenderSlot', 'profileAcademicExtras', 'profilePersonalExtras', 'profileFamilyExtras', 'profileEmergencyExtras', 'profileAbilities', 'profileHealthExtras', 'profileStructuredAddresses', 'profileContactExtras', 'profileFriendContact', 'profileEducationRecords', 'profileTrainingRecords', 'profileComputerSkills', 'profileLanguageSkills', 'profileDocumentCards', 'profileLegacyAbilities', 'profileLegacySkills', 'profileWorkspaceStatus', 'profileSaveAll', 'profileReviewAll', 'profileRetryLoad', 'profileSaveState', 'profileSaveActionState']) { const element = new Element('div'); element.id = id; }
  return document;
}
const snapshot = (friends = [], revision = 'r1', extra = {}) => ({ student: { id: 'fixture' }, profile: {}, profile_revision: revision, addresses: [], education: [], training: [], skills: [], documents: [], close_friends: friends, profile_contacts_available: true, close_friends_available: true, profile_english_prefix_available: true, ...extra });
function workspace(save, options = {}) {
  const document = dom(), toasts = [], commits = [], errors = [], revealed = [], confirmations = [];
  const source = fs.readFileSync(new URL('../src/pages/studentProfileWorkspace.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from ["'][^"']+["'];\r?\n/gm, '').replace('export function mountStudentProfileWorkspace', 'function mountStudentProfileWorkspace');
  const context = { workspaceFields, ProfileSectionDraft, canonicalWorkspaceValue, validateProfileDocument, safeFriendFacebookUrl, mountProfileBirthCalendar,
    updateStudentProfileAggregate: save, showToast: (...args) => toasts.push(args), showConfirmModal: options => confirmations.push(options),
    setButtonLoading() {}, notifyProfileChange() {}, clearProfileErrors() {}, profileFieldError: (input,message) => { errors.push({ input, message }); input?.focus(); },
    profileMessage: (node, text) => { if (node) node.textContent = text; } };
  vm.runInNewContext(source + '\nglobalThis.mount = mountStudentProfileWorkspace;', context);
  const controller = context.mount({ document, reload: options.reload || (async () => null), onCommit: (...args) => commits.push(args), reveal: element => revealed.push(element), ...options });
  const section = document.getElementById('profileFriendContact').children[0];
  const cards = () => section.children[2].children;
  const input = (key, field) => document.getElementById(field === 'english_prefix' ? 'profileEnglishTitle' : 'profileWorkspace-' + key + '-' + field);
  const edit = (card, values) => { for (const [field,value] of Object.entries(values)) input(card.dataset.profileEntry,field).value = value; card.events.input(); };
  const remove = card => card.children.find(item => item.className === 'profile-entry-actions').children[1].events.click();
  const add = () => { section.children[0].children[1].events.click(); return cards().at(-1); };
  return { document, controller, toasts, commits, errors, revealed, confirmations, cards, input, edit, remove, add };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));

const savedAddresses = () => ['registered', 'current'].map((type, index) => ({ id: 'address-' + type, address_type: type,
  house_no: index ? '20' : '10', road: 'Road ' + type, subdistrict: 'Subdistrict ' + type, district: 'District ' + type,
  province: 'Province ' + type, postal_code: index ? '10200' : '10100' }));
const savedContactProfile = () => ({ hometown_address: 'Registered text fixture', current_address: 'Current text fixture',
  hometown_phone: '021111111', current_phone: '0822222222', student_line_id: 'student.fixture', student_facebook: 'fixture' });

test('contact/address DOM keeps one inline editor per field without copy actions, duplicate summary or nested forms', () => {
  const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot([], 'r1', { addresses: savedAddresses(), profile: savedContactProfile() }));
  const contact = h.document.getElementById('profileContactExtras'), addresses = h.document.getElementById('profileStructuredAddresses');
  assert.equal(contact.children.length, 1); assert.equal(contact.children[0].children[0].textContent, 'ข้อมูลติดต่อ');
  assert.equal(h.document.getElementById('profileContactEmail'), undefined);
  assert.equal(h.document.getElementById('profileCurrentAddressPreview').readOnly, true);
  assert.equal(h.input('address-text-current', 'current_address').readOnly, true);
  assert.equal(contact.children[0].contains(h.input('legacyAddresses', 'current_phone')), true);
  assert.equal(contact.children[0].contains(h.input('contacts', 'student_line_id')), true);
  assert.equal(contact.children[0].querySelectorAll('form').length, 0);
  assert.deepEqual(addresses.children.map(form => form.children[0].textContent), ['ที่อยู่ตามทะเบียนบ้าน', 'ที่อยู่ปัจจุบัน']);
  for (const [index, type, legacy] of [[0, 'registered', 'hometown_address'], [1, 'current', 'current_address']]) {
    const form = addresses.children[index]; assert.equal(form.querySelectorAll('form').length, 0);
    assert.equal(form.contains(h.input('address-text-' + type, legacy)), true);
    for (const field of workspaceFields.addresses) {
      const input = h.input('address-' + type, field.key);
      assert.equal(form.contains(input), true); assert.equal(input.disabled, false); assert.equal(input.required, !!field.required);
      assert.equal(input.value, savedAddresses()[index][field.key]);
    }
  }
  const walk = node => [node, ...node.children.flatMap(walk)];
  const nodes = [...walk(contact), ...walk(addresses)];
  assert.equal(nodes.some(node => /ใช้ที่อยู่.*ทะเบียนบ้าน|ที่อยู่และโทรศัพท์ที่บันทึกไว้|ช่องที่ระบุว่าจำเป็นต้องกรอก/.test(node.textContent)), false);
  assert.equal(nodes.some(node => node.tagName === 'INPUT' && ['checkbox', 'radio'].includes(node.type)), false);
  assert.equal(h.controller.hasChanges(), false); assert.equal(h.confirmations.length, 0);
  const html = fs.readFileSync(new URL('../src/student_coop/student_coop.html', import.meta.url), 'utf8');
  for (const id of ['profileHometownAddress', 'profileHometownPhone', 'profileCurrentAddress', 'profileCurrentPhone']) assert.equal(html.includes('id="' + id + '"'), false);
  for (const id of ['editHometownAddress', 'editHometownPhone', 'editCurrentAddress', 'editCurrentPhone', 'profileEmail']) assert.equal(html.split('id="' + id + '"').length - 1, 1);
  assert.equal(html.includes('profileContactEmail'), false);
  const main = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  assert.equal(main.includes('profileContactEmail'), false);
});

test('both addresses and legacy text save/reload independently; untouched values are omitted from Save All', async () => {
  const calls = []; let stored = snapshot([], 'r1', { addresses: savedAddresses(), profile: savedContactProfile() });
  const h = workspace(async (body, revision) => {
    assert.equal(revision, stored.profile_revision); calls.push(plain(body)); const operations = [];
    const next = plain(stored); Object.assign(next.profile, rules.normalizeProfile(body.profile || {}));
    for (const update of body.addresses?.update || []) {
      Object.assign(next.addresses.find(row => row.id === update.id), rules.normalizeChild('addresses', update.changes));
      operations.push({ kind: 'addresses', action: 'update', id: update.id });
    }
    stored = { ...next, profile_revision: 'r' + (calls.length + 1), aggregate_operations: operations }; return plain(stored);
  }); h.controller.acceptSnapshot(plain(stored));
  const original = plain(stored);
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0);
  for (const [type, legacy, value] of [['registered', 'hometown_address', '111'], ['current', 'current_address', '222']]) {
    const otherType = type === 'registered' ? 'current' : 'registered'; const before = plain(stored);
    h.input('address-' + type, 'house_no').value = value;
    if (type === 'registered') h.input('address-text-' + type, legacy).value = type + ' edited text';
    assert.equal(await h.controller.saveAll(), true);
    assert.deepEqual(calls.at(-1), { ...(type === 'registered' ? { profile: { [legacy]: type + ' edited text' } } : {}), addresses: { update: [{ id: 'address-' + type, changes: { house_no: value } }] } });
    assert.deepEqual(stored.addresses.find(row => row.address_type === otherType), before.addresses.find(row => row.address_type === otherType));
    h.controller.acceptSnapshot(plain(stored));
    const reloaded = workspace(async () => { throw Error('read-only reload'); }); reloaded.controller.acceptSnapshot(plain(stored));
    assert.equal(reloaded.input('address-' + type, 'house_no').value, value);
    assert.equal(reloaded.input('address-text-' + type, legacy).value, type === 'registered' ? type + ' edited text' : original.profile.current_address);
    assert.equal(reloaded.controller.hasChanges(), false); assert.equal(h.controller.hasChanges(), false);
  }
  h.input('legacyAddresses', 'current_phone').value = '0833333333';
  assert.equal(await h.controller.saveAll(), true); assert.deepEqual(calls.at(-1), { profile: { current_phone: '0833333333' } });
  for (const key of ['hometown_phone', 'student_line_id', 'student_facebook']) assert.equal(stored.profile[key], original.profile[key]);
  const pending = workspace(async body => { assert.deepEqual(plain(body), { profile: { current_phone: '0844444444' } }); return snapshot([], 'r2', { profile: { ...original.profile, current_phone: '0844444444' }, profile_contacts_available: false }); });
  pending.controller.acceptSnapshot(snapshot([], 'r1', { profile: original.profile, profile_contacts_available: false }));
  pending.input('legacyAddresses', 'current_phone').value = '0844444444'; assert.equal(await pending.controller.saveAll(), true);
});

test('absent structured rows stay absent on load; only the edited address is created using the existing mapping', async () => {
  let body;
  const profile = savedContactProfile();
  const h = workspace(async payload => {
    body = plain(payload);
    return snapshot([], 'r2', { profile, addresses: [{ id: 'new-current', ...payload.addresses.create[0] }], aggregate_operations: [{ kind: 'addresses', action: 'create', id: 'new-current' }] });
  }); h.controller.acceptSnapshot(snapshot([], 'r1', { profile }));
  assert.equal(h.controller.hasChanges(), false); assert.equal(await h.controller.saveAll(), false);
  h.input('address-current', 'house_no').value = '99'; assert.equal(await h.controller.saveAll(), true);
  assert.deepEqual(body, { addresses: { create: [{ house_no: '99', road: null, subdistrict: null, district: null, province: null, postal_code: null, address_type: 'current' }] } });
  assert.equal(h.input('address-text-registered', 'hometown_address').value, profile.hometown_address);
  assert.equal(h.input('address-registered', 'house_no').value, ''); assert.equal(h.controller.hasChanges(), false);
});

test('address drafts survive validation, failures, late typing and 409 review without copying the other address', async () => {
  const initial = snapshot([], 'r1', { addresses: savedAddresses(), profile: savedContactProfile() });
  let finish; const late = workspace(() => new Promise(resolve => { finish = resolve; })); late.controller.acceptSnapshot(plain(initial));
  late.input('address-registered', 'house_no').value = '30'; const saving = late.controller.saveAll();
  late.input('address-current', 'house_no').value = '40';
  const saved = plain(initial); saved.profile_revision = 'r2'; saved.addresses[0].house_no = '30'; saved.aggregate_operations = [{ kind: 'addresses', action: 'update', id: 'address-registered' }];
  finish(saved); assert.equal(await saving, true);
  assert.equal(late.input('address-current', 'house_no').value, '40'); assert.equal(late.input('address-text-current', 'current_address').value, initial.profile.current_address); assert.equal(late.controller.hasChanges(), true);
  for (const status of [undefined, 409]) {
    let h; h = workspace(async () => { throw Object.assign(Error('fixture'), { status, ...(status === 409 ? { data: saved } : {}) }); },
      { reload: async () => { h.controller.acceptSnapshot(plain(saved)); return {}; } });
    h.controller.acceptSnapshot(plain(initial)); h.input('address-current', 'house_no').value = '50'; h.input('address-text-registered', 'hometown_address').value = 'draft text';
    assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasChanges(), true); assert.equal(h.toasts.length, 0);
    if (status === 409) { assert.equal(h.controller.hasConflict, true); h.document.getElementById('profileReviewAll').events.click(); await h.confirmations.pop().onConfirm(); }
    assert.equal(h.input('address-current', 'house_no').value, '50'); assert.equal(h.input('address-text-registered', 'hometown_address').value, 'draft text');
    assert.equal(h.input('address-text-current', 'current_address').value, initial.profile.current_address);
  }
  let calls = 0; const invalid = workspace(async () => { calls++; }); invalid.controller.acceptSnapshot(plain(initial));
  invalid.input('address-current', 'postal_code').value = 'x'.repeat(17);
  assert.equal(await invalid.controller.saveAll(), false); assert.equal(calls, 0); assert.equal(invalid.controller.hasChanges(), true);
  assert.equal(invalid.errors.at(-1).input, invalid.input('address-current', 'postal_code'));
});

const generatedAddress = row => [[row.house_no, ''], [row.road, 'ถนน'], [row.subdistrict, 'ตำบล/แขวง'], [row.district, 'อำเภอ/เขต'], [row.province, 'จังหวัด'], [row.postal_code, '']]
  .filter(([value]) => value != null && String(value).trim()).map(([value, prefix]) => prefix + String(value).trim().replace(/\s+/gu, ' ')).join(' ');
const editCurrent = (h, values, type = 'input') => {
  for (const [key, value] of Object.entries(values)) { const input = h.input('address-current', key); input.value = value; input.dispatchEvent({ type, bubbles: true }); }
};

test('current preview generates immediately, skips empty parts, handles change/clear/revert and never copies registered address', () => {
  const h = workspace(async () => { throw Error('no save'); });
  h.controller.acceptSnapshot(snapshot([], 'r1', { addresses: [savedAddresses()[0]] }));
  const preview = h.document.getElementById('profileCurrentAddressPreview');
  assert.equal(preview.value, ''); assert.equal(h.controller.hasChanges(), false);
  editCurrent(h, { house_no: '  12/3  ', road: '  ทดสอบ   หนึ่ง ', province: 'กรุงเทพมหานคร', postal_code: '10200' });
  assert.equal(preview.value, '12/3 ถนนทดสอบ หนึ่ง จังหวัดกรุงเทพมหานคร 10200');
  assert.equal(h.controller.profileValues().current_address, preview.value);
  editCurrent(h, { road: '', house_no: '99' }, 'change');
  assert.equal(preview.value, '99 จังหวัดกรุงเทพมหานคร 10200');
  assert.equal(h.input('address-registered', 'house_no').value, '10');
  editCurrent(h, { house_no: '', province: '', postal_code: '' });
  assert.equal(preview.value, ''); assert.equal(h.controller.hasChanges(), false);
  assert.equal(h.controller.profileValues().current_address, '');
});

test('generated current text saves atomically with current row and survives fresh reload and clearing', async () => {
  const calls = []; let stored = snapshot([], 'r1', { profile: { hometown_address: 'Keep registered' }, addresses: [savedAddresses()[0]] });
  const h = workspace(async (payload, revision) => {
    assert.equal(revision, stored.profile_revision); calls.push(plain(payload));
    Object.assign(stored.profile, rules.normalizeProfile(payload.profile || {}));
    const operations = [];
    for (const row of payload.addresses?.create || []) { stored.addresses.push({ id: 'created-current', ...rules.normalizeChild('addresses', row) }); operations.push({ kind: 'addresses', action: 'create', id: 'created-current' }); }
    for (const row of payload.addresses?.update || []) { Object.assign(stored.addresses.find(item => item.id === row.id), rules.normalizeChild('addresses', row.changes)); operations.push({ kind: 'addresses', action: 'update', id: row.id }); }
    stored.profile_revision = 'r' + (calls.length + 1); return { ...plain(stored), aggregate_operations: operations };
  }); h.controller.acceptSnapshot(plain(stored));
  editCurrent(h, { house_no: '55', subdistrict: 'ทดสอบ', district: 'เมือง', province: 'ระยอง', postal_code: '21000' });
  const expected = h.document.getElementById('profileCurrentAddressPreview').value;
  assert.equal(await h.controller.saveAll(), true); assert.equal(stored.profile.current_address, expected);
  assert.equal(calls[0].profile.current_address, expected); assert.equal(stored.profile.hometown_address, 'Keep registered');
  assert.equal(stored.addresses[0].house_no, '10'); assert.equal(h.controller.hasChanges(), false);
  const reloaded = workspace(async () => {}); reloaded.controller.acceptSnapshot(plain(stored));
  assert.equal(reloaded.document.getElementById('profileCurrentAddressPreview').value, expected); assert.equal(reloaded.controller.hasChanges(), false);
  editCurrent(h, Object.fromEntries(workspaceFields.addresses.map(field => [field.key, ''])));
  assert.equal(h.document.getElementById('profileCurrentAddressPreview').value, '');
  h.controller.profileValues(); editCurrent(h, { house_no: '66' });
  assert.equal(h.controller.profileValues().current_address, '66');
  editCurrent(h, { house_no: '' }); h.controller.profileValues();
  assert.equal(h.input('address-text-current', 'current_address').closest().hidden, true);
  assert.equal(await h.controller.saveAll(), true); assert.equal(stored.profile.current_address, null);
  assert.equal(calls[1].profile.current_address, null); assert.equal(h.controller.hasChanges(), false);
});

test('unparsed legacy current text survives incomplete edits, clearing, unrelated saves and fresh snapshots', async () => {
  for (const addresses of [[], savedAddresses()]) {
    let payload; const profile = { current_address: 'บ้านเก่า หมู่ 9 ซอยพิเศษ ข้อมูลที่แยกกลับไม่ได้', current_phone: '0811111111' };
    const h = workspace(async body => { payload = plain(body); throw Error('keep draft'); });
    h.controller.acceptSnapshot(snapshot([], 'r1', { profile, addresses }));
    const original = h.input('address-text-current', 'current_address');
    assert.equal(original.value, profile.current_address); assert.equal(original.closest().hidden, false);
    editCurrent(h, { house_no: '1' });
    assert.equal(h.document.getElementById('profileCurrentAddressPreview').value, generatedAddress({ ...(addresses[1] || {}), house_no: '1' }));
    assert.equal(h.controller.profileValues().current_address, profile.current_address);
    assert.equal(await h.controller.saveAll(), false); assert.equal(payload.profile, undefined);
    editCurrent(h, Object.fromEntries(workspaceFields.addresses.map(field => [field.key, ''])));
    assert.equal(original.value, profile.current_address); assert.equal(h.controller.profileValues().current_address, profile.current_address);
    h.input('legacyAddresses', 'current_phone').value = '0822222222';
    await h.controller.saveAll(); assert.equal(payload.profile.current_phone, '0822222222'); assert.equal(Object.hasOwn(payload.profile, 'current_address'), false);
  }
});

test('generated address keeps edits during Save and rebases after actual controller 409 review', async () => {
  let stored = snapshot([], 'r1', { addresses: savedAddresses(), profile: { current_address: generatedAddress(savedAddresses()[1]) } });
  let finish, firstPayload;
  const h = workspace(payload => { firstPayload = plain(payload); return new Promise(resolve => { finish = resolve; }); });
  h.controller.acceptSnapshot(plain(stored)); editCurrent(h, { house_no: '30' }); const saving = h.controller.saveAll();
  editCurrent(h, { house_no: '40' }); const lateText = h.document.getElementById('profileCurrentAddressPreview').value;
  stored.addresses[1].house_no = '30'; stored.profile.current_address = firstPayload.profile.current_address; stored.profile_revision = 'r2';
  finish({ ...plain(stored), aggregate_operations: [{ kind: 'addresses', action: 'update', id: 'address-current' }] });
  assert.equal(await saving, true); assert.equal(h.controller.hasChanges(), true);
  assert.equal(h.controller.profileValues().current_address, lateText); assert.equal(h.document.getElementById('profileCurrentAddressPreview').value, lateText);
  let conflict, requests = 0;
  conflict = workspace(async payload => {
    requests++;
    if (requests === 1) throw Object.assign(Error('conflict'), { status: 409, data: { ...plain(stored), profile_revision: 'remote' } });
    assert.equal(payload.profile.current_address, generatedAddress({ ...stored.addresses[1], house_no: '50' }));
    return { ...plain(stored), profile_revision: 'r3', profile: { current_address: payload.profile.current_address }, addresses: [stored.addresses[0], { ...stored.addresses[1], house_no: '50' }], aggregate_operations: [{ kind: 'addresses', action: 'update', id: 'address-current' }] };
  }, { reload: async () => { const latest = { ...plain(stored), profile_revision: 'remote' }; conflict.controller.acceptSnapshot(latest); return latest; } });
  conflict.controller.acceptSnapshot(plain(stored)); editCurrent(conflict, { house_no: '50' });
  assert.equal(await conflict.controller.saveAll(), false); assert.equal(conflict.controller.hasConflict, true);
  conflict.document.getElementById('profileReviewAll').events.click(); await conflict.confirmations.pop().onConfirm();
  assert.equal(conflict.controller.hasConflict, false); assert.equal(await conflict.controller.saveAll(), true); assert.equal(conflict.controller.hasChanges(), false);
});

test('409 review never reapplies an auto-generated text draft over newly discovered legacy text', async () => {
  const initial = snapshot([], 'r1', { addresses: savedAddresses(), profile: { current_address: generatedAddress(savedAddresses()[1]) } });
  const remote = plain(initial); remote.profile_revision = 'remote'; remote.profile.current_address = 'ข้อความที่อยู่เก่าจากอีกหน้าต่าง หมู่ 7 ซอยเดิม';
  remote.addresses[1].province = 'Remote province';
  let h, requests = 0;
  h = workspace(async (payload, revision) => {
    requests++;
    if (requests === 1) throw Object.assign(Error('conflict'), { status: 409, data: remote });
    assert.equal(revision, 'remote'); assert.equal(payload.profile, undefined);
    return { ...plain(remote), profile_revision: 'r3', addresses: [remote.addresses[0], { ...remote.addresses[1], house_no: '77' }], aggregate_operations: [{ kind: 'addresses', action: 'update', id: 'address-current' }] };
  }, { reload: async () => { h.controller.acceptSnapshot(plain(remote)); return remote; } });
  h.controller.acceptSnapshot(initial); editCurrent(h, { house_no: '77' });
  assert.equal(await h.controller.saveAll(), false);
  h.document.getElementById('profileReviewAll').events.click(); await h.confirmations.pop().onConfirm();
  assert.equal(h.controller.profileValues().current_address, remote.profile.current_address);
  assert.equal(h.document.getElementById('profileCurrentAddressPreview').value, generatedAddress({ ...remote.addresses[1], house_no: '77' }));
  assert.equal(await h.controller.saveAll(), true); assert.equal(h.controller.hasChanges(), false);
});

test('friend name uses nickname only, accepts one word and preserves omitted legacy full_name through Save/reload', async () => {
  assert.deepEqual(workspaceFields.close_friends.map(field => field.key), ['nickname', 'phone', 'line_id', 'facebook_url']);
  const spec = workspaceFields.close_friends.find(field => field.key === 'nickname');
  for (const name of ['ฟ้า', 'สมชาย', 'Alice', 'ก']) {
    assert.equal(canonicalWorkspaceValue(spec, name, true), name);
    assert.equal(rules.normalizeChild('close_friends', { nickname: name }, true).nickname, name);
  }
  for (const create of [false, true]) {
    const legacy = 'ชื่อเดิม นามสกุลเดิม';
    let stored = snapshot([{ id: 'legacy', full_name: legacy }], 'r1', { profile: { english_first_name: 'Student', english_last_name: 'Original' } });
    const calls = []; let failOnce = true;
    const h = workspace(async (payload, revision) => {
      calls.push({ payload: plain(payload), revision });
      if (failOnce) { failOnce = false; throw Error('temporary failure'); }
      const action = create ? 'create' : 'update', id = create ? 'new-friend' : 'legacy';
      const item = payload.close_friends[action][0], changes = rules.normalizeChild('close_friends', create ? item : item.changes);
      assert.equal(Object.hasOwn(changes, 'full_name'), false);
      if (create) stored.close_friends.push({ id, ...changes }); else Object.assign(stored.close_friends[0], changes);
      stored.profile_revision = 'r2'; return { ...plain(stored), aggregate_operations: [{ kind: 'close_friends', action, id }] };
    }); h.controller.acceptSnapshot(plain(stored));
    assert.equal(h.input(h.cards()[0].dataset.profileEntry, 'full_name'), undefined);
    assert.equal(h.input(h.cards()[0].dataset.profileEntry, 'nickname').value, '');
    assert.equal(h.cards()[0].children[0].children[1].children[0].textContent, 'เพื่อนสนิท');
    assert.equal(h.controller.snapshot.close_friends[0].full_name, legacy);
    assert.equal(h.controller.hasChanges(), false);
    const card = create ? h.add() : h.cards()[0], input = h.input(card.dataset.profileEntry, 'nickname'), id = input.id;
    assert.equal(input.closest().children[0].textContent, 'ชื่อ'); assert.equal(input.placeholder, 'กรอกชื่อ');
    assert.equal(input.name, 'nickname'); assert.equal(input.required, false); assert.equal(input.maxLength, 100);
    assert.equal(card.querySelectorAll('input').filter(node => /(?:full_name|last_name|surname)/.test(node.name)).length, 0);
    assert.equal(card.querySelectorAll('input').filter(node => node.name === 'nickname').length, 1);
    h.edit(card, { nickname: 'ฟ้า' }); assert.equal(h.controller.hasChanges(), true);
    assert.equal(await h.controller.saveAll(), false); assert.equal(input.value, 'ฟ้า'); assert.equal(h.controller.hasChanges(), true);
    assert.equal(await h.controller.saveAll(), true); assert.equal(input.id, id); assert.equal(input.value, 'ฟ้า'); assert.equal(h.controller.hasChanges(), false);
    assert.equal(calls[1].revision, 'r1'); assert.equal(calls[1].payload.profile, undefined); assert.equal(calls[1].payload.student, undefined);
    assert.equal(stored.close_friends[create ? 1 : 0].nickname, 'ฟ้า');
    assert.equal(stored.close_friends[0].full_name, legacy);
    if (create) assert.equal(Object.hasOwn(stored.close_friends[1], 'full_name'), false);
    const reloaded = workspace(async () => {}); reloaded.controller.acceptSnapshot(plain(stored));
    assert.equal(reloaded.input(reloaded.cards()[create ? 1 : 0].dataset.profileEntry, 'nickname').value, 'ฟ้า');
    assert.equal(reloaded.input(reloaded.cards()[create ? 1 : 0].dataset.profileEntry, 'full_name'), undefined);
    assert.equal(reloaded.controller.snapshot.close_friends[0].full_name, legacy);
    assert.equal(reloaded.controller.hasChanges(), false);
    assert.deepEqual(stored.profile, { english_first_name: 'Student', english_last_name: 'Original' });
  }
});

test('friend fields validate identically on frontend/backend; only strict HTTPS Facebook hosts become links', () => {
  for (const spec of workspaceFields.close_friends) for (const value of [friend[spec.key], null, '', '  ']) {
    assert.equal(canonicalWorkspaceValue(spec, value, true), rules.normalizeChild('close_friends', { [spec.key]: value })[spec.key]);
  }
  const invalid = ['http://facebook.com/me', 'javascript:run()', 'data:text/html,x', 'https://facebook.com.evil.example/me', 'https://user@facebook.com/me', 'https://fb.com/me', 'name', 'https://facebook.com\\evil.example/me'];
  for (const value of invalid) {
    assert.equal(safeFriendFacebookUrl(value), null);
    assert.throws(() => canonicalWorkspaceValue(workspaceFields.close_friends.at(-1), value, true));
    assert.throws(() => rules.normalizeChild('close_friends', { facebook_url: value }));
  }
  for (const host of ['facebook.com', 'www.facebook.com', 'm.facebook.com']) assert.ok(safeFriendFacebookUrl('https://' + host + '/fixture'));
});

test('unified save submits multiple friends and profile changes once; reload preserves stable rows', async () => {
  const calls = []; let h;
  h = workspace(async (body, revision) => {
    calls.push({ body: plain(body), revision });
    return snapshot(body.close_friends.create.map((row,index) => ({ id: 'id' + index, ...row })), 'r2', { profile: body.profile, aggregate_operations: body.close_friends.create.map((row,index) => ({ kind: 'close_friends', action: 'create', id: 'id' + index })) });
  });
  h.controller.acceptSnapshot(snapshot());
  const first = h.add(), second = h.add(); h.edit(first, friend); h.edit(second, { nickname: 'ต้น' });
  h.input('contacts', 'student_line_id').value = 'student.fixture';
  assert.equal(h.controller.hasChanges(), true);
  await h.controller.saveAll();
  assert.equal(calls.length, 1); assert.equal(calls[0].revision, 'r1');
  assert.equal(calls[0].body.close_friends.create.length, 2); assert.equal(calls[0].body.profile.student_line_id, 'student.fixture');
  assert.equal(h.cards().length, 2); assert.equal(h.controller.hasChanges(), false); assert.equal(h.toasts.length, 1);
  const link = first.children[0].children[1].children[0];
  assert.equal(link.textContent, friend.nickname); assert.equal(link.target, '_blank'); assert.equal(link.rel, 'noopener noreferrer');
  assert.equal(second.children[0].children[1].children[0].tagName, 'SPAN');
  h.controller.acceptSnapshot(h.controller.snapshot);
  assert.equal(h.cards()[0], first); assert.equal(h.cards()[1], second);
});

test('friend edit and staged delete/undo preserve other drafts until one successful save', async () => {
  const calls = []; const h = workspace(async body => { calls.push(plain(body)); return snapshot([{ id: 'one', ...friend, line_id: 'changed' }], 'r2', { aggregate_operations: [{ kind: 'close_friends', action: 'update', id: 'one' }, { kind: 'close_friends', action: 'delete', id: 'two' }] }); });
  h.controller.acceptSnapshot(snapshot([{ id: 'one', ...friend }, { id: 'two', full_name: 'ชื่อจริง' }]));
  const [first,second] = h.cards(); h.edit(first, { line_id: 'changed' });
  h.remove(second); assert.equal(calls.length, 0); await h.confirmations.pop().onConfirm();
  assert.equal(h.controller.hasChanges(), true); assert.equal(h.input(first.dataset.profileEntry, 'line_id').value, 'changed');
  h.remove(second); assert.equal(h.confirmations.length, 0); assert.equal(h.input(second.dataset.profileEntry,'nickname').disabled, false);
  h.remove(second); await h.confirmations.pop().onConfirm();
  await h.controller.saveAll();
  assert.deepEqual(calls[0].close_friends.delete, ['two']); assert.equal(h.cards().length, 1); assert.equal(h.controller.hasChanges(), false);
});

test('invalid URL remains text, validation reveals/focuses the field and does not call save', async () => {
  let calls = 0; const h = workspace(async () => { calls++; }); h.controller.acceptSnapshot(snapshot());
  const card = h.add(); h.edit(card, { nickname: 'เพื่อน', facebook_url: 'https://facebook.com.evil.example/me' });
  assert.equal(card.children[0].children[1].children[0].tagName, 'SPAN');
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls, 0);
  assert.equal(h.errors[0].input, h.input(card.dataset.profileEntry,'facebook_url')); assert.equal(h.revealed[0], card); assert.equal(h.controller.hasChanges(), true);
});

test('network error, stale conflict and pending schema keep draft without success toast', async () => {
  for (const status of [undefined, 409, 503]) {
    const h = workspace(async () => { throw Object.assign(Error('fixture'), { status, ...(status === 409 ? { data: snapshot([], 'remote') } : {}) }); });
    h.controller.acceptSnapshot(snapshot()); h.edit(h.add(), friend);
    assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasChanges(), true); assert.equal(h.toasts.length, 0);
    assert.equal(h.cards().length, 1); assert.equal(h.input(h.cards()[0].dataset.profileEntry, 'nickname').value, friend.nickname);
  }
  const h = workspace(async () => { throw Error('must not save'); }); h.controller.acceptSnapshot(snapshot([], 'r1', { close_friends_available: false }));
  assert.equal(h.document.getElementById('profileFriendContact').children[0].children[0].children[1].disabled, true);
});

test('typing during save stays dirty; cancelling a new friend does not lose other inputs', async () => {
  let resolve; const h = workspace(() => new Promise(done => { resolve = done; })); h.controller.acceptSnapshot(snapshot());
  const card = h.add(); h.edit(card, friend); const save = h.controller.saveAll();
  h.edit(card, { line_id: 'typed-later' });
  resolve(snapshot([{ id: 'new-id', ...friend }], 'r2', { aggregate_operations: [{ kind: 'close_friends', action: 'create', id: 'new-id' }] })); await save;
  assert.equal(h.input(card.dataset.profileEntry,'line_id').value, 'typed-later'); assert.equal(h.controller.hasChanges(), true);
  const other = h.add(); h.edit(other, { nickname: 'อื่น' }); h.remove(other); await h.confirmations.pop().onConfirm();
  assert.equal(h.cards().length, 1); assert.equal(h.input(card.dataset.profileEntry,'line_id').value, 'typed-later');
});

test('retry/review preserve drafts after removing the global reload/discard UI', async () => {
  let h; h = workspace(async () => {}, { reload: async () => { h.controller.acceptSnapshot(snapshot([], 'r2')); return {}; } });
  h.controller.acceptSnapshot(snapshot()); h.input('contacts','student_line_id').value = 'pending';
  const card = h.add(); h.edit(card, friend);
  await h.document.getElementById('profileRetryLoad').events.click();
  assert.equal(h.cards()[0], card); assert.equal(h.input('contacts','student_line_id').value, 'pending');
  h.document.getElementById('profileReviewAll').events.click(); await h.confirmations.pop().onConfirm();
  assert.equal(h.input(card.dataset.profileEntry, 'nickname').value, friend.nickname);
  assert.equal(h.document.getElementById('profileDiscardAll'), undefined);
  assert.equal(h.document.getElementById('profileWorkspaceReload'), undefined);
  assert.equal(h.controller.hasChanges(), true);
});

test('advisor summary keeps class/project identities separate across pending/confirmed/rejected/empty/error', () => {
  const document = dom(); for (const id of ['profileClassAdvisor', 'profileProjectAdvisor']) { const node = document.createElement('strong'); node.id = id; }
  const student = { advisorTeacher: { first_name: 'Class', last_name: 'Advisor' } };
  for (const status of ['none', 'pending', 'confirmed', 'rejected']) {
    renderProfileAdvisors(document, student, { loaded: true, request: { status, teacher: status === 'none' ? null : { name: 'Project Advisor' } } });
    assert.equal(document.getElementById('profileClassAdvisor').textContent, 'Class Advisor');
    assert.equal(document.getElementById('profileProjectAdvisor').textContent.includes('Class Advisor'), false);
    if (status !== 'none') assert.equal(document.getElementById('profileProjectAdvisor').textContent.includes('Project Advisor'), true);
  }
  renderProfileAdvisors(document, {}, { loaded: true, request: { status: 'none' } });
  assert.match(document.getElementById('profileClassAdvisor').textContent, /ยังไม่ได้เลือก/);
  renderProfileAdvisors(document, student); assert.match(document.getElementById('profileProjectAdvisor').textContent, /ยังไม่มีข้อมูล.*เมนูจัดการโครงการ/);
});

test('PDF import retains legacy mapping and excludes every new contact field', () => {
  for (const spec of fields) assert.equal(Object.hasOwn(pdfFieldSpecs.profile, spec.key), false);
  const changes = buildProfilePdfChanges({ profile_revision: 'r1', profile: { current_phone: '0811111111' }, addresses: [], education: [], training: [], skills: [] },
    [{ scope: 'profile', key: 'current_phone', mode: 'pdf', value: '0821111111' }], []);
  assert.deepEqual(changes, { profile: { current_phone: '0821111111' } });
});


test('actual legacy academic adapter joins unified save, validates names and preserves edits typed during save', () => {
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const patch = source.slice(source.indexOf('function prepareStudentInfoPatch()'), source.indexOf('async function saveStudentInfo(event)'));
  const prepare = source.slice(source.indexOf('function prepareUnifiedLegacyDraft()'), source.indexOf('function applyProfileWorkspaceCommit('));
  const controls = Object.fromEntries(['FirstName','LastName','Major','YearLevel','Gpa','Advisor'].map(name => ['student' + name + 'Input', { value: '', validity: {} }]));
  const names = { first_name: 'studentFirstNameInput', last_name: 'studentLastNameInput', major: 'studentMajorInput', year_level: 'studentYearLevelInput', gpa: 'studentGpaInput', advisor_teacher_id: 'studentAdvisorInput' };
  const student = { first_name: 'ชื่อ', last_name: 'นามสกุล', major: 'IT', year_level: 3, gpa: '3.00', advisor_teacher_id: null };
  const populate = row => { for (const [key,id] of Object.entries(names)) controls[id].value = String(row[key] ?? ''); };
  populate(student);
  const context = { document: { getElementById: () => null }, ...controls, currentStudent: student, currentStudentProfile: {}, studentInfoRevision: 'r1', studentProfileDraft: null,
    studentInfoMessage: {}, studentInfoForm: { querySelector: () => null }, isTeacherDirectoryLoaded: true, hasAdvisorSelectionChanged: false,
    clearMessage() {}, clearProfileErrors() {}, showMessage() {}, profileFieldError() {}, revealProfileSection() {},
    isThaiPersonName: require('../../backend/src/validators/personName.validator').isThaiPersonName,
    MAX_PERSON_NAME_LENGTH: 255, populateStudentInfoForm: populate };
  vm.runInNewContext(patch + prepare + '\nglobalThis.prepare = prepareUnifiedLegacyDraft;', context);
  controls.studentFirstNameInput.value = 'แก้ไข'; controls.studentGpaInput.value = '3.25';
  const prepared = context.prepare(); assert.deepEqual(plain(prepared.student), { first_name: 'แก้ไข', gpa: 3.25 }); assert.deepEqual(plain(prepared.revisions), ['r1']);
  controls.studentFirstNameInput.value = 'พิมพ์ต่อ';
  prepared.accept({ student: { ...student, first_name: 'แก้ไข', gpa: '3.25' }, profile: {}, profile_revision: 'r2' });
  assert.equal(controls.studentFirstNameInput.value, 'พิมพ์ต่อ'); assert.equal(controls.studentGpaInput.value, '3.25'); assert.equal(context.studentInfoRevision, 'r2');
  controls.studentFirstNameInput.value = 'invalid123'; assert.throws(() => context.prepare());
});

test('actual four-tab controller keeps input identity, friend and both skill drafts across navigation', () => {
  const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot()); const card = h.add(); h.edit(card, friend);
  const skillInputs = ['profileComputerSkills', 'profileLanguageSkills'].map(id => {
    const section = h.document.getElementById(id).children[0]; section.children[0].children[1].events.click();
    const skill = section.children[2].children.at(-1); h.edit(skill, { skill_name: id, proficiency: 'good' });
    return h.input(skill.dataset.profileEntry, 'skill_name');
  });
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const tabsSource = source.slice(source.indexOf('const profileTabControllers = new WeakMap();'), source.indexOf('const studentProfileTabs ='));
  const tabs = ['Personal','Contact','Education','Documents'].map(name => {
    const tab = h.document.createElement('button'); tab.id = 'profile' + name + 'Tab'; tab.classList.toggle = () => {};
    const panel = h.document.createElement('div'); panel.id = 'profile' + name + 'Panel'; tab.setAttribute('aria-controls',panel.id); return tab;
  });
  const shortcuts = ['profilePersonalExtras', 'profileFriendContact', 'profileEducationRecords'].map((id, index) => {
    const shortcut = h.document.createElement('button'); shortcut.dataset.profileSection = id;
    h.document.getElementById(id).closest = () => h.document.getElementById(tabs[index].getAttribute('aria-controls'));
    return shortcut;
  });
  const sectionNav = h.document.createElement('nav');
  h.document.querySelectorAll = () => shortcuts;
  h.document.querySelector = () => sectionNav;
  const tablist = { id: 'studentProfileTabs', querySelectorAll: () => tabs };
  const context = { document: h.document }; vm.runInNewContext(tabsSource + '\nglobalThis.init = initProfileTabs;', context);
  const navigation = context.init(tablist,tabs[0].id);
  const input = h.input(card.dataset.profileEntry,'nickname');
  for (const [index, tab] of tabs.entries()) {
    navigation.select(tab.id);
    assert.equal(h.input(card.dataset.profileEntry,'nickname'), input); assert.equal(input.value, friend.nickname); assert.equal(h.controller.hasChanges(), true);
    for (const skill of skillInputs) { assert.equal(h.document.getElementById(skill.id), skill); assert.ok(skill.value.startsWith('profile')); }
    assert.deepEqual(shortcuts.map(shortcut => shortcut.hidden), shortcuts.map((_, i) => i !== index));
    assert.equal(sectionNav.hidden, index === 3);
  }
  assert.equal(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true').length, 1);
  assert.equal(h.document.getElementById('profileDocumentsPanel').hidden,false);
  tabs[3].events.keydown({ key: 'Home', preventDefault() {} });
  assert.equal(navigation.activeId, tabs[0].id); assert.equal(h.document.activeElement, tabs[0]);
  tabs[0].events.keydown({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(navigation.activeId, tabs[1].id); assert.equal(input.value, friend.nickname);
});

test('compact header distinguishes load retry, save failure, validation and revision conflict', async () => {
  let rejectSave;
  const h = workspace(() => new Promise((_, reject) => { rejectSave = reject; })); h.controller.acceptSnapshot(snapshot());
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const refresh = source.slice(source.indexOf('function refreshProfileSaveState()'), source.indexOf('document.addEventListener("student-profile-state"'));
  const panel = h.document.getElementById('panel-profile'); panel.dataset.loadState = 'ready';
  const context = { document: h.document, profilePanel: panel, isStudentInfoSaving: false, isStudentProfileSaving: false,
    isProfileImageUploading: false, profileWorkspace: h.controller, profilePdfImport: null, saveProfileBtn: {},
    hasLoadedStudentProfile: true, hasUnsavedStudentProfile: () => h.controller.hasChanges(), profileOutcome: 'ready' };
  vm.runInNewContext(refresh + '\nglobalThis.refresh = refreshProfileSaveState;', context);
  const retry = h.document.getElementById('profileRetryLoad'), review = h.document.getElementById('profileReviewAll'), state = h.document.getElementById('profileSaveState');
  context.refresh(); assert.equal(retry.hidden, true); assert.equal(review.hidden, true); assert.equal(state.dataset.state, 'ready');
  panel.dataset.loadState = 'error'; context.refresh(); assert.equal(retry.hidden, false); assert.equal(state.dataset.state, 'load-error');
  panel.dataset.loadState = 'ready';
  const card = h.add(); h.edit(card, { facebook_url: 'unsafe' }); await h.controller.saveAll();
  context.profileOutcome = 'error'; context.refresh(); assert.equal(state.dataset.state, 'attention'); assert.equal(review.hidden, true); assert.equal(retry.hidden, true);
  h.edit(card, friend); const pending = h.controller.saveAll(); context.refresh(); assert.equal(state.dataset.state, 'saving');
  assert.equal(h.document.getElementById('profileSaveActionState').textContent, state.textContent);
  rejectSave(Object.assign(Error('conflict fixture'), { status: 409, data: snapshot([], 'remote') })); await pending;
  context.refresh(); assert.equal(state.dataset.state, 'error'); assert.equal(review.hidden, false); assert.equal(retry.hidden, true); assert.equal(h.toasts.length, 0);
  assert.equal(h.document.getElementById('profileSaveActionState').dataset.state, 'error');
  assert.equal(h.document.getElementById('profileSaveActionState').textContent, state.textContent);
  context.refresh(); assert.equal(review.hidden, false); assert.equal(h.controller.hasChanges(), true);
  assert.equal(h.document.getElementById('profileDiscardAll'), undefined);
});

test('summary binds current API major/year/status and keeps unknown education empty', () => {
  const document = dom();
  const ids = ['profileFullName', 'profileStudentId', 'profileEmail', 'profileFirstName', 'profileLastName', 'profileStudentIdDetail', 'profileEmailDetail', 'profileMajor', 'profileYear', 'profileGpa', 'profileTrack', 'studentStatus', 'profileSummaryMajor', 'profileSummaryStatus'];
  for (const id of ids) { const node = document.createElement('strong'); node.id = id; }
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('function renderStudent(student)'), source.indexOf('function renderStudentAccountInfo(student)'));
  const context = { document, ...Object.fromEntries(ids.map(id => [id, document.getElementById(id)])),
    currentStudentProfile: {}, isAdvisorLoaded: false, projectAdvisorRequest: null, confirmedProjectAdvisor: null,
    userNameDisplay: null, overviewGreeting: null, renderProfileAdvisors() {}, renderJobMatchingSource() {}, renderStudentAccountInfo() {},
    getStudentCode: row => row.student_id, translateStatus: value => 'mapped-' + value,
    setText: (node, value) => { if (node) node.textContent = String(value); } };
  vm.runInNewContext(render + '\nglobalThis.render = renderStudent;', context);
  context.render({ first_name: 'ชื่อทดสอบ', last_name: 'นามสกุล', student_id: 'fixture', major: 'INE', year_level: 3, status: 'pending', track: 'co_op' });
  assert.equal(document.getElementById('profileSummaryMajor').textContent, 'INE · ชั้นปี 3');
  assert.equal(document.getElementById('profileSummaryStatus').textContent, 'mapped-pending');
  context.render({ student_id: 'fixture', major: null, year_level: null, status: 'rejected', track: 'co_op' });
  assert.equal(document.getElementById('profileSummaryMajor').textContent, 'ยังไม่ระบุ');
  assert.equal(document.getElementById('profileSummaryStatus').textContent, 'mapped-rejected');
});

test('visible photo action and avatar reuse the same existing modal image editor once per activation', () => {
  const listeners = () => ({ events: {}, addEventListener(type, callback) { (this.events[type] ||= []).push(callback); } });
  const avatar = listeners(), button = listeners(); let opens = 0, scrolls = 0, prevented = 0;
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const editor = source.slice(source.indexOf('function openProfileImageEditor()'), source.indexOf('function fillProfileEditForm('));
  const bindings = source.slice(source.indexOf('profileAvatarButton?.addEventListener("click"'), source.indexOf('closeProfileEditModal?.addEventListener('));
  const selected = [];
  vm.runInNewContext(editor + bindings, { profileAvatarButton: avatar, document: { getElementById: id => id === 'profileChangePhoto' ? button : null },
    openProfileEditModal: () => { opens++; }, studentProfileEditTabs: { select: id => selected.push(id) },
    profileImageEditorSection: { scrollIntoView() { scrolls++; } }, window: { setTimeout: callback => callback() } });
  assert.equal(button.events.click.length, 1); assert.equal(avatar.events.click.length, 1);
  button.events.click[0](); avatar.events.click[0](); avatar.events.keydown[0]({ key: 'Enter', preventDefault() { prevented++; } });
  assert.equal(opens, 3); assert.equal(scrolls, 3); assert.equal(prevented, 1);
  assert.deepEqual(selected, Array(3).fill('profileEditPersonalTab'));
});


test('bad numeric input stays dirty and focuses validation even when browser exposes an empty value', async () => {
  let calls = 0; const h = workspace(async () => { calls++; }); h.controller.acceptSnapshot(snapshot());
  const input = h.input('basics','height_cm'); input.value = ''; input.validity.badInput = true;
  assert.equal(h.controller.hasChanges(), true); assert.equal(await h.controller.saveAll(), false);
  assert.equal(calls, 0); assert.equal(h.errors[0].input, input);
});

test('every profile field has one mounted inline editor, ordered by purpose, with emergency before friends', async () => {
  const calls = [];
  const h = workspace(async (body, revision) => { calls.push({ body: plain(body), revision }); return snapshot([], 'r2', { profile: body.profile }); });
  h.controller.acceptSnapshot(snapshot());
  const containers = ['profilePersonalExtras', 'profileContactExtras', 'profileStructuredAddresses', 'profileFamilyExtras', 'profileEmergencyExtras', 'profileAcademicExtras', 'profileAbilities', 'profileHealthExtras'];
  const forms = containers.flatMap(id => h.document.getElementById(id).children.filter(node => node.dataset.profileEntry));
  const allInputs = [...forms.flatMap(form => ['input', 'select', 'textarea'].flatMap(tag => form.querySelectorAll(tag))), ...['profileThaiPrefixSlot', 'profileThaiGenderSlot'].map(id => h.document.getElementById(id).children[0].children[1])];
  const fields = ['basics', 'personal', 'contacts', 'legacyAddresses', 'household', 'family', 'emergency'].flatMap(kind => workspaceFields[kind]);
  for (const field of fields) {
    const matching = allInputs.filter(input => input.name === field.key);
    assert.equal(matching.length, 1, field.key + ' must have one mounted editor');
    assert.equal(matching[0].disabled, false, field.key + ' needs no Edit action after load');
    assert.equal(matching[0].required, !!field.required);
  }
  assert.deepEqual(h.document.getElementById('profilePersonalExtras').children.map(form => form.dataset.profileEntry), ['basics', 'identity']);
  assert.deepEqual(h.document.getElementById('profileFamilyExtras').children.map(form => form.dataset.profileEntry), ['household', 'family']);
  assert.deepEqual(h.document.getElementById('profileEmergencyExtras').children.map(form => form.dataset.profileEntry), ['emergency', 'emergencyExtra']);
  assert.deepEqual(h.document.getElementById('profileHealthExtras').children.map(form => form.dataset.profileEntry), ['health', 'personal']);
  for (const [entry, key, value] of [['identity','english_first_name','Fixture'], ['health','medical_conditions','ข้อมูลทดสอบ'], ['abilities','related_skills','ทักษะทดสอบ'], ['emergencyExtra','emergency_contact_workplace','สถานที่ทดสอบ']]) h.input(entry,key).value = value;
  await h.controller.saveAll();
  assert.equal(calls.length, 1); assert.equal(calls[0].revision, 'r1');
  assert.deepEqual(calls[0].body, { profile: { english_first_name: 'Fixture', emergency_contact_workplace: 'สถานที่ทดสอบ', related_skills: 'ทักษะทดสอบ', medical_conditions: 'ข้อมูลทดสอบ' } });
  assert.equal(h.controller.hasChanges(), false);
});

test('opening the image-only modal preserves inline values and the existing draft adapter', () => {
  const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { related_skills: 'saved' } }));
  h.input('abilities','related_skills').value = 'typed before photo';
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const open = source.slice(source.indexOf('function openProfileEditModal()'), source.indexOf('function closeProfileModal()'));
  for (const id of Object.values(PROFILE_INPUTS)) { const input = h.document.createElement('input'); input.id = id; input.type = 'hidden'; }
  const modal = h.document.createElement('div'), tab = h.document.createElement('button'); tab.id = 'profileEditPersonalTab';
  h.document.body = { style: {} };
  const context = { document: h.document, profileWorkspace: h.controller, currentStudentProfile: { related_skills: 'saved' },
    isStudentProfileSaving: false, isProfileImageUploading: false, hasLoadedStudentProfile: true, studentProfileRevision: 'r1',
    StudentProfileDraft, readProfileInputs, writeProfileInputs, fillProfileEditForm: profile => writeProfileInputs(h.document, profile),
    studentProfileTabs: { activeId: 'profilePersonalTab' }, studentProfileEditTabs: { activeId: 'profileEditPersonalTab', select() {} },
    profileEditModal: modal, profileFocus: { open() {} }, profileEditMessage: {}, clearMessage() {} };
  vm.runInNewContext(open + '\nglobalThis.open = openProfileEditModal;', context); context.open();
  assert.equal(h.input('abilities','related_skills').value, 'typed before photo');
  assert.equal(readProfileInputs(h.document).related_skills, 'typed before photo');
  assert.equal(context.studentProfileDraft.hasChanges(readProfileInputs(h.document)), true);
  assert.equal(h.controller.hasChanges(), true);
});

test('empty nickname has a generic card name and missing save receipts cannot silently discard drafts', async () => {
  const h = workspace(async () => snapshot([], 'r2')); h.controller.acceptSnapshot(snapshot());
  const card = h.add(); h.edit(card, { nickname: '   ', facebook_url: friend.facebook_url });
  assert.equal(card.children[0].children[1].children[0].textContent, 'เพื่อนสนิท');
  assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasChanges(), true); assert.equal(h.toasts.length, 0);
});

test('computer/language skills keep DOM fields, enums and separate create/update/clear mappings', async () => {
  const calls = []; let stored = snapshot(); let serial = 0;
  const h = workspace(async (body, revision) => {
    assert.equal(revision, stored.profile_revision); calls.push(plain(body)); const operations = [];
    for (const row of body.skills.create || []) {
      const saved = { id: 'skill-' + (++serial), display_order: 0, ...rules.normalizeChild('skills', row, true) };
      stored.skills.push(saved); operations.push({ kind: 'skills', action: 'create', id: saved.id });
    }
    for (const update of body.skills.update || []) {
      Object.assign(stored.skills.find(row => row.id === update.id), rules.normalizeChild('skills', update.changes));
      operations.push({ kind: 'skills', action: 'update', id: update.id });
    }
    stored.profile_revision = 'r' + (calls.length + 1); return { ...plain(stored), aggregate_operations: operations };
  }); h.controller.acceptSnapshot(plain(stored));
  const cards = [];
  for (const [container, category] of [['profileComputerSkills', 'computer'], ['profileLanguageSkills', 'language']]) {
    const section = h.document.getElementById(container).children[0]; section.children[0].children[1].events.click();
    const card = section.children[2].children.at(-1); cards.push(card); const key = card.dataset.profileEntry;
    assert.equal(h.input(key, 'category').value, category); assert.equal(h.input(key, 'category').tagName, 'SELECT');
    assert.equal(h.input(key, 'skill_name').tagName, 'INPUT'); assert.equal(h.input(key, 'skill_name').required, false);
    assert.equal(h.input(key, 'proficiency').tagName, 'SELECT'); assert.equal(h.input(key, 'proficiency').required, false);
    assert.deepEqual(h.input(key, 'proficiency').children.map(option => option.value), ['', 'very_good', 'good', 'moderate', 'fair']);
    for (const field of workspaceFields.skills) assert.equal(h.input(key, field.key).parentElement.children[0].htmlFor, h.input(key, field.key).id);
    h.edit(card, { skill_name: category + ' fixture', proficiency: 'good' });
  }
  assert.equal(await h.controller.saveAll(), true); assert.equal(h.controller.hasChanges(), false);
  assert.deepEqual(calls[0], { skills: { create: ['computer', 'language'].map(category => ({ category, skill_name: category + ' fixture', proficiency: 'good' })) } });
  const original = plain(stored);
  h.edit(cards[0], { skill_name: 'Edited computer', proficiency: 'very_good' });
  assert.equal(await h.controller.saveAll(), true); assert.deepEqual(calls[1], { skills: { update: [{ id: stored.skills[0].id, changes: { skill_name: 'Edited computer', proficiency: 'very_good' } }] } });
  assert.deepEqual(stored.skills[1], original.skills[1]);
  for (const card of cards) h.edit(card, { skill_name: '', proficiency: '' });
  assert.equal(await h.controller.saveAll(), true);
  assert.deepEqual(calls[2], { skills: { update: stored.skills.map(row => ({ id: row.id, changes: { skill_name: null, proficiency: null } })) } });
  const reloaded = workspace(async () => {}); reloaded.controller.acceptSnapshot(plain(stored));
  for (const row of stored.skills) for (const field of ['skill_name', 'proficiency']) assert.equal(reloaded.input('skills-' + row.id, field).value, '');
});

test('each skill list focuses invalid names and retains drafts after failed or incomplete save acknowledgement', async () => {
  for (const container of ['profileComputerSkills', 'profileLanguageSkills']) {
    let calls = 0;
    const h = workspace(async () => { calls++; throw Object.assign(Error('fixture failure'), { status: 500 }); });
    h.controller.acceptSnapshot(snapshot()); const section = h.document.getElementById(container).children[0];
    section.children[0].children[1].events.click(); const card = section.children[2].children[0];
    const input = h.input(card.dataset.profileEntry, 'skill_name'); h.edit(card, { skill_name: 'x'.repeat(256), proficiency: 'good' });
    assert.equal(await h.controller.saveAll(), false); assert.equal(calls, 0); assert.equal(h.errors.at(-1).input, input);
    assert.equal(h.document.activeElement, input); assert.equal(h.controller.hasChanges(), true);
    h.edit(card, { skill_name: 'Valid fixture' });
    assert.equal(await h.controller.saveAll(), false); assert.equal(calls, 1); assert.equal(input.value, 'Valid fixture');
    assert.equal(h.controller.hasChanges(), true); assert.equal(h.toasts.length, 0);
    const missing = workspace(async () => snapshot([], 'r2')); missing.controller.acceptSnapshot(snapshot());
    const list = missing.document.getElementById(container).children[0]; list.children[0].children[1].events.click();
    missing.edit(list.children[2].children[0], { skill_name: 'Unacknowledged fixture' });
    assert.equal(await missing.controller.saveAll(), false); assert.equal(missing.controller.hasChanges(), true); assert.equal(missing.toasts.length, 0);
  }
});

test('skills PDF mapping keeps category/name identity, existing enum values and explicitly omitted fields', () => {
  const initial = snapshot([], 'r1', { skills: [{ id: 'computer', category: 'computer', skill_name: 'SQL', proficiency: 'good', display_order: 3 },
    { id: 'language', category: 'language', skill_name: 'English', proficiency: 'fair', display_order: 8 }] });
  const changes = buildProfilePdfChanges(initial, [], [
    { kind: 'skills', action: 'update', id: 'computer', present: ['proficiency'], values: { proficiency: 'very_good' } },
    { kind: 'skills', action: 'create', values: { category: 'language', skill_name: 'French', proficiency: 'moderate' } },
    { kind: 'skills', action: 'skip', values: { category: 'computer', skill_name: 'Ignored', proficiency: 'fair' } },
  ]);
  assert.deepEqual(changes, { skills: { update: [{ id: 'computer', changes: { proficiency: 'very_good' } }],
    create: [{ category: 'language', skill_name: 'French', proficiency: 'moderate' }] } });
  assert.equal(initial.skills[0].skill_name, 'SQL'); assert.equal(initial.skills[0].display_order, 3);
  assert.equal(initial.skills[1].proficiency, 'fair'); assert.equal(initial.skills[1].display_order, 8);
});

test('blood group dropdown loads optional, known and legacy values without rewriting them', async () => {
  for (const value of [undefined, null, '', 'A', 'B', 'AB', 'O', 'ไม่ทราบ', 'A+', 'AB-', 'Rh+', 'Rh-', 'Unknown']) {
    const h = workspace(async () => { throw Error('loading must not save'); });
    const input = h.input('health', 'blood_type');
    assert.equal(input.tagName, 'SELECT'); assert.equal(input.disabled, true);
    assert.equal(input.children[0].textContent, 'เลือกกรุ๊ปเลือด');
    h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { blood_type: value } }));
    assert.equal(input.value, value ?? ''); assert.equal(input.name, 'blood_type');
    assert.equal(input.required, false); assert.equal(input.disabled, false);
    assert.deepEqual(input.children.slice(0, 6).map(option => [option.value, option.textContent]),
      [['', 'เลือกกรุ๊ปเลือด'], ...['A', 'B', 'AB', 'O', 'ไม่ทราบ'].map(item => [item, item])]);
    assert.equal(input.parentElement.children[0].htmlFor, input.id);
    assert.equal(h.document.getElementById('profileHealthExtras').contains(input), true);
    assert.equal(h.controller.hasChanges(), false); assert.equal(await h.controller.saveAll(), false);
    h.controller.acceptSnapshot(snapshot([], 'r2', { profile: { blood_type: value } }));
    assert.equal(h.input('health', 'blood_type'), input); assert.equal(input.value, value ?? '');
    assert.equal(h.controller.hasChanges(), false);
  }
  // Existing Backend contract accepts Unknown in Thai, but does not accept Rh writes.
  assert.equal(rules.normalizeProfile({ blood_type: 'ไม่ทราบ' }).blood_type, 'ไม่ทราบ');
  for (const value of ['A+', 'Rh+', 'Rh-', 'Unknown']) assert.throws(() => rules.normalizeProfile({ blood_type: value }));
});

test('blood group A/B/AB/O/unknown/clear use Save All, the same revision and fresh reload', async () => {
  let stored = snapshot([], 'r1', { profile: { blood_type: null, medical_conditions: 'Keep condition', allergies: 'Keep allergy' } });
  const calls = [];
  const h = workspace(async (body, revision) => {
    assert.equal(revision, stored.profile_revision); calls.push(plain(body));
    Object.assign(stored.profile, rules.normalizeProfile(body.profile));
    stored.profile_revision = 'r' + (calls.length + 1); return plain(stored);
  }); h.controller.acceptSnapshot(plain(stored));
  for (const value of ['A', 'B', 'AB', 'O', 'ไม่ทราบ', '']) {
    const input = h.input('health', 'blood_type'); input.value = value;
    input.dispatchEvent({ type: 'change', bubbles: true });
    assert.equal(h.controller.hasChanges(), true); assert.equal(h.controller.profileValues().blood_type, value);
    h.document.getElementById('profileSaveAll').events.click(); await settle();
    assert.deepEqual(calls.at(-1), { profile: { blood_type: value || null } });
    assert.equal(h.controller.hasChanges(), false);
    h.controller.acceptSnapshot(plain(stored)); assert.equal(input.value, value);
    const reloaded = workspace(async () => { throw Error('reload must not save'); });
    reloaded.controller.acceptSnapshot(plain(stored));
    assert.equal(reloaded.input('health', 'blood_type').value, value); assert.equal(reloaded.controller.hasChanges(), false);
    assert.equal(stored.profile.medical_conditions, 'Keep condition'); assert.equal(stored.profile.allergies, 'Keep allergy');
  }
  assert.equal(calls.length, 6);
});

test('legacy blood group survives an unrelated health save and can explicitly change or clear', async () => {
  for (const legacy of ['A+', 'Rh-', 'Unknown']) for (const replacement of ['O', '']) {
    let stored = snapshot([], 'r1', { profile: { blood_type: legacy, allergies: 'Old allergy' } }); const calls = [];
    const h = workspace(async (body, revision) => {
      assert.equal(revision, stored.profile_revision); calls.push(plain(body));
      Object.assign(stored.profile, rules.normalizeProfile(body.profile)); stored.profile_revision = 'r' + (calls.length + 1); return plain(stored);
    }); h.controller.acceptSnapshot(plain(stored));
    h.input('health', 'allergies').value = 'New allergy';
    assert.equal(await h.controller.saveAll(), true); assert.deepEqual(calls[0], { profile: { allergies: 'New allergy' } });
    assert.equal(stored.profile.blood_type, legacy); assert.equal(h.input('health', 'blood_type').value, legacy);
    h.controller.acceptSnapshot(plain(stored)); assert.equal(h.input('health', 'blood_type').value, legacy);
    h.input('health', 'blood_type').value = replacement;
    assert.equal(await h.controller.saveAll(), true); assert.deepEqual(calls[1], { profile: { blood_type: replacement || null } });
    const reloaded = workspace(async () => {}); reloaded.controller.acceptSnapshot(plain(stored));
    assert.equal(reloaded.input('health', 'blood_type').value, replacement); assert.equal(stored.profile.allergies, 'New allergy');
  }
});

test('blood group draft survives failure, late selection and 409 review before retry', async () => {
  const initial = snapshot([], 'r1', { profile: { blood_type: 'A', allergies: 'Keep allergy' } });
  let requests = 0;
  const failed = workspace(async (body, revision) => {
    assert.equal(revision, 'r1'); assert.deepEqual(plain(body), { profile: { blood_type: 'B' } });
    if (++requests === 1) throw Object.assign(Error('fixture network failure'), { status: 500 });
    return snapshot([], 'r2', { profile: { ...initial.profile, blood_type: 'B' } });
  }); failed.controller.acceptSnapshot(plain(initial)); failed.input('health', 'blood_type').value = 'B';
  assert.equal(await failed.controller.saveAll(), false); assert.equal(failed.input('health', 'blood_type').value, 'B');
  assert.equal(failed.controller.hasChanges(), true); assert.equal(failed.toasts.length, 0);
  assert.equal(await failed.controller.saveAll(), true); assert.equal(failed.controller.hasChanges(), false);
  let finish;
  const late = workspace(() => new Promise(resolve => { finish = resolve; })); late.controller.acceptSnapshot(plain(initial));
  late.input('health', 'blood_type').value = 'B'; const saving = late.controller.saveAll();
  late.input('health', 'blood_type').value = 'AB'; late.input('health', 'blood_type').dispatchEvent({ type: 'change', bubbles: true });
  finish(snapshot([], 'r2', { profile: { ...initial.profile, blood_type: 'B' } }));
  assert.equal(await saving, true); assert.equal(late.input('health', 'blood_type').value, 'AB'); assert.equal(late.controller.hasChanges(), true);
  const remote = snapshot([], 'remote', { profile: { blood_type: 'ไม่ทราบ', allergies: 'Remote allergy' } });
  let conflict, attempts = 0;
  conflict = workspace(async (body, revision) => {
    assert.deepEqual(plain(body), { profile: { blood_type: 'O' } });
    if (++attempts === 1) { assert.equal(revision, 'r1'); throw Object.assign(Error('fixture conflict'), { status: 409, data: plain(remote) }); }
    assert.equal(revision, 'remote'); return snapshot([], 'r3', { profile: { ...remote.profile, blood_type: 'O' } });
  }, { reload: async () => { conflict.controller.acceptSnapshot(plain(remote)); return plain(remote); } });
  conflict.controller.acceptSnapshot(plain(initial)); conflict.input('health', 'blood_type').value = 'O';
  assert.equal(await conflict.controller.saveAll(), false); assert.equal(conflict.controller.hasConflict, true);
  assert.equal(conflict.input('health', 'blood_type').value, 'O'); assert.equal(conflict.toasts.length, 0);
  conflict.document.getElementById('profileReviewAll').events.click(); await conflict.confirmations.pop().onConfirm();
  assert.equal(conflict.input('health', 'blood_type').value, 'O'); assert.equal(conflict.input('health', 'allergies').value, 'Remote allergy');
  assert.equal(conflict.controller.hasConflict, false); assert.equal(await conflict.controller.saveAll(), true);
  assert.equal(conflict.controller.hasChanges(), false); assert.equal(attempts, 2);
});

test('profile dropdowns preserve all stored values, nulls and legacy free-text genders without inferring titles', async () => {
  for (const prefix of [null, undefined, 'นาย', 'นาง', 'นางสาว']) for (const gender of [null, undefined, 'ชาย', 'หญิง', 'ไม่ประสงค์ระบุ', 'male', 'female', 'other']) {
    const h = workspace(async () => { throw Error('opening dropdowns must not save'); });
    h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { prefix, gender } }));
    for (const [entry, key, value] of [['basics', 'prefix', prefix], ['basics', 'gender', gender]]) {
      const input = h.input(entry, key); assert.equal(input.tagName, 'SELECT'); assert.equal(input.value, value ?? '');
      assert.equal(input.children.some(option => ['undefined', 'null'].includes(option.textContent)), false);
    }
    assert.equal(h.controller.hasChanges(), false);
    h.controller.acceptSnapshot(snapshot([], 'r2', { profile: { prefix, gender } }));
    assert.equal(h.input('basics', 'gender').value, gender ?? '');
    assert.equal(h.document.getElementById('profileEnglishPrefixUnavailable'), undefined);
  }
  const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'legacy value' } }));
  h.input('basics', 'prefix').value = 'นางสาว';
  h.controller.setProfileField('gender', 'another legacy value');
  assert.equal(h.input('basics', 'gender').value, 'another legacy value');
  assert.equal(h.input('basics', 'prefix').value, 'นางสาว');
  assert.equal(h.input('basics', 'gender').children.some(option => option.value === 'legacy value'), false);
  const regions = ['profileThaiPrefixSlot', 'profileThaiGenderSlot', 'profilePersonalExtras', 'profileAcademicExtras', 'profileFamilyExtras', 'profileEmergencyExtras', 'profileAbilities', 'profileHealthExtras', 'profileStructuredAddresses', 'profileContactExtras', 'profileFriendContact', 'profileDocumentCards'];
  const seen = new Set();
  function contracts(node) {
    if (node.id) { assert.equal(seen.has(node.id), false, 'duplicate dynamic ID ' + node.id); seen.add(node.id); }
    if (node.tagName === 'LABEL') { assert.equal(node.textContent.includes('(ถ้ามี)'), false); assert.ok(h.document.getElementById(node.htmlFor)); }
    for (const key of ['aria-labelledby', 'aria-describedby', 'aria-controls']) for (const id of (node.getAttribute(key) || '').split(' ').filter(Boolean)) assert.ok(h.document.getElementById(id), 'missing ' + id);
    node.children.forEach(contracts);
  }
  regions.forEach(id => contracts(h.document.getElementById(id)));
});

test('dropdown changes save once with If-Match and read back without losing omitted profile/PDF fields', async () => {
  let saved = { prefix: 'นางสาว', gender: 'female', english_first_name: 'Fixture', birth_date: '2000-02-29' }; const calls = [];
  const h = workspace(async (body, revision) => {
    calls.push({ body: plain(body), revision }); saved = { ...saved, ...rules.normalizeProfile(body.profile) };
    return snapshot([], 'r2', { profile: saved });
  });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: saved }));
  h.input('basics', 'prefix').value = 'นาง'; h.input('basics', 'gender').value = 'ไม่ประสงค์ระบุ';
  assert.equal(h.controller.hasChanges(), true); assert.equal(await h.controller.saveAll(), true);
  assert.deepEqual(calls, [{ body: { profile: { prefix: 'นาง', gender: 'ไม่ประสงค์ระบุ' } }, revision: 'r1' }]);
  h.controller.acceptSnapshot(snapshot([], 'r2', { profile: saved }));
  assert.equal(h.input('basics', 'prefix').value, 'นาง'); assert.equal(h.input('basics', 'gender').value, 'ไม่ประสงค์ระบุ');
  assert.equal(h.input('identity', 'english_first_name').value, 'Fixture'); assert.equal(h.input('basics', 'birth_date').value, '2000-02-29');
  assert.equal(h.controller.hasChanges(), false);
  const imported = buildProfilePdfChanges(snapshot([], 'r2', { profile: saved }), [{ scope: 'profile', key: 'english_first_name', mode: 'edit', value: 'Imported' }], []);
  assert.deepEqual(imported, { profile: { english_first_name: 'Imported' } });
  assert.ok(pdfFieldSpecs.profile.english_prefix);
  assert.equal(buildProfilePdfChanges(snapshot([], 'r2', { profile: saved }), [{ scope: 'profile', key: 'gender', mode: 'keep', value: null }], []).profile, undefined);
});

test('Thai personal fields keep gender values and optional national ID through validation, late typing, save and PDF isolation', async () => {
  const id = seed => {
    const digits = String(seed).padEnd(12, '0'), sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
    return digits + (11 - sum % 11) % 10;
  };
  const first = id('9'), second = id('98'), calls = []; let finish;
  const h = workspace((body, revision) => { calls.push({ body: plain(body), revision }); return new Promise(resolve => { finish = resolve; }); });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'male' } }));
  const gender = h.input('basics', 'gender'), nationalId = h.input('basics', 'national_id');
  assert.equal(gender.children.find(option => option.value === 'male').textContent, 'ชาย');
  assert.equal(gender.children.find(option => option.value === 'female').textContent, 'หญิง');
  assert.equal(h.input('identity', 'gender'), undefined); assert.equal(nationalId.disabled, false); assert.equal(!!nationalId.readOnly, false);
  assert.equal(nationalId.required, false); assert.equal(nationalId.maxLength, 13); assert.equal(nationalId.inputMode, 'numeric');
  const english = h.document.getElementById('profilePersonalExtras').children[1];
  assert.deepEqual(english.children.find(node => node.className === 'profile-entry-grid').children.map(group => group.children[1].name || group.children[1].id), ['english_prefix', 'profileEnglishGender', 'english_first_name', 'english_last_name']);
  for (const bad of ['123', '0'.repeat(13), first.slice(0, 12) + ((Number(first[12]) + 1) % 10), first + '0']) {
    nationalId.value = bad; assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0);
    assert.equal(h.errors.at(-1).input, nationalId);
  }
  nationalId.value = first; gender.value = 'female'; const pending = h.controller.saveAll(); nationalId.value = second;
  finish(snapshot([], 'r2', { profile: { national_id: first, gender: 'female' } })); assert.equal(await pending, true);
  assert.ok(calls[0].body.profile.national_id === first); assert.equal(calls[0].body.profile.gender, 'female'); assert.equal(calls[0].revision, 'r1');
  assert.ok(nationalId.value === second); assert.equal(h.controller.hasChanges(), true);
  const next = h.controller.saveAll(); finish(snapshot([], 'r3', { profile: { national_id: second, gender: 'female' } })); await next;
  h.controller.acceptSnapshot(snapshot([], 'r3', { profile: { national_id: second, gender: 'female' } }));
  assert.ok(nationalId.value === second); assert.equal(h.controller.hasChanges(), false);
  assert.equal(pdfFieldSpecs.profile.national_id, undefined);
  const imported = buildProfilePdfChanges(snapshot([], 'r3', { profile: { national_id: second, gender: 'female' } }), [{ scope: 'profile', key: 'english_first_name', mode: 'edit', value: 'Imported' }], []);
  assert.equal(Object.hasOwn(imported.profile, 'national_id'), false);
  let conflict;
  conflict = workspace(async () => {}, { reload: async () => { conflict.controller.acceptSnapshot(snapshot([], 'r2', { profile: { national_id: first } })); return {}; } });
  conflict.controller.acceptSnapshot(snapshot([], 'r1', { profile: { national_id: first } }));
  conflict.input('basics', 'national_id').value = second;
  conflict.document.getElementById('profileReviewAll').events.click(); await conflict.confirmations.pop().onConfirm();
  const texts = node => [node.textContent, ...node.children.flatMap(texts)].join(' ');
  const display = texts(conflict.document.getElementById('profilePersonalExtras'));
  assert.equal(display.includes(first) || display.includes(second), false);
  assert.ok(conflict.input('basics', 'national_id').value === second);
});

function calendar(h) {
  const input = h.input('basics', 'birth_date'), group = input.parentElement;
  const popup = h.document.getElementById(input.id + '-calendar'), [heading, controls, grid, help, footer] = popup.children;
  const toggle = group.children.find(child => child.className === 'btn-secondary profile-calendar-toggle');
  const [previous, month, year, next] = controls.children;
  return { input, group, popup, heading, grid, toggle, previous, month, year, next, clear: footer.children[0], close: footer.children[1],
    day: value => grid.querySelectorAll('button').find(button => button.dataset.date === value),
    key(key, shiftKey = false) { grid.events.keydown({ key, shiftKey, preventDefault() {}, stopPropagation() {} }); } };
}

test('English gender mirrors the one canonical Thai/API field across legacy values and both change directions', async () => {
  for (const [value, label] of [[null, 'Not specified'], ['male', 'Male'], ['female', 'Female'], ['ชาย', 'Male'], ['หญิง', 'Female'], ['ไม่ประสงค์ระบุ', 'Unspecified'], ['other', 'Other'], ['legacy', 'Existing value']]) {
    const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: value } }));
    const thai = h.input('basics', 'gender'), english = h.document.getElementById('profileEnglishGender');
    assert.equal(english.value, value ?? ''); assert.equal(english.children.find(option => option.value === (value ?? '')).textContent, label);
    assert.equal(english.name, undefined); assert.equal(h.controller.hasChanges(), false);
    assert.equal(thai.parentElement.parentElement.id, 'profileThaiGenderSlot');
    assert.equal(h.input('basics', 'prefix').parentElement.parentElement.id, 'profileThaiPrefixSlot');
    const female = english.children.find(option => option.textContent === 'Female').value;
    english.value = female; english.events.change(); assert.equal(thai.value, female); assert.equal(h.controller.profileValues().gender, female);
    const male = thai.children.find(option => option.textContent === 'ชาย').value;
    thai.value = male; thai.events.input(); assert.equal(english.value, male); assert.equal(h.controller.profileValues().gender, male);
    english.value = ''; english.events.change(); assert.equal(thai.value, '');
    assert.equal(Object.hasOwn(h.controller.profileValues(), 'english_gender'), false);
  }
});

test('bilingual gender submits once with If-Match, keeps late edits and synchronizes after reload, PDF and 409 review', async () => {
  let finish; const calls = [];
  const h = workspace((body, revision) => { calls.push({ body: plain(body), revision }); return new Promise(resolve => { finish = resolve; }); });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'male' } }));
  const english = h.document.getElementById('profileEnglishGender'), thai = h.input('basics', 'gender');
  english.value = 'female'; english.events.input(); const pending = h.controller.saveAll();
  thai.value = 'male'; thai.events.change(); finish(snapshot([], 'r2', { profile: { gender: 'female' } })); assert.equal(await pending, true);
  assert.deepEqual(calls, [{ body: { profile: { gender: 'female' } }, revision: 'r1' }]);
  assert.equal(thai.value, 'male'); assert.equal(english.value, 'male'); assert.equal(h.controller.hasChanges(), true);
  const next = h.controller.saveAll(); finish(snapshot([], 'r3', { profile: { gender: 'male' } })); await next;
  h.controller.acceptSnapshot(snapshot([], 'r3', { profile: { gender: 'male' } }));
  assert.equal(english.value, 'male'); assert.equal(h.controller.hasChanges(), false);
  const imported = buildProfilePdfChanges(snapshot([], 'r3', { profile: { gender: 'male' } }), [{ scope: 'profile', key: 'gender', mode: 'edit', value: 'หญิง' }], []);
  assert.deepEqual(imported, { profile: { gender: 'หญิง' } });
  h.controller.acceptSnapshot(snapshot([], 'r4', { profile: imported.profile })); assert.equal(thai.value, 'หญิง'); assert.equal(english.value, 'หญิง');
  assert.equal(english.children.find(option => option.value === 'หญิง').textContent, 'Female');
  let conflict;
  conflict = workspace(async () => { throw Object.assign(Error('conflict'), { status: 409, data: snapshot([], 'r2', { profile: { gender: 'other' } }) }); },
    { reload: async () => { conflict.controller.acceptSnapshot(snapshot([], 'r2', { profile: { gender: 'other' } })); return {}; } });
  conflict.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'male' } }));
  const mirror = conflict.document.getElementById('profileEnglishGender'); mirror.value = 'female'; mirror.events.change();
  assert.equal(await conflict.controller.saveAll(), false); assert.equal(mirror.value, 'female'); assert.equal(conflict.controller.hasConflict, true); assert.equal(conflict.toasts.length, 0);
  conflict.document.getElementById('profileReviewAll').events.click(); await conflict.confirmations.pop().onConfirm();
  assert.equal(mirror.value, 'female'); assert.equal(conflict.input('basics', 'gender').value, 'female'); assert.equal(conflict.controller.hasChanges(), true);
});

test('English Title preserves drafts and blocks while the schema or old backend capability is unavailable', async () => {
  const calls = []; const h = workspace(async (body, revision) => { calls.push({ body: plain(body), revision }); return snapshot([], 'r3', { profile: { gender: body.profile.gender, english_prefix: 'Dr.' } }); });
  const title = h.document.getElementById('profileEnglishTitle'); assert.equal(title.disabled, true);
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile_english_prefix_available: false, profile: { english_prefix: 'Dr.', prefix: 'นาย', gender: 'male' } }));
  assert.equal(title.disabled, false); assert.equal(title.value, 'Dr.'); assert.equal(h.controller.hasChanges(), false);
  for (const option of ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Dr.']) assert.ok(title.children.some(item => item.value === option));
  h.input('basics', 'prefix').value = 'นางสาว'; h.input('basics', 'prefix').events.change(); assert.equal(title.value, 'Dr.');
  h.input('basics', 'prefix').value = 'นาย'; h.input('basics', 'prefix').events.change();
  title.value = 'Ms.'; title.events.change(); assert.equal(h.controller.hasChanges(), true);
  const gender = h.document.getElementById('profileEnglishGender'); gender.value = 'female'; gender.events.change();
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0); assert.equal(h.toasts.length, 0);
  assert.match(h.errors.at(-1).message, /BLOCKED/); assert.equal(h.errors.at(-1).input, title);
  h.controller.acceptSnapshot(snapshot([], 'r2', { profile_english_prefix_available: false, profile: { english_prefix: 'Dr.', prefix: 'นาย', gender: 'male' } }));
  assert.equal(title.value, 'Ms.'); assert.equal(gender.value, 'female');
  assert.equal(h.controller.profileValues().english_prefix, 'Ms.'); assert.ok(pdfFieldSpecs.profile.english_prefix);
  title.value = 'Dr.'; title.events.change();
  h.document.getElementById('profileReviewAll').events.click();
  // A stale gender revision still uses the existing conflict guard; no unsupported Title request is sent.
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0);
  const clean = workspace(async body => { assert.equal(Object.hasOwn(body.profile, 'english_prefix'), false); return snapshot([], 'r2', { profile: body.profile }); });
  clean.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'male', prefix: 'นางสาว', english_prefix: 'Dr.' } }));
  assert.equal(clean.document.getElementById('profileEnglishTitle').value, 'Dr.');
  clean.document.getElementById('profileEnglishGender').value = 'female'; clean.document.getElementById('profileEnglishGender').events.change();
  assert.equal(await clean.controller.saveAll(), true);
  assert.equal(clean.document.getElementById('profileEnglishTitle').value, 'Dr.'); assert.equal(clean.controller.hasChanges(), false);
  let finish;
  const late = workspace(() => new Promise(resolve => { finish = resolve; }));
  late.controller.acceptSnapshot(snapshot([], 'r1', { profile: { gender: 'male', prefix: 'นางสาว' } }));
  const lateTitle = late.document.getElementById('profileEnglishTitle'); assert.equal(lateTitle.value, '');
  const lateGender = late.document.getElementById('profileEnglishGender'); lateGender.value = 'female'; lateGender.events.change();
  const pending = late.controller.saveAll(); lateTitle.value = 'Miss'; lateTitle.events.change();
  finish(snapshot([], 'r2', { profile_english_prefix_available: false, profile: { gender: 'female' } })); await pending;
  assert.equal(lateTitle.value, 'Miss'); assert.equal(late.controller.hasChanges(), true); assert.equal(await late.controller.saveAll(), false);
  assert.deepEqual(rules.normalizeProfile({ english_prefix: 'Ms.' }), { english_prefix: 'Ms.' });
});

test('ready Title saves nullable/legacy values, reads back, preserves unrelated fields and catches incomplete acknowledgements', async () => {
  const calls = []; let saved = { english_prefix: 'Dr.', prefix: 'นาย', gender: 'male', english_first_name: 'Fixture' };
  const h = workspace(async (body, revision) => { calls.push({ body: plain(body), revision }); saved = { ...saved, ...rules.normalizeProfile(body.profile) }; return snapshot([], 'r' + (calls.length + 1), { profile: saved }); });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: saved }));
  const title = h.document.getElementById('profileEnglishTitle');
  assert.equal(title.name, 'english_prefix'); assert.equal(h.document.getElementById('profileEnglishTitleHelp').hidden, true);
  for (const value of ['Mr.', 'Mrs.', 'Miss', 'Ms.', '']) {
    const revision = h.controller.snapshot.profile_revision;
    title.value = value; title.events.change(); assert.equal(h.controller.hasChanges(), true);
    assert.equal(await h.controller.saveAll(), true); assert.deepEqual(calls.at(-1), { body: { profile: { english_prefix: value || null } }, revision });
    h.controller.acceptSnapshot(snapshot([], h.controller.snapshot.profile_revision, { profile: saved }));
    assert.equal(title.value, value); assert.equal(h.controller.hasChanges(), false); assert.equal(h.input('basics', 'prefix').value, 'นาย'); assert.equal(h.input('basics', 'gender').value, 'male');
  }
  h.controller.setProfileField('english_prefix', 'a'.repeat(256)); const before = calls.length;
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, before); assert.equal(h.errors.at(-1).input, title);
  for (const extra of [{ profile: {} }, { profile: { english_prefix: 'Mr.' } }, { profile: { english_prefix: 'Ms.' }, profile_english_prefix_available: false }]) {
    const broken = workspace(async () => snapshot([], 'r2', extra)); broken.controller.acceptSnapshot(snapshot());
    const input = broken.document.getElementById('profileEnglishTitle'); input.value = 'Ms.'; input.events.change();
    assert.equal(await broken.controller.saveAll(), false); assert.equal(input.value, 'Ms.'); assert.equal(broken.controller.hasChanges(), true); assert.equal(broken.toasts.length, 0);
  }
  const unavailable = workspace(async () => { throw Object.assign(Error('pending'), { status: 503, data: { code: 'PROFILE_ENGLISH_TITLE_SCHEMA_PENDING' } }); });
  unavailable.controller.acceptSnapshot(snapshot()); const pendingTitle = unavailable.document.getElementById('profileEnglishTitle');
  pendingTitle.value = 'Ms.'; pendingTitle.events.change();
  assert.equal(await unavailable.controller.saveAll(), false); assert.equal(pendingTitle.value, 'Ms.');
  assert.equal(unavailable.document.getElementById('profileEnglishTitleHelp').hidden, false); assert.equal(unavailable.controller.snapshot.profile_english_prefix_available, false);
});

test('pending-to-ready Title keeps its draft and 409 review, preserves late typing and maps PDF only on explicit choice', async () => {
  let h; const calls = [];
  h = workspace(async (body, revision) => { calls.push({ body: plain(body), revision }); return snapshot([], 'r3', { profile: body.profile }); },
    { reload: async () => { h.controller.acceptSnapshot(snapshot([], 'r2', { profile: { english_prefix: null } })); return {}; } });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile_english_prefix_available: false }));
  const title = h.document.getElementById('profileEnglishTitle'); title.value = 'Ms.'; title.events.change();
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0); assert.equal(h.document.getElementById('profileEnglishTitleHelp').hidden, false);
  h.controller.acceptSnapshot(snapshot([], 'r2', { profile: { english_prefix: null } }));
  assert.equal(title.value, 'Ms.'); assert.equal(h.document.getElementById('profileEnglishTitleHelp').hidden, true);
  assert.equal(await h.controller.saveAll(), false); assert.equal(calls.length, 0);
  h.document.getElementById('profileReviewAll').events.click(); await h.confirmations.pop().onConfirm();
  assert.equal(await h.controller.saveAll(), true); assert.equal(calls[0].revision, 'r2'); assert.equal(title.value, 'Ms.');
  const base = snapshot([], 'r3', { profile: { english_prefix: 'Dr.', prefix: 'นางสาว', gender: 'female' } });
  assert.deepEqual(buildProfilePdfChanges(base, [{ scope: 'profile', key: 'english_prefix', mode: 'keep', value: 'Mrs.' }], []), {});
  assert.deepEqual(buildProfilePdfChanges(base, [{ scope: 'profile', key: 'english_first_name', mode: 'edit', value: 'Name' }], []), { profile: { english_first_name: 'Name' } });
  assert.deepEqual(buildProfilePdfChanges(base, [{ scope: 'profile', key: 'english_prefix', mode: 'pdf', value: 'Mrs.' }], []), { profile: { english_prefix: 'Mrs.' } });
  let finish;
  const late = workspace(() => new Promise(resolve => { finish = resolve; })); late.controller.acceptSnapshot(snapshot());
  const lateTitle = late.document.getElementById('profileEnglishTitle'); lateTitle.value = 'Ms.'; lateTitle.events.change();
  const pending = late.controller.saveAll(); lateTitle.value = 'Miss'; lateTitle.events.change();
  finish(snapshot([], 'r2', { profile: { english_prefix: 'Ms.' } })); await pending;
  assert.equal(lateTitle.value, 'Miss'); assert.equal(late.controller.hasChanges(), true);
  const conflict = workspace(async () => { throw Object.assign(Error('conflict'), { status: 409, data: base }); });
  conflict.controller.acceptSnapshot(snapshot()); const conflictTitle = conflict.document.getElementById('profileEnglishTitle'); conflictTitle.value = 'Mr.'; conflictTitle.events.change();
  assert.equal(await conflict.controller.saveAll(), false); assert.equal(conflictTitle.value, 'Mr.'); assert.equal(conflict.controller.hasConflict, true); assert.equal(conflict.toasts.length, 0);
});

test('birthday calendar opens/closes without losing drafts; month/year navigation does not change the stored date', () => {
  const h = workspace(async () => {}), c = calendar(h);
  assert.equal(c.toggle.disabled, true);
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: { birth_date: '2000-02-29' } }));
  h.input('identity', 'english_first_name').value = 'unsaved';
  assert.equal(c.toggle.disabled, false); c.toggle.events.click();
  assert.equal(c.popup.hidden, false); assert.equal(c.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(c.popup.getAttribute('role'), 'dialog'); assert.equal(c.year.value, '2000'); assert.equal(c.month.value, '2');
  assert.equal(h.document.activeElement, c.day('2000-02-29'));
  c.year.value = '1990'; c.year.events.change(); assert.equal(c.year.value, '1990'); assert.equal(c.month.value, '2');
  assert.equal(c.input.value, '2000-02-29'); assert.equal(c.year.children.at(-1).value, '1');
  c.group.events.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(c.popup.hidden, true); assert.equal(h.document.activeElement, c.toggle);
  c.toggle.events.click(); assert.equal(c.year.value, '2000');
  h.document.events.pointerdown({ target: h.document.createElement('div') }); assert.equal(c.popup.hidden, true);
  assert.equal(h.input('identity', 'english_first_name').value, 'unsaved');
  assert.equal(c.input.value, '2000-02-29'); assert.equal(h.controller.hasChanges(), true);
});

test('calendar selection, clear, keyboard and read-back preserve ISO dates including leap days and early years', async () => {
  const calls = []; let saved = { birth_date: '2000-02-28' };
  const h = workspace(async (body, revision) => { calls.push({ body: plain(body), revision }); saved = { ...saved, ...rules.normalizeProfile(body.profile) }; return snapshot([], 'r2', { profile: saved }); });
  h.controller.acceptSnapshot(snapshot([], 'r1', { profile: saved })); const c = calendar(h);
  c.toggle.events.click(); c.key('ArrowRight'); assert.equal(h.document.activeElement, c.day('2000-02-29'));
  c.key('PageDown'); assert.equal(h.document.activeElement, c.day('2000-03-29'));
  c.key('PageUp'); c.key('PageDown', true); assert.equal(h.document.activeElement, c.day('2001-02-28'));
  c.key('Home'); assert.equal(h.document.activeElement, c.day('2001-02-25'));
  c.key('End'); assert.equal(h.document.activeElement, c.day('2001-03-03'));
  c.year.value = '2000'; c.month.value = '2'; c.year.events.change(); c.day('2000-02-29').events.click();
  assert.equal(c.input.value, '2000-02-29'); assert.equal(c.popup.hidden, true); assert.equal(h.controller.hasChanges(), true);
  assert.equal(await h.controller.saveAll(), true); assert.equal(calls[0].body.profile.birth_date, '2000-02-29'); assert.equal(calls[0].revision, 'r1');
  assert.equal(c.input.value, '2000-02-29'); assert.equal(h.controller.hasChanges(), false);
  c.toggle.events.click(); assert.equal(c.day('2000-02-29').parentElement.getAttribute('aria-selected'), 'true');
  c.clear.events.click(); assert.equal(c.input.value, ''); assert.equal(h.controller.profileValues().birth_date, ''); assert.equal(h.controller.hasChanges(), true);
  h.controller.setProfileField('birth_date', '0099-01-01'); c.toggle.events.click();
  assert.equal(c.year.value, '99'); assert.equal(h.document.activeElement, c.day('0099-01-01')); c.day('0099-01-01').events.click();
  assert.equal(c.input.value, '0099-01-01'); assert.equal(canonicalWorkspaceValue(workspaceFields.basics.find(field => field.key === 'birth_date'), c.input.value, true), '0099-01-01');
});

test('calendar uses Bangkok today, prevents future selection, and keeps today visually distinct from selected', () => {
  assert.equal(profileCalendarToday(new Date('2026-11-04T16:59:59Z')), '2026-11-04');
  assert.equal(profileCalendarToday(new Date('2026-11-04T17:00:00Z')), '2026-11-05');
  const h = workspace(async () => {}); h.controller.acceptSnapshot(snapshot()); const c = calendar(h); c.toggle.events.click();
  const today = profileCalendarToday(), todayButton = c.day(today);
  assert.equal(todayButton.getAttribute('aria-current'), 'date'); assert.notEqual(todayButton.className, 'is-selected');
  assert.equal(c.next.disabled, true); c.key('ArrowRight'); assert.equal(h.document.activeElement, c.day(today));
  assert.equal(c.grid.querySelectorAll('button').filter(day => day.dataset.date > today).every(day => day.disabled), true);
  const selected = c.day(today); selected.events.click(); assert.equal(c.input.value, today);
  c.toggle.events.click(); assert.equal(c.day(today).className, 'is-selected'); assert.equal(c.day(today).getAttribute('aria-current'), 'date');
  c.group.events.focusout({ relatedTarget: h.document.createElement('button') }); assert.equal(c.popup.hidden, true);
});
