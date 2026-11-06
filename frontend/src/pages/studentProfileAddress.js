import areas from '../data/thai-addresses/areas.json' with { type: 'json' };

export const addressKeys = ['province', 'district', 'subdistrict', 'postal_code'];
const prefixes = { province: /^(?:จังหวัด\s*|จ\.\s*)/u, district: /^(?:อำเภอ\s*|เขต\s*|อ\.\s*)/u, subdistrict: /^(?:ตำบล\s*|แขวง\s*|ต\.\s*)/u };
const normalized = (key, value) => String(value ?? '').trim().replace(prefixes[key] || /$^/u, '').trim();
const match = (rows, key, value) => {
  const name = normalized(key, value);
  if (!name) return null;
  const matches = rows.filter(row => normalized(key, row[0]) === name);
  return matches.length === 1 ? matches[0] : null;
};
// Resolve for display only. Never mutate raw API values during hydration.
export function addressContext(values, data = areas) {
  const province = match(data, 'province', values.province);
  const district = match(province?.[1] || [], 'district', values.district);
  const subdistrict = match(district?.[1] || [], 'subdistrict', values.subdistrict);
  return { province, district, subdistrict, postalCodes: subdistrict?.[1] || [], review: subdistrict?.[2] };
}
export function addressOptions(values, key, query = '', data = areas) {
  const context = addressContext(values, data);
  const options = key === 'province' ? data.map(row => row[0]) : key === 'district' ? (context.province?.[1] || []).map(row => row[0])
    : key === 'subdistrict' ? (context.district?.[1] || []).map(row => row[0]) : context.postalCodes;
  const term = normalized(key, query);
  return options.filter(name => name.includes(term)).sort((a, b) => a.localeCompare(b, 'th'));
}
// Called only by an explicit user selection (including the manual fallback).
export function selectAddress(values, key, value, data = areas) {
  const next = { ...values, [key]: value };
  if (key === 'province' && value !== values.province) {
    if (!addressContext(next, data).district) next.district = '';
    if (!addressContext(next, data).subdistrict) next.subdistrict = '';
    next.postal_code = '';
  } else if (key === 'district' && value !== values.district) {
    if (!addressContext(next, data).subdistrict) next.subdistrict = '';
    next.postal_code = '';
  } else if (key === 'subdistrict') {
    const codes = addressContext(next, data).postalCodes;
    next.postal_code = codes.length === 1 ? codes[0] : value === values.subdistrict && codes.includes(values.postal_code) ? values.postal_code : '';
  }
  return next;
}

export function mountProfileAddressSearch({ document, inputs, onChange }) {
  const controls = new Map();
  const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
  const values = () => Object.fromEntries([...inputs].map(([key, input]) => [key, input.value]));
  const closeAll = except => { for (const control of controls.values()) if (control !== except) control.close(); };
  for (const key of addressKeys) {
    const original = inputs.get(key), group = original.closest('.form-group');
    const wrapper = node('div', undefined, 'profile-address-search');
    const input = node('input'); input.id = original.id + '-search'; input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = original.maxLength;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    input.placeholder = key === 'province' ? 'ค้นหาจังหวัด' : key === 'district' ? 'ค้นหาอำเภอ / เขต' : key === 'subdistrict' ? 'ค้นหาตำบล / แขวง' : 'เลือกรหัสไปรษณีย์';
    if (key === 'postal_code') input.inputMode = 'numeric';
    const toggle = node('button', '⌄', 'profile-address-toggle'); toggle.type = 'button'; toggle.setAttribute('aria-label', 'แสดงตัวเลือก' + group.children[0].textContent); toggle.tabIndex = -1;
    const popup = node('div', undefined, 'profile-address-popup'); popup.hidden = true;
    const list = node('div'); list.id = original.id + '-options'; list.setAttribute('role', 'listbox');
    input.setAttribute('aria-controls', list.id);
    const help = node('p', '', 'profile-tab-help profile-address-help'); help.id = original.id + '-help'; help.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', help.id);
    popup.append(list); wrapper.append(input, toggle, popup); group.append(wrapper, help);
    original.hidden = true; group.children[0].htmlFor = input.id;
    let open = false, active = -1, choices = [], composing = false;
    const close = () => { open = false; popup.hidden = true; input.value = original.value; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const choose = choice => {
      if (original.disabled) return;
      const before = values(), next = selectAddress(before, key, choice);
      for (const field of addressKeys) inputs.get(field).value = next[field] ?? '';
      close(); refresh(); onChange(addressKeys.filter(field => field === key || before[field] !== next[field])); input.focus();
    };
    const activate = index => {
      active = index;
      for (let i = 0; i < list.children.length; i++) list.children[i].setAttribute('aria-selected', String(i === active));
      const option = list.children[active];
      if (option) { input.setAttribute('aria-activedescendant', option.id); option.scrollIntoView?.({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    };
    const render = query => {
      const found = addressOptions(values(), key, query);
      choices = found.map(value => ({ value, label: value }));
      // Clearing and using an unrecognised value are explicit actions, never blur effects.
      if (!query.trim()) choices.unshift({ value: '', label: 'ยังไม่ระบุ / ล้างการเลือก' });
      const context = addressContext(values());
      const manual = key !== 'postal_code' || !context.postalCodes.length;
      if (query.trim() && !found.length && manual && (key !== 'postal_code' || /^\d{5}$/.test(query.trim()))) choices.push({ value: query.trim(), label: 'ใช้ข้อความนี้: ' + query.trim() + ' (กรุณาตรวจสอบ)' });
      list.replaceChildren();
      choices.forEach((choice, index) => {
        const option = node('div', choice.label, 'profile-address-option'); option.id = list.id + '-' + index; option.setAttribute('role', 'option');
        option.addEventListener('mousedown', event => event.preventDefault());
        option.addEventListener('click', () => choose(choice.value)); list.append(option);
      });
      if (!choices.length) list.append(node('p', 'ไม่พบตัวเลือก กรุณาตรวจสอบพื้นที่ด้านบน', 'profile-tab-help'));
      activate(-1);
    };
    const show = () => {
      if (original.disabled) return;
      closeAll(controls.get(key)); open = true; popup.hidden = false; input.value = ''; input.setAttribute('aria-expanded', 'true'); render('');
    };
    input.addEventListener('click', () => { if (!open) show(); });
    toggle.addEventListener('click', () => { if (open) close(); else show(); input.focus(); });
    input.addEventListener('input', () => { if (!open) { closeAll(controls.get(key)); open = true; popup.hidden = false; input.setAttribute('aria-expanded', 'true'); } render(input.value); });
    input.addEventListener('compositionstart', () => { composing = true; }); input.addEventListener('compositionend', () => { composing = false; render(input.value); });
    input.addEventListener('keydown', event => {
      if (composing || event.isComposing) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); if (!open) show();
        if (choices.length) activate(event.key === 'ArrowDown' ? (active + 1) % choices.length : (active <= 0 ? choices.length : active) - 1);
      } else if (open && ['Home', 'End'].includes(event.key)) { event.preventDefault(); if (choices.length) activate(event.key === 'Home' ? 0 : choices.length - 1); }
      else if (open && event.key === 'Enter') { event.preventDefault(); if (active >= 0) choose(choices[active].value); }
      else if (event.key === 'Escape') { event.preventDefault(); close(); }
      else if (event.key === 'Tab') close();
    });
    // Pointer selection runs before blur because options cancel mousedown focus.
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    controls.set(key, { input, toggle, help, close });
  }
  function refresh() {
    const current = values(), context = addressContext(current);
    for (const [key, control] of controls) {
      control.close(); control.input.disabled = inputs.get(key).disabled; control.toggle.disabled = control.input.disabled;
      const matched = key === 'postal_code' ? context.postalCodes.includes(current[key]) : context[key];
      control.help.textContent = current[key] && !matched ? 'เก็บค่าเดิมไว้: จับคู่กับชุดข้อมูลไม่ได้ กรุณาตรวจสอบหรือเลือกใหม่'
        : key === 'district' && !context.province ? 'เลือกจังหวัดก่อน หรือกรอกพื้นที่ที่ไม่พบด้วยตนเอง'
        : key === 'subdistrict' && !context.district ? 'เลือกอำเภอ / เขตก่อน หรือกรอกพื้นที่ที่ไม่พบด้วยตนเอง'
        : key === 'postal_code' && context.subdistrict && !context.postalCodes.length ? 'ชุดข้อมูลรหัสไปรษณีย์ไม่ครบหรือขัดกัน กรุณาตรวจสอบและกรอกด้วยตนเอง'
        : key === 'postal_code' && context.postalCodes.length > 1 ? 'พื้นที่นี้มีหลายรหัสไปรษณีย์ กรุณาเลือกรหัสที่ตรงกับที่อยู่'
        : key === 'postal_code' && !context.subdistrict ? 'ยังไม่เติมรหัสไปรษณีย์จนกว่าจะเลือกพื้นที่ครบ'
        : key === 'postal_code' ? 'เติมรหัสไปรษณีย์เมื่อคุณเลือกตำบล / แขวงที่มีรหัสเดียว' : 'พิมพ์เพื่อค้นหา ใช้ปุ่มลูกศรและ Enter เพื่อเลือก';
    }
  }
  refresh();
  return { refresh, control: key => controls.get(key)?.input };
}
