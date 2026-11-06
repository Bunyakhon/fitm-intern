import { getCatalogPermissions, getStaffPrerequisiteCatalog, saveStaffPrerequisiteCourse } from '../api/coopPrerequisiteCatalog.api.js';
import { setButtonLoading, showConfirmModal, showToast } from '../ui/feedback.js';

const root = document.getElementById('staffPrerequisiteCatalog');
if (root) {
  const get = id => document.getElementById(id), form = get('staffCatalogForm'), list = get('staffCatalogCourses'), message = get('staffCatalogMessage');
  let programs = [], revision = null, courses = [], editing = null, busy = false;
  const say = (text, error = false) => { message.textContent = text; message.setAttribute('role', error ? 'alert' : 'status'); };
  function controls() {
    root.setAttribute('aria-busy', String(busy));
    get('staffCatalogProgram').disabled = busy || !programs.length;
    get('staffCatalogRefresh').disabled = busy;
    for (const control of form.querySelectorAll('input,select,button')) control.disabled = busy || !programs.length || !revision;
    // New courses use the revision of the program currently listed. Switch the
    // list first to create in another program; existing courses can still move.
    get('staffCatalogCourseProgram').disabled = busy || !programs.length || !revision || !editing;
    for (const control of list.querySelectorAll('button')) control.disabled = busy;
  }
  function options(select, selected) {
    select.replaceChildren();
    for (const program of programs) { const option = document.createElement('option'); option.value = program; option.textContent = program; select.append(option); }
    if (programs.includes(selected)) select.value = selected;
  }
  function resetForm() {
    editing = null; form.reset(); get('staffCatalogFormTitle').textContent = 'เพิ่มรายวิชา';
    get('staffCatalogCourseProgram').value = get('staffCatalogProgram').value;
    get('staffCatalogActive').checked = true;
    controls();
  }
  function edit(course) {
    if (busy) return;
    editing = course; get('staffCatalogFormTitle').textContent = 'แก้ไขรายวิชา';
    get('staffCatalogCourseProgram').value = course.program;
    get('staffCatalogCode').value = course.course_code; get('staffCatalogName').value = course.course_name;
    get('staffCatalogEnglishName').value = course.english_name || ''; get('staffCatalogOrder').value = course.display_order;
    get('staffCatalogActive').checked = course.is_active; controls(); get('staffCatalogCode').focus();
  }
  function render() {
    list.replaceChildren();
    if (!courses.length) { const empty = document.createElement('p'); empty.textContent = 'ยังไม่มีรายวิชาในสาขานี้'; list.append(empty); }
    for (const course of courses) {
      const card = document.createElement('article'); card.className = 'teacher-request-card';
      const title = document.createElement('h4'); title.textContent = `${course.course_code} ${course.course_name}`;
      const detail = document.createElement('p'); detail.textContent = `${course.program} · ${course.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} · ลำดับ ${course.display_order}${course.english_name ? ' · ' + course.english_name : ''}`;
      const editButton = document.createElement('button'); editButton.type = 'button'; editButton.className = 'teacher-button'; editButton.textContent = 'แก้ไข'; editButton.addEventListener('click', () => edit(course));
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'teacher-button'; toggle.textContent = course.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
      toggle.addEventListener('click', () => {
        if (busy) return;
        showConfirmModal({ title: toggle.textContent + 'รายวิชา', message: 'มีผลเฉพาะคำร้องใหม่ รายวิชาในคำร้องที่ยื่นแล้วจะคงเดิม', confirmLabel: toggle.textContent,
          onConfirm: () => mutate(course.id, { program: course.program, version: course.version, is_active: !course.is_active, expected_catalog_revision: revision }) });
      });
      card.append(title, detail, editButton, toggle); list.append(card);
    }
  }
  async function loadList() {
    const result = await getStaffPrerequisiteCatalog(get('staffCatalogProgram').value);
    if (!result?.success || !Array.isArray(result.data?.courses)) throw Error('ข้อมูล Catalog ไม่ถูกต้อง');
    courses = result.data.courses; revision = result.data.revision; form.hidden = false; render();
  }
  async function refresh(withPermissions = false) {
    if (busy) return;
    busy = true; revision = null; form.hidden = true; list.replaceChildren(); controls(); say('กำลังโหลด Catalog รายวิชา...');
    try {
      if (withPermissions) {
        const result = await getCatalogPermissions(); programs = result?.data?.programs || [];
        options(get('staffCatalogProgram'), get('staffCatalogProgram').value); options(get('staffCatalogCourseProgram'), get('staffCatalogProgram').value);
      }
      if (!programs.length) { list.replaceChildren(); form.hidden = true; revision = null; say('ไม่มีสิทธิ์ coop_prerequisite_catalog.manage ในสาขา IT / INE ที่ได้รับมอบหมาย'); return; }
      await loadList(); resetForm(); say('เลือกสาขาที่ได้รับมอบหมายด้านบนก่อนเพิ่มรายวิชา การแก้ Catalog ไม่เปลี่ยนคำร้องเดิม');
    } catch (error) {
      if ([401, 403].includes(error.status)) { programs = []; revision = null; list.replaceChildren(); form.hidden = true; }
      say(error.message || 'โหลดรายวิชาไม่สำเร็จ กรุณาลองอีกครั้ง', true);
    } finally { busy = false; controls(); }
  }
  async function mutate(id, body) {
    if (busy) return;
    busy = true; controls(); setButtonLoading(get('staffCatalogSave'), true, 'กำลังบันทึก...', 'บันทึกรายวิชา');
    try {
      await saveStaffPrerequisiteCourse(id, body);
      say('บันทึกรายวิชาแล้ว'); showToast('บันทึก Catalog รายวิชาแล้ว', 'success'); resetForm();
      try { await loadList(); } catch { revision = null; say('บันทึกแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณากดโหลดใหม่', true); }
    } catch (error) {
      if ([401, 403].includes(error.status)) { programs = []; revision = null; form.hidden = true; list.replaceChildren(); }
      say(error.message || 'บันทึกรายวิชาไม่สำเร็จ', true); showToast(error.message || 'บันทึกรายวิชาไม่สำเร็จ', 'error'); throw error;
    } finally { busy = false; setButtonLoading(get('staffCatalogSave'), false, '', 'บันทึกรายวิชา'); controls(); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !revision) return;
    const course_code = get('staffCatalogCode').value.trim(), course_name = get('staffCatalogName').value.trim(), display_order = Number(get('staffCatalogOrder').value);
    if (!/^[0-9]{9}$/.test(course_code) || !course_name || !Number.isInteger(display_order) || display_order < 0 || display_order > 10000) { say('กรุณาระบุรหัส 9 หลัก ชื่อรายวิชา และลำดับ 0–10000 ให้ถูกต้อง', true); return; }
    try { await mutate(editing?.id, { program: editing ? get('staffCatalogCourseProgram').value : get('staffCatalogProgram').value, course_code, course_name,
      english_name: get('staffCatalogEnglishName').value.trim() || null, display_order, is_active: get('staffCatalogActive').checked,
      expected_catalog_revision: revision, ...(editing ? { version: editing.version } : {}) }); } catch { /* Inline/Shared Toast retains the entered values. */ }
  });
  get('staffCatalogProgram').addEventListener('change', () => refresh());
  get('staffCatalogRefresh').addEventListener('click', () => refresh(true));
  get('staffCatalogNew').addEventListener('click', resetForm);
  refresh(true);
}
