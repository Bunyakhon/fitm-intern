export const categoryLabels = { orientation: 'ปฐมนิเทศ', training: 'อบรม', presentation: 'นำเสนอ', other: 'อื่น ๆ' };
export const statusLabels = { draft: 'ร่าง', published: 'เผยแพร่', canceled: 'ยกเลิก' };
export function bangkokLocal(value) { return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0,16); }
export function activityDate(value) { return new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }); }
export function monthRange(month) {
  const [year, number] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year,number,1)).toISOString().slice(0,7);
  return { from: `${month}-01T00:00+07:00`, to: `${next}-01T00:00+07:00` };
}
export function calendarDays(month, activities) {
  const [year, number] = month.split('-').map(Number), length = new Date(Date.UTC(year,number,0)).getUTCDate();
  return Array.from({ length }, (_,i) => { const date = `${month}-${String(i+1).padStart(2,'0')}`, from = new Date(`${date}T00:00+07:00`).getTime(), to = from + 86400000; return { date, day: i+1, activities: activities.filter(row => new Date(row.starts_at) < to && new Date(row.ends_at) > from) }; });
}
export function node(document, tag, value, className) { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; }
export function renderActivity(container, row) {
  const document = container.ownerDocument;
  container.append(node(document,'h3',row.title),node(document,'p',`${categoryLabels[row.category]} · ${statusLabels[row.status]}`),node(document,'p',`${activityDate(row.starts_at)} – ${activityDate(row.ends_at)}`),node(document,'p',row.description),node(document,'p',row.location || 'ไม่ได้ระบุสถานที่'));
  if (row.meeting_url) { const a = node(document,'a','เข้าร่วมประชุมออนไลน์'); const url = new URL(row.meeting_url); if (url.protocol === 'https:') { a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; container.append(a); } }
}
