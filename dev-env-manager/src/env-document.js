import { demand, ToolError } from './errors.js';
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PUBLIC = new Set(['NODE_ENV','PORT','FRONTEND_URL','JWT_EXPIRES_IN','NLP_SERVICE_BASE_URL','NLP_SERVICE_TIMEOUT_MS','NLP_OCR_TIMEOUT_MS',
  'RECRUITMENT_SUBMISSION_ENABLED','TURNSTILE_EXPECTED_HOSTNAME','TURNSTILE_EXPECTED_ACTION','GOOGLE_CLIENT_ID','GOOGLE_LOGIN_ENABLED',
  'GOOGLE_ACCOUNT_LINKING_ENABLED','GOOGLE_STUDENT_ONBOARDING_ENABLED','GOOGLE_HOSTED_DOMAIN_POLICY','GOOGLE_ALLOWED_EMAIL_DOMAINS',
  'GOOGLE_ALLOWED_HOSTED_DOMAINS','GOOGLE_ALLOWED_EMAIL_DOMAINS_STUDENT','GOOGLE_ALLOWED_EMAIL_DOMAINS_TEACHER',
  'GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_HEAD','GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_STAFF','SMTP_HOST','SMTP_PORT','SMTP_SECURE',
  'SMTP_FROM_NAME','VITE_API_URL','VITE_TURNSTILE_SITE_KEY','VITE_GOOGLE_CLIENT_ID','MATCHING_TOP_K','MATCHING_MIN_SCORE','CHATBOT_MIN_CONFIDENCE']);
export function sensitive(key, value = '') {
  if (!PUBLIC.has(key)) return true; // Unknown variables fail closed.
  try { const u = new URL(value); if (u.username || u.password || [...u.searchParams.keys()].some(k => /secret|token|key|pass|credential/i.test(k))) return true; } catch { /* Not a URL. */ }
  return false;
}
function decode(raw) {
  const q = raw[0];
  let value = raw;
  if (["'", '"', '`'].includes(q)) value = raw.slice(1, -1);
  return q === '"' ? value.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : value;
}
export function parseDocument(bytes) {
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new ToolError('ENV_ENCODING', 'ไฟล์ต้องเป็น UTF-8 ที่ถูกต้อง', 409); }
  demand(!text.includes('\0'), 'ENV_FORMAT', 'ไฟล์มีอักขระที่ไม่รองรับ', 409);
  const entries = new Map();
  let position = text.charCodeAt(0) === 0xFEFF ? 1 : 0;
  while (position < text.length) {
    const lineEnd = text.indexOf('\n', position) < 0 ? text.length : text.indexOf('\n', position);
    const line = text.slice(position, lineEnd).replace(/\r$/, '');
    if (/^\s*(?:#.*)?$/.test(line)) { position = lineEnd + 1; continue; }
    const head = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*/.exec(line);
    demand(head, 'ENV_FORMAT', 'รูปแบบ .env ไม่รองรับ; ไม่แก้ไฟล์นี้อัตโนมัติ', 409);
    const key = head[1], start = position + head[0].length;
    demand(!entries.has(key), 'ENV_DUPLICATE', `พบ Variable ซ้ำ: ${key}`, 409);
    const quote = text[start];
    let end, after;
    if (["'", '"', '`'].includes(quote)) {
      end = start + 1;
      while (end < text.length && (text[end] !== quote || text[end - 1] === '\\')) end++;
      demand(end < text.length, 'ENV_FORMAT', `Quote ไม่ครบ: ${key}`, 409);
      end++;
      after = text.indexOf('\n', end); if (after < 0) after = text.length;
      demand(/^[ \t\r]*(?:#.*)?$/.test(text.slice(end, after)), 'ENV_FORMAT', `รูปแบบค่าที่ไม่รองรับ: ${key}`, 409);
    } else {
      after = lineEnd;
      const hash = text.indexOf('#', start);
      end = hash >= start && hash < after ? hash : after;
      while (end > start && /[ \t\r]/.test(text[end - 1])) end--;
    }
    const raw = text.slice(start, end);
    entries.set(key, { key, start, end, raw, value: decode(raw).replace(/\r\n?/g, '\n') });
    position = after + 1;
  }
  return { text, entries };
}
function encode(value, service) {
  demand(typeof value === 'string' && value.length <= 8192 && !/[\0\r\n]/.test(value), 'ENV_VALUE', 'ค่าต้องเป็นข้อความบรรทัดเดียว ไม่เกิน 8192 ตัวอักษร');
  if (!value) return '';
  // Use a conservative subset shared by dotenv, Vite and python-dotenv.
  if (!/[\s#'"`\\]/.test(value)) return value;
  if (!value.includes("'") && !value.includes('\\')) return `'${value}'`;
  if (!value.includes('"') && !value.includes('\\')) return `"${value}"`;
  if (service !== 'nlp' && !value.includes('`') && !value.includes('\\')) return '`' + value + '`';
  demand(!/[#\r\n]/.test(value) && value === value.trim() && !/^["'`]/.test(value), 'ENV_QUOTING', 'ค่านี้ไม่สามารถรักษา Quoting ให้ตรงกับ Parser ของ Service ได้อย่างปลอดภัย');
  return value;
}
export function publicDocument(document) {
  return [...document.entries.values()].map(({ key, value }) => {
    const secret = sensitive(key, value);
    return { key, secret, configured: value.length > 0, ...(secret ? {} : { value }) };
  });
}
export function validate(document, service, changed) {
  const get = key => document.entries.get(key)?.value;
  for (const key of changed) {
    const value = get(key);
    if (['PORT','DB_PORT','SMTP_PORT'].includes(key)) demand(/^\d+$/.test(value) && +value >= 1 && +value <= 65535, 'ENV_PORT', `Port ไม่ถูกต้อง: ${key}`);
    if (key.endsWith('_ENABLED') || key === 'SMTP_SECURE') demand(['true','false'].includes(value), 'ENV_BOOLEAN', `ต้องเป็น true หรือ false: ${key}`);
    if (['FRONTEND_URL','VITE_API_URL','NLP_SERVICE_BASE_URL'].includes(key)) {
      let url; try { url = new URL(value); } catch { /* Reject below. */ }
      demand(url && ['http:','https:'].includes(url.protocol) && !url.username && !url.password && !url.hash && !url.search, 'ENV_URL', `HTTP(S) URL ไม่ถูกต้อง: ${key}`);
      if (key === 'FRONTEND_URL') demand(url.pathname === '/', 'ENV_ORIGIN', 'FRONTEND_URL ต้องเป็น Origin ไม่มี Path');
    }
    if (key === 'NODE_ENV' && service === 'backend') demand(value === 'development', 'DEVELOPMENT_ONLY', 'เครื่องมือนี้อนุญาตเฉพาะ NODE_ENV=development');
    if (['NLP_SERVICE_TIMEOUT_MS','NLP_OCR_TIMEOUT_MS','MATCHING_TOP_K'].includes(key)) demand(/^\d+$/.test(value) && +value > 0 && +value <= 2147483647, 'ENV_INTEGER', `ต้องเป็นจำนวนเต็มบวก: ${key}`);
    if (['MATCHING_MIN_SCORE','CHATBOT_MIN_CONFIDENCE'].includes(key)) demand(/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value), 'ENV_SCORE', `ต้องอยู่ระหว่าง 0 และ 1: ${key}`);
    if (key === 'JWT_EXPIRES_IN') demand(/^\d+(?:ms|s|m|h|d|w|y)?$/.test(value) && parseInt(value) > 0, 'ENV_DURATION', 'JWT_EXPIRES_IN ไม่ถูกต้อง');
    if (key.startsWith('GOOGLE_ALLOWED_')) demand(value.split(',').every(d => /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(d.trim())), 'ENV_DOMAIN', `Domain list ไม่ถูกต้อง: ${key}`);
    if (key === 'GOOGLE_HOSTED_DOMAIN_POLICY') demand(['required','email_only'].includes(value), 'ENV_GOOGLE_POLICY', 'Hosted Domain Policy ไม่ถูกต้อง');
    if (key === 'GOOGLE_CLIENT_ID' || key === 'VITE_GOOGLE_CLIENT_ID') demand(!value || /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(value), 'ENV_GOOGLE_CLIENT', 'Google Client ID ไม่ถูกต้อง');
    if (key.startsWith('VITE_') && sensitive(key, value) && value) throw new ToolError('FRONTEND_SECRET', 'ห้ามใส่ Secret ใน VITE_ เพราะอาจถูกเปิดเผยใน Client Bundle');
  }
  if (service === 'backend') {
    for (const key of ['NODE_ENV','PORT','DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET','FRONTEND_URL']) demand(get(key)?.trim(), 'ENV_REQUIRED', `Required Variable ว่างหรือไม่มี: ${key}`);
    if (get('GOOGLE_LOGIN_ENABLED') === 'true') {
      demand(/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(get('GOOGLE_CLIENT_ID') || '') && get('GOOGLE_ALLOWED_EMAIL_DOMAINS')?.trim(), 'ENV_GOOGLE_CONFIG', 'Google Login ต้องมี Client ID และ Domain Configuration');
      let url; try { url = new URL(get('FRONTEND_URL')); } catch { /* Reject below. */ }
      demand(url && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))), 'ENV_GOOGLE_CONFIG', 'Google Login ต้องใช้ HTTPS หรือ HTTP Loopback');
      if ((get('GOOGLE_HOSTED_DOMAIN_POLICY') || 'required') === 'required') demand(get('GOOGLE_ALLOWED_HOSTED_DOMAINS')?.trim(), 'ENV_GOOGLE_CONFIG', 'Google Login ต้องมี Hosted Domain Configuration');
    }
  }
}
export function editDocument(bytes, service, changes) {
  demand(Array.isArray(changes) && changes.length > 0 && changes.length <= 150, 'ENV_CHANGES', 'ต้องมีรายการแก้ไข 1–150 รายการ');
  const document = parseDocument(bytes), edits = [], preview = [], seen = new Set();
  for (const change of changes) {
    demand(change && typeof change === 'object' && Object.keys(change).every(k => ['key','value','clear','confirmClear'].includes(k)) && KEY.test(change.key || '') && !seen.has(change.key), 'ENV_CHANGES', 'รายการแก้ไขไม่ถูกต้องหรือซ้ำ');
    seen.add(change.key);
    const entry = document.entries.get(change.key);
    demand(entry, 'ENV_KEY', 'อนุญาตให้แก้เฉพาะ Variable ที่มีอยู่แล้ว');
    const secret = sensitive(entry.key, entry.value) || sensitive(entry.key, change.value);
    let value = change.value;
    if (change.clear === true) { demand(change.confirmClear === true && (!value || value === ''), 'SECRET_CLEAR_CONFIRM', 'ต้องยืนยันการล้างค่าโดยชัดเจน'); value = ''; }
    else if (secret && value === '') continue;
    const raw = encode(value, service);
    if (value === entry.value) continue;
    edits.push({ start: entry.start, end: entry.end, raw });
    preview.push({ key: entry.key, secret, action: value === '' ? 'clear' : 'change', ...(secret ? {} : { before: entry.value, after: value }) });
  }
  demand(edits.length, 'NO_CHANGES', 'ไม่มีค่าที่เปลี่ยนแปลง');
  let output = document.text;
  for (const edit of edits.sort((a,b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.raw + output.slice(edit.end);
  const updated = parseDocument(Buffer.from(output));
  validate(updated, service, preview.map(item => item.key));
  return { bytes: Buffer.from(output), preview, warnings: warnings(service, preview.map(item => item.key)) };
}
export function warnings(service, keys) {
  const result = [];
  if (keys.includes('PORT')) result.push('Port เปลี่ยน แต่ Docker Port Mapping และ URLs ของผู้เรียกยังคงเดิม อาจเข้า Service ไม่ได้');
  if (keys.some(k => /^DB_/.test(k))) result.push('Database credentials/target เปลี่ยน อาจเชื่อมต่อฐานข้อมูลไม่ได้; เครื่องมือจะไม่แก้ Database');
  if (keys.some(k => /^GOOGLE_/.test(k) || k === 'FRONTEND_URL')) result.push('Google OAuth / CORS อาจใช้งานไม่ได้ ต้องตรวจ Origin และ Provider Configuration');
  if (keys.some(k => /^JWT_/.test(k))) result.push('JWT / Authentication อาจได้รับผลกระทบ; JWT_SECRET ที่เปลี่ยนอาจทำให้ Session เดิมใช้ไม่ได้');
  if (keys.some(k => k.startsWith('NLP_'))) result.push('การเชื่อมต่อ NLP อาจได้รับผลกระทบ ต้องตรวจ URL/Timeout ของ Service ที่รันจริง');
  if (service === 'frontend') result.push('VITE_ เป็นข้อมูลสาธารณะใน Browser Bundle; ห้ามใส่ Secret');
  return result;
}
